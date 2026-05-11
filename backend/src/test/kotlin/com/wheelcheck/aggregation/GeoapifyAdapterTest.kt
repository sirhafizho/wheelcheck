package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.test.util.ReflectionTestUtils

class GeoapifyAdapterTest {

    private lateinit var adapter: GeoapifyAdapter
    private val objectMapper = ObjectMapper()

    private val klBbox = BoundingBox(south = 3.05, west = 101.60, north = 3.25, east = 101.80)

    @BeforeEach
    fun setup() {
        adapter = GeoapifyAdapter(
            objectMapper = objectMapper,
            apiKey = "test-api-key",
            baseUrl = "https://api.geoapify.com/v2/places",
            limit = 500
        )
    }

    // ── isEnabled ──────────────────────────────────────────────────────────────

    @Test
    fun `isEnabled is true when API key is set`() {
        assertTrue(adapter.isEnabled)
    }

    @Test
    fun `isEnabled is false when API key is blank`() {
        val noKeyAdapter = GeoapifyAdapter(
            objectMapper = objectMapper,
            apiKey = "",
            baseUrl = "https://api.geoapify.com/v2/places",
            limit = 500
        )
        assertFalse(noKeyAdapter.isEnabled)
    }

    @Test
    fun `sourceType is GEOAPIFY`() {
        assertEquals(DataSourceType.GEOAPIFY, adapter.sourceType)
    }

    // ── response parsing ───────────────────────────────────────────────────────

    @Test
    fun `mapToExternalPlace maps restaurant correctly`() {
        val feature = geoapifyFeature(
            placeId = "abc123",
            name = "Nasi Lemak House",
            lat = 3.1500,
            lon = 101.7000,
            city = "Kuala Lumpur",
            categories = listOf("catering.restaurant")
        )

        val place = invokeMapToExternalPlace(feature)

        assertNotNull(place)
        assertEquals("geoapify:abc123", place!!.externalId)
        assertEquals("Nasi Lemak House", place.name)
        assertEquals(3.1500, place.latitude)
        assertEquals(101.7000, place.longitude)
        assertEquals("Kuala Lumpur", place.city)
        assertEquals(Category.RESTAURANT, place.category)
        assertEquals(DataSourceType.GEOAPIFY, place.sourceType)
    }

    @Test
    fun `mapToExternalPlace returns null when place_id is missing`() {
        val feature = geoapifyFeature(
            placeId = null,
            name = "Some Place",
            lat = 3.1500,
            lon = 101.7000
        )
        assertNull(invokeMapToExternalPlace(feature))
    }

    @Test
    fun `mapToExternalPlace returns null when name is blank`() {
        val feature = geoapifyFeature(
            placeId = "abc123",
            name = "",
            lat = 3.1500,
            lon = 101.7000
        )
        assertNull(invokeMapToExternalPlace(feature))
    }

    @Test
    fun `mapToExternalPlace returns null when lat is missing`() {
        val feature = GeoapifyFeature(
            properties = GeoapifyProperties(
                place_id = "abc",
                name = "Test",
                lat = null,
                lon = null
            ),
            geometry = null
        )
        assertNull(invokeMapToExternalPlace(feature))
    }

    @Test
    fun `mapToExternalPlace falls back to geometry coordinates when lat lon missing in properties`() {
        val feature = GeoapifyFeature(
            properties = GeoapifyProperties(
                place_id = "geo123",
                name = "Geom Place",
                lat = null,
                lon = null,
                city = "KL"
            ),
            geometry = GeoapifyGeometry(
                type = "Point",
                coordinates = listOf(101.7000, 3.1500) // [lng, lat]
            )
        )
        val place = invokeMapToExternalPlace(feature)

        assertNotNull(place)
        assertEquals(3.1500, place!!.latitude)
        assertEquals(101.7000, place.longitude)
    }

    // ── category mapping ───────────────────────────────────────────────────────

    @Test
    fun `determineCategory maps catering to RESTAURANT`() {
        assertEquals(Category.RESTAURANT, invokeDetermineCategory(listOf("catering.restaurant")))
        assertEquals(Category.RESTAURANT, invokeDetermineCategory(listOf("catering.cafe")))
    }

    @Test
    fun `determineCategory maps healthcare to HOSPITAL`() {
        assertEquals(Category.HOSPITAL, invokeDetermineCategory(listOf("healthcare.hospital")))
        assertEquals(Category.HOSPITAL, invokeDetermineCategory(listOf("healthcare.clinic")))
    }

    @Test
    fun `determineCategory maps religion to MOSQUE`() {
        assertEquals(Category.MOSQUE, invokeDetermineCategory(listOf("religion.place_of_worship")))
    }

    @Test
    fun `determineCategory maps shopping_mall to MALL`() {
        assertEquals(Category.MALL, invokeDetermineCategory(listOf("commercial.shopping_mall")))
    }

    @Test
    fun `determineCategory maps hotel to HOTEL`() {
        assertEquals(Category.HOTEL, invokeDetermineCategory(listOf("accommodation.hotel")))
    }

    @Test
    fun `determineCategory maps park to PARK`() {
        assertEquals(Category.PARK, invokeDetermineCategory(listOf("leisure.park")))
    }

    @Test
    fun `determineCategory maps public_transport to TRANSPORT`() {
        assertEquals(Category.TRANSPORT, invokeDetermineCategory(listOf("public_transport.train.station")))
    }

