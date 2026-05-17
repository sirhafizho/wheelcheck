package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestTemplate

@Component
@ConditionalOnProperty(name = ["wheelcheck.adapters.wikidata.enabled"], havingValue = "true")
class WikidataAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.wikidata.endpoint:https://query.wikidata.org/sparql}")
    private val endpoint: String,
    @Value("\${wheelcheck.adapters.wikidata.enabled:false}")
    private val enabled: Boolean
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(WikidataAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.WIKIDATA
    override val isEnabled get() = enabled

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        val query = buildQuery(bbox)
        logger.info("Wikidata: fetching places for bbox ${bbox.toOverpassString()}")

        val bindings = executeQuery(query) ?: return emptyList()
        val places = bindings
            .groupBy { it.itemId }
            .values
            .mapNotNull { mapToExternalPlace(it) }

        logger.info("Wikidata: fetched ${bindings.size} bindings, mapped ${places.size} places")
        return places
    }

    internal fun buildQuery(bbox: BoundingBox): String = """
        SELECT ?item ?itemLabel ?coord ?access ?accessLabel ?instance ?instanceLabel WHERE {
          SERVICE wikibase:box {
            ?item wdt:P625 ?coord .
            bd:serviceParam wikibase:cornerSouthWest "Point(${bbox.west} ${bbox.south})"^^geo:wktLiteral .
            bd:serviceParam wikibase:cornerNorthEast "Point(${bbox.east} ${bbox.north})"^^geo:wktLiteral .
          }
          ?item wdt:P17 wd:Q833 .
          OPTIONAL { ?item wdt:P2846 ?access . }
          OPTIONAL { ?item wdt:P31 ?instance . }
          FILTER(
            BOUND(?access) ||
            EXISTS {
              ?item wdt:P31/wdt:P279* ?amenityClass .
              VALUES ?amenityClass {
                wd:Q16917
                wd:Q32815
                wd:Q55488
                wd:Q3914
                wd:Q3918
                wd:Q7075
                wd:Q11707
                wd:Q180174
                wd:Q27686
                wd:Q22698
              }
            }
          )
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ms". }
        }
        LIMIT 5000
    """.trimIndent()

    private fun executeQuery(query: String): List<WikidataBinding>? {
        return try {
            val headers = HttpHeaders()
            headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
            headers.accept = listOf(MediaType.parseMediaType("application/sparql-results+json"))
            headers.set(HttpHeaders.USER_AGENT, "WheelCheck/1.0 (accessibility aggregation service)")

            val body = LinkedMultiValueMap<String, String>()
            body.add("query", query)

            val request = HttpEntity(body, headers)
            val responseStr = restTemplate.postForObject(endpoint, request, String::class.java) ?: return emptyList()
            parseBindings(responseStr)
        } catch (e: Exception) {
            logger.error("Wikidata API error: ${e.message}", e)
            null
        }
    }

    private fun parseBindings(responseStr: String): List<WikidataBinding> {
        val root = objectMapper.readTree(responseStr)
        return root.path("results").path("bindings").mapNotNull { binding ->
            val itemUri = binding.value("item") ?: return@mapNotNull null
            val coord = parseCoordinate(binding.value("coord") ?: return@mapNotNull null) ?: return@mapNotNull null

            WikidataBinding(
                itemId = itemUri.substringAfterLast('/'),
                name = binding.value("itemLabel")?.ifBlank { null } ?: itemUri.substringAfterLast('/'),
                latitude = coord.first,
                longitude = coord.second,
                accessLabel = binding.value("accessLabel"),
                instanceId = binding.value("instance")?.substringAfterLast('/'),
                instanceLabel = binding.value("instanceLabel")
            )
        }
    }

    private fun mapToExternalPlace(bindings: List<WikidataBinding>): ExternalPlace? {
        val first = bindings.firstOrNull() ?: return null
        val accessLabels = bindings.mapNotNull { it.accessLabel }.toSet()
        val instanceIds = bindings.mapNotNull { it.instanceId }.toSet()
        val instanceLabels = bindings.mapNotNull { it.instanceLabel }.toSet()
        val wheelchairAccess = determineWheelchairAccess(accessLabels)
        val rawTags = buildRawTags(first.itemId, accessLabels, instanceLabels, wheelchairAccess)

        return ExternalPlace(
            externalId = "wikidata:${first.itemId}",
            sourceType = DataSourceType.WIKIDATA,
            name = first.name,
            latitude = first.latitude,
            longitude = first.longitude,
            address = null,
            city = MalaysiaGeoUtils.city(first.latitude, first.longitude),
            state = MalaysiaGeoUtils.state(first.latitude, first.longitude),
            category = determineCategory(instanceIds, instanceLabels, first.name),
            wheelchairAccess = wheelchairAccess,
            description = accessLabels.firstOrNull(),
            rawTags = rawTags
        )
    }

    private fun buildRawTags(
        itemId: String,
        accessLabels: Set<String>,
        instanceLabels: Set<String>,
        wheelchairAccess: WheelchairAccess
    ): Map<String, String> {
        val tags = linkedMapOf(
            "source" to "wikidata",
            "wikidata" to itemId
        )

        accessLabels.firstOrNull()?.let { tags["wikidata:accessibility"] = it }
        instanceLabels.firstOrNull()?.let { tags["wikidata:instance"] = it }
        when (wheelchairAccess) {
            WheelchairAccess.YES -> tags["wheelchair"] = "yes"
            WheelchairAccess.LIMITED -> tags["wheelchair"] = "limited"
            WheelchairAccess.NO -> tags["wheelchair"] = "no"
            WheelchairAccess.UNKNOWN -> Unit
        }
        return tags
    }

    private fun determineWheelchairAccess(accessLabels: Set<String>): WheelchairAccess {
        val normalized = accessLabels.map { it.lowercase() }
        return when {
            normalized.any { it.contains("not wheelchair accessible") || it.contains("not accessible") || it.contains("inaccessible") } -> WheelchairAccess.NO
            normalized.any { it.contains("partial") || it.contains("limited") } -> WheelchairAccess.LIMITED
            normalized.any { it.contains("wheelchair accessible") || it.contains("accessible") } -> WheelchairAccess.YES
            else -> WheelchairAccess.UNKNOWN
        }
    }

    private fun determineCategory(instanceIds: Set<String>, instanceLabels: Set<String>, name: String): Category {
        instanceIds.firstNotNullOfOrNull { INSTANCE_CATEGORY_MAP[it] }?.let { return it }

        val searchableText = buildString {
            append(name.lowercase())
            if (instanceLabels.isNotEmpty()) {
                append(' ')
                append(instanceLabels.joinToString(" ") { it.lowercase() })
            }
        }

        return when {
            "restaurant" in searchableText || "cafe" in searchableText || "food court" in searchableText -> Category.RESTAURANT
            "hospital" in searchableText || "clinic" in searchableText || "medical center" in searchableText -> Category.HOSPITAL
            "mosque" in searchableText || "masjid" in searchableText || "surau" in searchableText || "place of worship" in searchableText -> Category.MOSQUE
            "mall" in searchableText || "shopping centre" in searchableText || "shopping center" in searchableText -> Category.MALL
            "shop" in searchableText || "store" in searchableText || "market" in searchableText || "kedai" in searchableText -> Category.SHOP
            "hotel" in searchableText || "resort" in searchableText -> Category.HOTEL
            "park" in searchableText || "garden" in searchableText -> Category.PARK
            "government" in searchableText || "ministry" in searchableText || "city hall" in searchableText || "court" in searchableText -> Category.GOVERNMENT
            "station" in searchableText || "terminal" in searchableText || "airport" in searchableText || "stop" in searchableText -> Category.TRANSPORT
            "school" in searchableText || "university" in searchableText || "college" in searchableText || "library" in searchableText -> Category.EDUCATION
            else -> Category.OTHER
        }
    }

    private fun parseCoordinate(value: String): Pair<Double, Double>? {
        val match = POINT_REGEX.matchEntire(value.trim()) ?: return null
        val longitude = match.groupValues[1].toDoubleOrNull() ?: return null
        val latitude = match.groupValues[2].toDoubleOrNull() ?: return null
        return latitude to longitude
    }

    private fun JsonNode.value(field: String): String? =
        path(field).path("value").takeUnless { it.isMissingNode || it.isNull }?.asText()?.takeIf { it.isNotBlank() }

    private data class WikidataBinding(
        val itemId: String,
        val name: String,
        val latitude: Double,
        val longitude: Double,
        val accessLabel: String?,
        val instanceId: String?,
        val instanceLabel: String?
    )

    companion object {
        private val POINT_REGEX = Regex("""Point\(([-+0-9.Ee]+) ([-+0-9.Ee]+)\)""")

        private val INSTANCE_CATEGORY_MAP = mapOf(
            "Q11707" to Category.RESTAURANT,
            "Q16917" to Category.HOSPITAL,
            "Q32815" to Category.MOSQUE,
            "Q55488" to Category.TRANSPORT,
            "Q180174" to Category.MALL,
            "Q27686" to Category.HOTEL,
            "Q22698" to Category.PARK,
            "Q3914" to Category.EDUCATION,
            "Q3918" to Category.EDUCATION,
            "Q7075" to Category.EDUCATION
        )
    }
}
