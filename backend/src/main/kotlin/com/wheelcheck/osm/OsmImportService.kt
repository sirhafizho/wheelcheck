package com.wheelcheck.osm

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import com.wheelcheck.place.CreatePlaceRequest
import com.wheelcheck.place.PlaceService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URLEncoder

@Service
class OsmImportService(
    private val placeService: PlaceService,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(OsmImportService::class.java)
    private val restTemplate = RestTemplate()
    private val overpassUrl = "https://overpass-api.de/api/interpreter"

    /**
     * Import places from OpenStreetMap Overpass API for a given area.
     * Focuses on venues that are commonly rated for wheelchair accessibility.
     * Default: Kuala Lumpur area (bounding box).
     */
    fun importPlaces(
        south: Double = 3.05,
        west: Double = 101.60,
        north: Double = 3.25,
        east: Double = 101.80
    ): ImportResult {
        val bbox = "$south,$west,$north,$east"
        logger.info("Starting OSM import for bbox: $bbox")

        val query = buildOverpassQuery(bbox)
        val response = executeOverpassQuery(query)

        if (response == null) {
            logger.error("Failed to fetch data from Overpass API")
            return ImportResult(0, 0, "Failed to fetch data from Overpass API")
        }

        var imported = 0
        var skipped = 0

        response.elements.forEach { element ->
            try {
                val place = mapToCreatePlaceRequest(element)
                if (place != null) {
                    placeService.create(place)
                    imported++
                } else {
                    skipped++
                }
            } catch (e: Exception) {
                logger.warn("Skipping element ${element.id}: ${e.message}")
                skipped++
            }
        }

        logger.info("OSM import complete: $imported imported, $skipped skipped")
        return ImportResult(imported, skipped, "Success")
    }

    internal fun buildOverpassQuery(bbox: String): String {
        return """
            [out:json][timeout:60];
            (
              node["amenity"~"restaurant|cafe|hospital|clinic|pharmacy|bank|place_of_worship|library|cinema|theatre"]($bbox);
              node["shop"~"supermarket|mall|convenience|department_store"]($bbox);
              node["tourism"~"hotel|museum|attraction|information"]($bbox);
              node["leisure"~"park|sports_centre|swimming_pool"]($bbox);
              node["building"~"hospital|public|government"]($bbox);
              way["amenity"~"restaurant|cafe|hospital|clinic|pharmacy|bank|place_of_worship|library|cinema|theatre"]($bbox);
              way["shop"~"supermarket|mall|convenience|department_store"]($bbox);
              way["building"~"hospital|public|government"]($bbox);
            );
            out center tags;
        """.trimIndent()
    }

    private fun executeOverpassQuery(query: String): OverpassResponse? {
        return try {
            val encodedQuery = URLEncoder.encode(query, "UTF-8")
            val url = "$overpassUrl?data=$encodedQuery"
            val responseStr = restTemplate.getForObject(url, String::class.java)
            objectMapper.readValue(responseStr, OverpassResponse::class.java)
        } catch (e: Exception) {
            logger.error("Overpass API error: ${e.message}", e)
            null
        }
    }

    internal fun mapToCreatePlaceRequest(element: OverpassElement): CreatePlaceRequest? {
        val tags = element.tags ?: return null
        val name = tags["name"] ?: tags["name:en"] ?: return null

        val lat = element.lat ?: element.center?.lat ?: return null
        val lng = element.lon ?: element.center?.lon ?: return null

        val category = determineCategory(tags)
        val nameMs = tags["name:ms"] ?: tags["name:my"]
        val address = buildAddress(tags)

        return CreatePlaceRequest(
            name = name,
            nameMs = nameMs,
            latitude = lat,
            longitude = lng,
            address = address,
            category = category
        )
    }

    internal fun determineCategory(tags: Map<String, String>): Category {
        val amenity = tags["amenity"]
        val shop = tags["shop"]
        val tourism = tags["tourism"]
        val leisure = tags["leisure"]
        val building = tags["building"]
        val religion = tags["religion"]?.lowercase()

        return when {
            amenity == "restaurant" || amenity == "cafe" -> Category.RESTAURANT
            amenity == "hospital" -> Category.HOSPITAL
            amenity == "clinic" -> Category.CLINIC
            amenity == "place_of_worship" ->
                if (religion == "muslim" || religion == "islam") Category.MOSQUE
                else Category.PLACE_OF_WORSHIP
            amenity == "pharmacy" || amenity == "bank" -> Category.OTHER
            amenity == "library" || amenity == "cinema" || amenity == "theatre" -> Category.OTHER
            shop == "mall" || shop == "department_store" -> Category.MALL
            shop == "supermarket" || shop == "convenience" -> Category.OTHER
            tourism == "hotel" -> Category.HOTEL
            tourism == "museum" || tourism == "attraction" -> Category.OTHER
            leisure == "park" -> Category.PARK
            leisure == "sports_centre" || leisure == "swimming_pool" -> Category.OTHER
            building == "government" || building == "public" -> Category.GOVERNMENT
            building == "hospital" -> Category.HOSPITAL
            else -> Category.OTHER
        }
    }

    internal fun buildAddress(tags: Map<String, String>): String? {
        val parts = listOfNotNull(
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:postcode"],
            tags["addr:city"]
        )
        return if (parts.isNotEmpty()) parts.joinToString(", ") else null
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class OverpassResponse(
    val elements: List<OverpassElement> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class OverpassElement(
    val id: Long = 0,
    val type: String = "",
    val lat: Double? = null,
    val lon: Double? = null,
    val center: OverpassCenter? = null,
    val tags: Map<String, String>? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class OverpassCenter(
    val lat: Double = 0.0,
    val lon: Double = 0.0
)

data class ImportResult(
    val imported: Int,
    val skipped: Int,
    val message: String
)
