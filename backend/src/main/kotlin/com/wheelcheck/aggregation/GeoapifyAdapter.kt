package com.wheelcheck.aggregation

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

/**
 * Adapter for Geoapify Places API.
 * Provides global POI data with wheelchair accessibility filters.
 * Free tier: 3,000 credits/day (1 credit per request + 1 per 20 places beyond 20).
 *
 * Enable by setting:
 *   wheelcheck.adapters.geoapify.enabled=true
 *   wheelcheck.adapters.geoapify.api-key=YOUR_KEY
 *
 * API docs: https://apidocs.geoapify.com/docs/places/
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.geoapify.enabled", havingValue = "true", matchIfMissing = false)
class GeoapifyAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.geoapify.api-key:}")
    private val apiKey: String,
    @Value("\${wheelcheck.adapters.geoapify.base-url:https://api.geoapify.com/v2/places}")
    private val baseUrl: String,
    @Value("\${wheelcheck.adapters.geoapify.limit:500}")
    private val limit: Int
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(GeoapifyAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.GEOAPIFY
    override val isEnabled get() = apiKey.isNotBlank()

    // Categories to query — broad coverage of public/accessible places
    private val targetCategories = listOf(
        "catering.restaurant",
        "catering.cafe",
        "healthcare.hospital",
        "healthcare.clinic",
        "healthcare.pharmacy",
        "public_transport.train.station",
        "public_transport.bus.stop",
        "public_transport.light_rail",
        "public_transport.subway",
        "education.university",
        "education.school",
        "education.library",
        "accommodation.hotel",
        "commercial.shopping_mall",
        "commercial.supermarket",
        "leisure.park",
        "office.government",
        "religion.place_of_worship",
        "tourism.attraction"
    )

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        if (apiKey.isBlank()) {
            logger.warn("Geoapify adapter disabled: no API key configured")
            return emptyList()
        }

        // bbox format for Geoapify: rect:west,south,east,north
        val filter = "rect:${bbox.west},${bbox.south},${bbox.east},${bbox.north}"
        val categories = targetCategories.joinToString(",")

        val allPlaces = mutableListOf<ExternalPlace>()

        // Query wheelchair-accessible places
        fetchWithCondition(filter, categories, "wheelchair.yes")
            .forEach { allPlaces.add(it.copy(wheelchairAccess = WheelchairAccess.YES)) }

        // Query partially accessible places (avoid duplicates by externalId)
        val existingIds = allPlaces.map { it.externalId }.toSet()
        fetchWithCondition(filter, categories, "wheelchair.limited")
            .filter { it.externalId !in existingIds }
            .forEach { allPlaces.add(it.copy(wheelchairAccess = WheelchairAccess.LIMITED)) }

        logger.info("Geoapify: ${allPlaces.size} accessible places in bbox")
        return allPlaces
    }

    private fun fetchWithCondition(
        filter: String,
        categories: String,
        condition: String
    ): List<ExternalPlace> {
        val url = "$baseUrl?categories=$categories" +
            "&filter=$filter" +
            "&conditions=$condition" +
            "&limit=$limit" +
            "&apiKey=$apiKey"

        return try {
            val responseStr = restTemplate.getForObject(url, String::class.java)
                ?: return emptyList()
            val response = objectMapper.readValue(responseStr, GeoapifyResponse::class.java)
            response.features.mapNotNull { mapToExternalPlace(it) }
        } catch (e: Exception) {
            logger.error("Geoapify API error (condition=$condition): ${e.message}", e)
            emptyList()
        }
    }

    private fun mapToExternalPlace(feature: GeoapifyFeature): ExternalPlace? {
        val props = feature.properties ?: return null
        val placeId = props.place_id ?: return null
        val name = props.name?.takeIf { it.isNotBlank() } ?: return null
        val lat = props.lat ?: feature.geometry?.coordinates?.getOrNull(1) ?: return null
        val lng = props.lon ?: feature.geometry?.coordinates?.getOrNull(0) ?: return null

        return ExternalPlace(
            externalId = "geoapify:$placeId",
            sourceType = DataSourceType.GEOAPIFY,
            name = name,
            latitude = lat,
            longitude = lng,
            address = buildAddress(props),
            city = props.city ?: props.county ?: "Malaysia",
            category = determineCategory(props.categories ?: emptyList()),
            wheelchairAccess = WheelchairAccess.UNKNOWN, // overridden by caller
            rawTags = buildRawTags(props)
        )
    }

    private fun buildAddress(props: GeoapifyProperties): String {
        val parts = listOfNotNull(
            props.housenumber,
            props.street,
            props.postcode,
            props.city
        )
        return if (parts.isNotEmpty()) parts.joinToString(", ") else props.formatted ?: "Address not available"
    }

    private fun buildRawTags(props: GeoapifyProperties): Map<String, String> {
        val tags = mutableMapOf("source" to "geoapify")
        props.place_id?.let { tags["geoapify_id"] = it }
        props.categories?.firstOrNull()?.let { tags["geoapify_category"] = it }
        props.formatted?.let { tags["formatted_address"] = it }
        return tags
    }

    private fun determineCategory(categories: List<String>): Category {
        val joined = categories.joinToString(" ").lowercase()
        return when {
            "catering" in joined -> Category.RESTAURANT
            "hospital" in joined || "clinic" in joined || "healthcare" in joined -> Category.HOSPITAL
            "worship" in joined || "religion" in joined -> Category.MOSQUE
            "shopping_mall" in joined || "mall" in joined -> Category.MALL
            "hotel" in joined || "accommodation" in joined -> Category.HOTEL
            "park" in joined || "leisure" in joined -> Category.PARK
            "government" in joined || "office" in joined -> Category.GOVERNMENT
            "public_transport" in joined || "transport" in joined -> Category.TRANSPORT
            "education" in joined || "university" in joined || "school" in joined -> Category.EDUCATION
            else -> Category.OTHER
        }
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class GeoapifyResponse(
    val type: String = "",
    val features: List<GeoapifyFeature> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class GeoapifyFeature(
    val type: String = "",
    val geometry: GeoapifyGeometry? = null,
    val properties: GeoapifyProperties? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class GeoapifyGeometry(
    val type: String = "",
    val coordinates: List<Double> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class GeoapifyProperties(
    val place_id: String? = null,
    val name: String? = null,
    val lat: Double? = null,
    val lon: Double? = null,
    val formatted: String? = null,
    val housenumber: String? = null,
    val street: String? = null,
    val postcode: String? = null,
    val city: String? = null,
    val county: String? = null,
    val country: String? = null,
    val categories: List<String>? = null,
    val datasource: GeoapifyDatasource? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class GeoapifyDatasource(
    val sourcename: String? = null,
    val attribution: String? = null,
    val url: String? = null
)