    @Test
    fun `determineCategory maps education to EDUCATION`() {
        assertEquals(Category.EDUCATION, invokeDetermineCategory(listOf("education.university")))
        assertEquals(Category.EDUCATION, invokeDetermineCategory(listOf("education.school")))
    }

    @Test
    fun `determineCategory maps government to GOVERNMENT`() {
        assertEquals(Category.GOVERNMENT, invokeDetermineCategory(listOf("office.government")))
    }

    @Test
    fun `determineCategory returns OTHER for unknown category`() {
        assertEquals(Category.OTHER, invokeDetermineCategory(listOf("unknown.thing")))
        assertEquals(Category.OTHER, invokeDetermineCategory(emptyList()))
    }

    // ── address building ───────────────────────���───────────────────────────────

    @Test
    fun `buildAddress joins address parts`() {
        val props = GeoapifyProperties(
            place_id = "x",
            name = "Test",
            housenumber = "42",
            street = "Jalan Bukit Bintang",
            postcode = "55100",
            city = "Kuala Lumpur"
        )
        val address = invokeBuildAddress(props)
        assertEquals("42, Jalan Bukit Bintang, 55100, Kuala Lumpur", address)
    }

    @Test
    fun `buildAddress falls back to formatted when parts are missing`() {
        val props = GeoapifyProperties(
            place_id = "x",
            name = "Test",
            formatted = "Pavilion KL, Bukit Bintang, KL"
        )
        val address = invokeBuildAddress(props)
        assertEquals("Pavilion KL, Bukit Bintang, KL", address)
    }

    @Test
    fun `buildAddress returns fallback when nothing available`() {
        val props = GeoapifyProperties(place_id = "x", name = "Test")
        val address = invokeBuildAddress(props)
        assertEquals("Address not available", address)
    }

    // ── rawTags ────────────────────────────────────────────────────────────────

    @Test
    fun `rawTags include source and geoapify_id`() {
        val feature = geoapifyFeature(
            placeId = "abc123",
            name = "Test Place",
            lat = 3.15,
            lon = 101.70,
            categories = listOf("catering.restaurant")
        )
        val place = invokeMapToExternalPlace(feature)

        assertNotNull(place)
        assertEquals("geoapify", place!!.rawTags["source"])
        assertEquals("abc123", place.rawTags["geoapify_id"])
        assertEquals("catering.restaurant", place.rawTags["geoapify_category"])
    }

    // ── JSON deserialization ───────────────────────────────────────────────────

    @Test
    fun `deserializes Geoapify API response correctly`() {
        val json = """
            {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "geometry": { "type": "Point", "coordinates": [101.7123, 3.1535] },
                  "properties": {
                    "place_id": "place_xyz",
                    "name": "Pavilion Kuala Lumpur",
                    "lat": 3.1535,
                    "lon": 101.7123,
                    "city": "Kuala Lumpur",
                    "categories": ["commercial.shopping_mall"],
                    "formatted": "Pavilion KL, Bukit Bintang"
                  }
                }
              ]
            }
        """.trimIndent()

        val response = objectMapper.readValue(json, GeoapifyResponse::class.java)

        assertEquals(1, response.features.size)
        val props = response.features[0].properties!!
        assertEquals("place_xyz", props.place_id)
        assertEquals("Pavilion Kuala Lumpur", props.name)
        assertEquals(3.1535, props.lat)
        assertEquals("Kuala Lumpur", props.city)
        assertEquals(listOf("commercial.shopping_mall"), props.categories)
    }

    @Test
    fun `deserializes response with unknown fields without error`() {
        val json = """
            {
              "type": "FeatureCollection",
              "features": [],
              "query": { "text": "KL", "parsed": {} }
            }
        """.trimIndent()

        val response = objectMapper.readValue(json, GeoapifyResponse::class.java)
        assertTrue(response.features.isEmpty())
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun geoapifyFeature(
        placeId: String?,
        name: String?,
        lat: Double,
        lon: Double,
        city: String? = null,
        categories: List<String>? = null,
        formatted: String? = null
    ) = GeoapifyFeature(
        type = "Feature",
        geometry = GeoapifyGeometry("Point", listOf(lon, lat)),
        properties = GeoapifyProperties(
            place_id = placeId,
            name = name,
            lat = lat,
            lon = lon,
            city = city,
            categories = categories,
            formatted = formatted
        )
    )

    @Suppress("UNCHECKED_CAST")
    private fun invokeMapToExternalPlace(feature: GeoapifyFeature): ExternalPlace? {
        val method = GeoapifyAdapter::class.java
            .getDeclaredMethod("mapToExternalPlace", GeoapifyFeature::class.java)
        method.isAccessible = true
        return method.invoke(adapter, feature) as ExternalPlace?
    }

    @Suppress("UNCHECKED_CAST")
    private fun invokeDetermineCategory(categories: List<String>): Category {
        val method = GeoapifyAdapter::class.java
            .getDeclaredMethod("determineCategory", List::class.java)
        method.isAccessible = true
        return method.invoke(adapter, categories) as Category
    }

    private fun invokeBuildAddress(props: GeoapifyProperties): String {
        val method = GeoapifyAdapter::class.java
            .getDeclaredMethod("buildAddress", GeoapifyProperties::class.java)
        method.isAccessible = true
        return method.invoke(adapter, props) as String
    }
}
