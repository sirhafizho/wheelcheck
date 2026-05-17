package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import com.wheelcheck.osm.OverpassElement
import com.wheelcheck.osm.OverpassResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestTemplate

/**
 * Adapter for OpenStreetMap Overpass API.
 * Primary free source — ~16,876 wheelchair-tagged objects in Malaysia.
 * Queries both wheelchair-tagged and untagged amenities for discovery.
 */
@Component
class OsmOverpassAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.osm.overpass-url:https://overpass-api.de/api/interpreter}")
    private val overpassUrl: String,
    @Value("\${wheelcheck.adapters.osm.enabled:true}")
    private val enabled: Boolean
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(OsmOverpassAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.OSM
    override val isEnabled get() = enabled

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        val query = buildQuery(bbox)
        logger.info("OSM Overpass: fetching places for bbox ${bbox.toOverpassString()}")

        val response = executeQuery(query) ?: return emptyList()
        val places = response.elements.mapNotNull { mapToExternalPlace(it) }
        logger.info("OSM Overpass: fetched ${response.elements.size} elements, mapped ${places.size} places")
        return places
    }

    internal fun buildQuery(bbox: BoundingBox): String {
        val b = bbox.toOverpassString()
        return """
            [out:json][timeout:120];
            (
              node["wheelchair"]($b);
              way["wheelchair"]($b);
              node["tactile_paving"="yes"]($b);
              way["tactile_paving"="yes"]($b);
              node["kerb"~"lowered|flush"]($b);
              node["ramp:wheelchair"="yes"]($b);
              node["highway"="elevator"]($b);
              node["lift"="yes"]($b);
              node["surface"]["name"]($b);
              node["kerb:tactile_paving"]($b);
              node["entrance:wheelchair"]($b);
              node["amenity"~"restaurant|cafe|fast_food|ice_cream|bar|hospital|clinic|pharmacy|bank|place_of_worship|library|cinema|theatre|school|college|university"]["name"]($b);
              node["shop"]["name"]($b);
              node["tourism"~"hotel|museum|attraction"]["name"]($b);
              node["leisure"~"park|sports_centre|swimming_pool"]["name"]($b);
              node["building"~"hospital|public|government|commercial|retail"]["name"]($b);
              node["railway"~"station|halt"]["name"]($b);
              node["public_transport"="station"]["name"]($b);
              way["amenity"~"restaurant|cafe|fast_food|ice_cream|bar|hospital|clinic|pharmacy|bank|place_of_worship|library|cinema|theatre|school|college|university"]["name"]($b);
              way["shop"]["name"]($b);
              way["building"~"hospital|public|government|commercial|retail"]["name"]($b);
              way["railway"~"station|halt"]["name"]($b);
            );
            out center tags;
        """.trimIndent()
    }

    private fun executeQuery(query: String): OverpassResponse? {
        return try {
            val headers = HttpHeaders()
            headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
            headers.set(HttpHeaders.USER_AGENT, "WheelCheck/1.0 (wheelchair-accessibility; open-source)")
            val body = LinkedMultiValueMap<String, String>()
            body.add("data", query)
            val request = HttpEntity(body, headers)
            val responseStr = restTemplate.postForObject(overpassUrl, request, String::class.java)
            objectMapper.readValue(responseStr, OverpassResponse::class.java)
        } catch (e: Exception) {
            logger.error("Overpass API error: ${e.message}", e)
            null
        }
    }

    internal fun mapToExternalPlace(element: OverpassElement): ExternalPlace? {
        val tags = element.tags ?: return null
        val name = tags["name"] ?: tags["name:en"] ?: return null
        val lat = element.lat ?: element.center?.lat ?: return null
        val lng = element.lon ?: element.center?.lon ?: return null

        return ExternalPlace(
            externalId = "osm:${element.type}:${element.id}",
            sourceType = DataSourceType.OSM,
            name = name,
            nameMs = tags["name:ms"] ?: tags["name:my"],
            latitude = lat,
            longitude = lng,
            address = buildAddress(tags),
            city = tags["addr:city"] ?: MalaysiaGeoUtils.city(lat, lng),
            category = determineCategory(tags),
            wheelchairAccess = parseWheelchairTag(tags["wheelchair"]),
            hasAccessibleToilet = tags["toilets:wheelchair"]?.let { it == "yes" }
                ?: tags["toilet:wheelchair"]?.let { it == "yes" },
            hasTactilePaving = tags["tactile_paving"]?.let { it == "yes" },
            description = tags["wheelchair:description"] ?: tags["wheelchair:description:en"],
            osmSurface = tags["surface"],
            osmIncline = tags["incline"],
            osmEntranceWheelchair = tags["entrance:wheelchair"] ?: tags["wheelchair:entrance"],
            osmKerbTactile = tags["kerb:tactile_paving"]?.let { it == "yes" }
                ?: tags["tactile_paving"]?.let { it == "yes" },
            rawTags = tags + buildEnhancedTags(tags)
        )
    }

    private fun parseWheelchairTag(value: String?): WheelchairAccess = when (value) {
        "yes", "designated" -> WheelchairAccess.YES
        "limited" -> WheelchairAccess.LIMITED
        "no" -> WheelchairAccess.NO
        else -> WheelchairAccess.UNKNOWN
    }

    internal fun determineCategory(tags: Map<String, String>): Category {
        val amenity = tags["amenity"]
        val shop = tags["shop"]
        val tourism = tags["tourism"]
        val leisure = tags["leisure"]
        val building = tags["building"]
        val railway = tags["railway"]
        val publicTransport = tags["public_transport"]

        return when {
            amenity == "restaurant" -> Category.RESTAURANT
            amenity == "cafe" || amenity == "ice_cream" -> Category.CAFE
            amenity == "fast_food" || amenity == "bar" -> Category.RESTAURANT
            amenity == "hospital" || amenity == "clinic" -> Category.HOSPITAL
            amenity == "place_of_worship" -> Category.MOSQUE
            amenity == "pharmacy" || amenity == "bank" -> Category.SHOP
            amenity == "library" || amenity == "cinema" || amenity == "theatre" -> Category.OTHER
            amenity in listOf("school", "college", "university") -> Category.EDUCATION
            shop == "mall" || shop == "department_store" -> Category.MALL
            shop == "supermarket" || shop == "convenience" -> Category.SHOP
            shop != null -> Category.SHOP
            tourism == "hotel" -> Category.HOTEL
            tourism == "museum" || tourism == "attraction" -> Category.OTHER
            leisure == "park" -> Category.PARK
            leisure == "sports_centre" || leisure == "swimming_pool" -> Category.OTHER
            building == "government" || building == "public" -> Category.GOVERNMENT
            building == "hospital" -> Category.HOSPITAL
            building in listOf("commercial", "retail") -> Category.SHOP
            railway == "station" || railway == "halt" -> Category.TRANSPORT
            publicTransport == "station" -> Category.TRANSPORT
            else -> Category.OTHER
        }
    }

    private fun buildAddress(tags: Map<String, String>): String {
        val parts = listOfNotNull(
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:postcode"],
            tags["addr:city"]
        )
        return if (parts.isNotEmpty()) parts.joinToString(", ") else "Address not available"
    }

    private fun buildEnhancedTags(tags: Map<String, String>): Map<String, String> {
        val enhanced = mutableMapOf<String, String>()
        tags["kerb"]?.let { enhanced["_kerb"] = it }
        tags["ramp:wheelchair"]?.let { enhanced["_ramp_wheelchair"] = it }
        tags["handrail"]?.let { enhanced["_handrail"] = it }
        tags["incline"]?.let { enhanced["_incline"] = it }
        tags["surface"]?.let { enhanced["_surface"] = it }
        tags["smoothness"]?.let { enhanced["_smoothness"] = it }
        tags["door"]?.let { enhanced["_door"] = it }
        tags["lift"]?.let { enhanced["_lift"] = it }
        tags["highway"]?.takeIf { it == "elevator" }?.let { enhanced["_elevator"] = "yes" }
        tags["entrance:wheelchair"]?.let { enhanced["_entrance_wheelchair"] = it }
        return enhanced
    }
}
