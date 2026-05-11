package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class OrsRoutingAdapterTest {

    private lateinit var adapter: OrsRoutingAdapter
    private val objectMapper = ObjectMapper()

    @BeforeEach
    fun setup() {
        adapter = OrsRoutingAdapter(
            objectMapper = objectMapper,
            apiKey = "test-api-key",
            baseUrl = "https://api.openrouteservice.org/v2"
        )
    }

    // ── isEnabled ──────────────────────────────────────────────────────────────

    @Test
    fun `isEnabled is true when API key is set`() {
        assertTrue(adapter.isEnabled)
    }

    @Test
    fun `isEnabled is false when API key is blank`() {
        val noKey = OrsRoutingAdapter(objectMapper, "", "https://api.openrouteservice.org/v2")
        assertFalse(noKey.isEnabled)
    }

    // ── request body building ──────────────────────────────────────────────────

    @Test
    fun `buildRequestBody uses default options correctly`() {
        val from = LatLng(3.1535, 101.7123)
        val to = LatLng(3.1600, 101.7200)
        val options = WheelchairRouteOptions()

        val body = invokeBuildRequestBody(from, to, options)
        val parsed = objectMapper.readTree(body)

        val coords = parsed.get("coordinates")
        assertEquals(2, coords.size())

        // Coordinates are [lng, lat]
        assertEquals(101.7123, coords[0][0].asDouble(), 0.0001)
        assertEquals(3.1535, coords[0][1].asDouble(), 0.0001)
        assertEquals(101.7200, coords[1][0].asDouble(), 0.0001)
        assertEquals(3.1600, coords[1][1].asDouble(), 0.0001)

        val restrictions = parsed.path("profile_params").path("restrictions")
        assertEquals(6, restrictions.path("maximum_incline").asInt())
        assertEquals(0.06, restrictions.path("maximum_sloped_kerb").asDouble(), 0.001)
        assertEquals("cobblestone:flattened", restrictions.path("surface_type").asText())
        assertEquals("good", restrictions.path("smoothness_type").asText())
    }

    @Test
    fun `buildRequestBody includes minimum_width when specified`() {
        val from = LatLng(3.15, 101.70)
        val to = LatLng(3.16, 101.71)
        val options = WheelchairRouteOptions(minimumWidthMeters = 1.2)

        val body = invokeBuildRequestBody(from, to, options)
        val parsed = objectMapper.readTree(body)

        val restrictions = parsed.path("profile_params").path("restrictions")
        assertEquals(1.2, restrictions.path("minimum_width").asDouble(), 0.01)
    }

    @Test
    fun `buildRequestBody omits minimum_width when null`() {
        val from = LatLng(3.15, 101.70)
        val to = LatLng(3.16, 101.71)
        val options = WheelchairRouteOptions(minimumWidthMeters = null)

        val body = invokeBuildRequestBody(from, to, options)
        val parsed = objectMapper.readTree(body)

        val restrictions = parsed.path("profile_params").path("restrictions")
        assertTrue(restrictions.path("minimum_width").isMissingNode)
    }

    @Test
    fun `buildRequestBody uses custom incline and kerb options`() {
        val from = LatLng(3.15, 101.70)
        val to = LatLng(3.16, 101.71)
        val options = WheelchairRouteOptions(
            maximumInclinePercent = 3,
            maximumSlopedKerbMeters = 0.03
        )

        val body = invokeBuildRequestBody(from, to, options)
        val parsed = objectMapper.readTree(body)

        val restrictions = parsed.path("profile_params").path("restrictions")
        assertEquals(3, restrictions.path("maximum_incline").asInt())
        assertEquals(0.03, restrictions.path("maximum_sloped_kerb").asDouble(), 0.001)
    }

    @Test
    fun `buildRequestBody includes extra_info fields`() {
        val body = invokeBuildRequestBody(LatLng(3.15, 101.70), LatLng(3.16, 101.71), WheelchairRouteOptions())
        val parsed = objectMapper.readTree(body)

        val extraInfo = parsed.get("extra_info")
        assertNotNull(extraInfo)
        val infoList = (0 until extraInfo.size()).map { extraInfo[it].asText() }
        assertTrue("surface" in infoList)
        assertTrue("steepness" in infoList)
    }

    // ── response parsing ───────────────────────────────────────────────────────

    @Test
    fun `parseRoute extracts distance duration and geometry`() {
        val json = """
            {
              "routes": [
                {
                  "summary": { "distance": 1234.5, "duration": 600.0 },
                  "geometry": "encodedPolylineString",
                  "warnings": []
                }
              ]
            }
        """.trimIndent()

        val route = invokeParseRoute(json)

        assertNotNull(route)
        assertEquals(1234.5, route!!.distanceMeters, 0.01)
        assertEquals(600.0, route.durationSeconds, 0.01)
        assertEquals("encodedPolylineString", route.geometry)
        assertTrue(route.warnings.isEmpty())
    }

    @Test
    fun `parseRoute extracts warnings`() {
        val json = """
            {
              "routes": [
                {
                  "summary": { "distance": 500.0, "duration": 300.0 },
                  "geometry": "geom",
                  "warnings": [
                    { "code": 3, "message": "Route may have restrictions" }
                  ]
                }
              ]
            }
        """.trimIndent()

        val route = invokeParseRoute(json)

        assertNotNull(route)
        assertEquals(1, route!!.warnings.size)
        assertEquals("Route may have restrictions", route.warnings[0])
    }

    @Test
    fun `parseRoute returns null when routes array is empty`() {
        val json = """{"routes": []}"""
        assertNull(invokeParseRoute(json))
    }

    @Test
    fun `parseRoute returns null when summary is missing`() {
        val json = """{"routes": [{"geometry": "geom"}]}"""
        assertNull(invokeParseRoute(json))
    }

    @Test
    fun `parseRoute returns null for malformed JSON`() {
        assertNull(invokeParseRoute("not-json"))
    }

    @Test
    fun `ORS response deserialization ignores unknown fields`() {
        val json = """
            {
              "routes": [
                {
                  "summary": { "distance": 200.0, "duration": 120.0 },
                  "geometry": "abc",
                  "bbox": [101.7, 3.15, 101.71, 3.16],
                  "segments": [],
                  "extras": {}
                }
              ],
              "metadata": { "attribution": "ORS" }
            }
        """.trimIndent()

        val response = objectMapper.readValue(json, OrsResponse::class.java)
        assertEquals(1, response.routes.size)
        assertEquals(200.0, response.routes[0].summary!!.distance, 0.01)
    }

    // ── WheelchairRouteOptions defaults ────────────────────────────────────────

    @Test
    fun `WheelchairRouteOptions has sensible defaults`() {
        val opts = WheelchairRouteOptions()
        assertEquals(6, opts.maximumInclinePercent)
        assertEquals(0.06, opts.maximumSlopedKerbMeters, 0.001)
        assertNull(opts.minimumWidthMeters)
        assertEquals("cobblestone:flattened", opts.surfaceType)
        assertEquals("good", opts.smoothnessType)
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun invokeBuildRequestBody(from: LatLng, to: LatLng, options: WheelchairRouteOptions): String {
        val method = OrsRoutingAdapter::class.java
            .getDeclaredMethod("buildRequestBody", LatLng::class.java, LatLng::class.java, WheelchairRouteOptions::class.java)
        method.isAccessible = true
        return method.invoke(adapter, from, to, options) as String
    }

    private fun invokeParseRoute(responseStr: String): WheelchairRoute? {
        val method = OrsRoutingAdapter::class.java
            .getDeclaredMethod("parseRoute", String::class.java)
        method.isAccessible = true
        return method.invoke(adapter, responseStr) as WheelchairRoute?
    }
}
