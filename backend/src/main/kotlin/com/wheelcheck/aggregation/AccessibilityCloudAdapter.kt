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
 * Adapter for accessibility.cloud API (by Sozialhelden/Wheelmap).
 * Free for non-commercial/open-source projects.
 * Aggregates OSM + partner data with rich accessibility attributes.
 *
 * Enable by setting:
 *   wheelcheck.adapters.accessibility-cloud.enabled=true
 *   wheelcheck.adapters.accessibility-cloud.app-token=YOUR_TOKEN
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.accessibility-cloud.enabled", havingValue = "true", matchIfMissing = false)
class AccessibilityCloudAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.accessibility-cloud.app-token:}")
    private val appToken: String,
    @Value("\${wheelcheck.adapters.accessibility-cloud.base-url:https://accessibility-cloud-v2.freetls.fastly.net}")
    private val baseUrl: String
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(AccessibilityCloudAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.ACCESSIBILITY_CLOUD
    override val isEnabled get() = appToken.isNotBlank()

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        if (appToken.isBlank()) {
            logger.warn("accessibility.cloud adapter disabled: no app token configured")
            return emptyList()
        }

        val centerLat = (bbox.south + bbox.north) / 2
        val centerLng = (bbox.west + bbox.east) / 2
        val radiusMeters = calculateRadius(bbox).coerceAtMost(10000)

        val url = "$baseUrl/place-infos.json" +
            "?appToken=$appToken" +
            "&latitude=$centerLat" +
            "&longitude=$centerLng" +
            "&accuracy=$radiusMeters" +
            "&limit=1000" +
            "&includeRelated=source"

        logger.info("accessibility.cloud: fetching places around ($centerLat, $centerLng) r=${radiusMeters}m")

        return try {
            val responseStr = restTemplate.getForObject(url, String::class.java)
            val response = objectMapper.readValue(responseStr, A11yCloudResponse::class.java)
            val places = response.features.mapNotNull { mapToExternalPlace(it) }
            logger.info("accessibility.cloud: fetched ${response.features.size} features, mapped ${places.size} places")
            places
        } catch (e: Exception) {
            logger.error("accessibility.cloud API error: ${e.message}", e)
            emptyList()
        }
    }

    private fun mapToExternalPlace(feature: A11yCloudFeature): ExternalPlace? {
        val props = feature.properties ?: return null
        val coords = feature.geometry?.coordinates ?: return null
        if (coords.size < 2) return null
        val name = props.name ?: props.originalId ?: return null

        val wheelchairAccess = when (props.accessibility?.accessibleWith?.wheelchair) {
            true -> WheelchairAccess.YES
            false -> WheelchairAccess.NO
            null -> when (props.accessibility?.partiallyAccessibleWith?.wheelchair) {
                true -> WheelchairAccess.LIMITED
                else -> WheelchairAccess.UNKNOWN
            }
        }

        return ExternalPlace(
            externalId = "a11y:${feature.id ?: props.originalId ?: return null}",
            sourceType = DataSourceType.ACCESSIBILITY_CLOUD,
            name = name,
            latitude = coords[1],
            longitude = coords[0],
            address = props.address?.full ?: "Address not available",
            city = props.address?.city ?: MalaysiaGeoUtils.city(coords[1], coords[0]),
            state = MalaysiaGeoUtils.state(coords[1], coords[0]),
            category = determineCategory(props.category ?: ""),
            wheelchairAccess = wheelchairAccess,
            hasAccessibleToilet = props.accessibility?.restrooms?.isAccessibleWithWheelchair,
            description = props.accessibility?.description
        )
    }

    private fun determineCategory(category: String): Category {
        val lower = category.lowercase()
        return when {
            "restaurant" in lower || "cafe" in lower || "food" in lower -> Category.RESTAURANT
            "hospital" in lower || "clinic" in lower || "health" in lower -> Category.HOSPITAL
            "mosque" in lower || "worship" in lower || "church" in lower -> Category.MOSQUE
            "mall" in lower || "shop" in lower || "store" in lower -> Category.MALL
            "hotel" in lower || "accommodation" in lower -> Category.HOTEL
            "park" in lower || "garden" in lower -> Category.PARK
            "government" in lower || "office" in lower -> Category.GOVERNMENT
            "station" in lower || "transit" in lower || "transport" in lower -> Category.TRANSPORT
            "school" in lower || "university" in lower -> Category.EDUCATION
            else -> Category.OTHER
        }
    }

    private fun calculateRadius(bbox: BoundingBox): Int {
        val latDiff = bbox.north - bbox.south
        val lngDiff = bbox.east - bbox.west
        val avgDiff = (latDiff + lngDiff) / 2
        return (avgDiff * 111_000).toInt() // ~111km per degree
    }
}

// Response models for accessibility.cloud GeoJSON
@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yCloudResponse(
    val type: String = "",
    val features: List<A11yCloudFeature> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yCloudFeature(
    val id: String? = null,
    val type: String = "",
    val geometry: A11yGeometry? = null,
    val properties: A11yProperties? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yGeometry(
    val type: String = "",
    val coordinates: List<Double> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yProperties(
    val name: String? = null,
    val originalId: String? = null,
    val category: String? = null,
    val address: A11yAddress? = null,
    val accessibility: A11yAccessibility? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yAddress(
    val full: String? = null,
    val city: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yAccessibility(
    val accessibleWith: A11yAccessibleWith? = null,
    val partiallyAccessibleWith: A11yAccessibleWith? = null,
    val restrooms: A11yRestrooms? = null,
    val description: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yAccessibleWith(
    val wheelchair: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class A11yRestrooms(
    val isAccessibleWithWheelchair: Boolean? = null
)
