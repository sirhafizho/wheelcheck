package com.wheelcheck.aggregation

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

/**
 * Adapter for OpenRouteService wheelchair routing.
 * Provides wheelchair-specific routes respecting kerb height, incline, surface type.
 * Free tier: ~2,000 directions/day with API key registration.
 *
 * Enable by setting:
 *   wheelcheck.adapters.ors.enabled=true
 *   wheelcheck.adapters.ors.api-key=YOUR_KEY
 *
 * API docs: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/post
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.ors.enabled", havingValue = "true", matchIfMissing = false)
class OrsRoutingAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.ors.api-key:}")
    private val apiKey: String,
    @Value("\${wheelcheck.adapters.ors.base-url:https://api.openrouteservice.org/v2}")
    private val baseUrl: String
) : WheelchairRoutingAdapter {

    private val logger = LoggerFactory.getLogger(OrsRoutingAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val isEnabled get() = apiKey.isNotBlank()

    override fun getRoute(
        from: LatLng,
        to: LatLng,
        options: WheelchairRouteOptions
    ): WheelchairRoute? {
        if (apiKey.isBlank()) {
            logger.warn("ORS routing adapter disabled: no API key configured")
            return null
        }

        val url = "$baseUrl/directions/wheelchair/json"
        val requestBody = buildRequestBody(from, to, options)

        return try {
            val headers = HttpHeaders().apply {
                contentType = MediaType.APPLICATION_JSON
                set("Authorization", apiKey)
            }
            val entity = HttpEntity(requestBody, headers)
            val responseStr = restTemplate.postForObject(url, entity, String::class.java)
                ?: return null

            parseRoute(responseStr)
        } catch (e: Exception) {
            logger.error("ORS routing error: ${e.message}", e)
            null
        }
    }

    private fun buildRequestBody(
        from: LatLng,
        to: LatLng,
        options: WheelchairRouteOptions
    ): String {
        val restrictions = mutableMapOf(
            "maximum_incline" to options.maximumInclinePercent,
            "maximum_sloped_kerb" to options.maximumSlopedKerbMeters,
            "surface_type" to options.surfaceType,
            "smoothness_type" to options.smoothnessType
        )
        options.minimumWidthMeters?.let { restrictions["minimum_width"] = it }

        val body = mapOf(
            "coordinates" to listOf(
                listOf(from.lng, from.lat),
                listOf(to.lng, to.lat)
            ),
            "profile_params" to mapOf(
                "restrictions" to restrictions
            ),
            "extra_info" to listOf("surface", "steepness", "waycategory"),
            "instructions" to false
        )

        return objectMapper.writeValueAsString(body)
    }

    private fun parseRoute(responseStr: String): WheelchairRoute? {
        return try {
            val response = objectMapper.readValue(responseStr, OrsResponse::class.java)
            val route = response.routes.firstOrNull() ?: return null
            val summary = route.summary ?: return null

            WheelchairRoute(
                distanceMeters = summary.distance,
                durationSeconds = summary.duration,
                geometry = route.geometry ?: "",
                warnings = route.warnings?.map { it.message ?: "" }?.filter { it.isNotBlank() }
                    ?: emptyList()
            )
        } catch (e: Exception) {
            logger.error("ORS route parse error: ${e.message}", e)
            null
        }
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class OrsResponse(
    val routes: List<OrsRoute> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class OrsRoute(
    val summary: OrsRouteSummary? = null,
    val geometry: String? = null,
    val warnings: List<OrsWarning>? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class OrsRouteSummary(
    val distance: Double = 0.0,
    val duration: Double = 0.0
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class OrsWarning(
    val code: Int? = null,
    val message: String? = null
)
