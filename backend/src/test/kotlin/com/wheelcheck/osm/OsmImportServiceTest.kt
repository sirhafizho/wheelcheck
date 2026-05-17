package com.wheelcheck.osm

import com.wheelcheck.common.Category
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class OsmImportServiceTest {

    private lateinit var osmImportService: OsmImportService

    @BeforeEach
    fun setup() {
        // We test internal methods that don't need the full Spring context
        osmImportService = OsmImportService(
            placeService = io.mockk.mockk(),
            objectMapper = com.fasterxml.jackson.databind.ObjectMapper()
        )
    }

    @Test
    fun `determineCategory maps restaurant amenity correctly`() {
        val tags = mapOf("amenity" to "restaurant")
        assertEquals(Category.RESTAURANT, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps cafe to RESTAURANT`() {
        val tags = mapOf("amenity" to "cafe")
        assertEquals(Category.RESTAURANT, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps hospital amenity correctly`() {
        val tags = mapOf("amenity" to "hospital")
        assertEquals(Category.HOSPITAL, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps clinic to HOSPITAL`() {
        val tags = mapOf("amenity" to "clinic")
        assertEquals(Category.HOSPITAL, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps mall shop correctly`() {
        val tags = mapOf("shop" to "mall")
        assertEquals(Category.MALL, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps hotel tourism correctly`() {
        val tags = mapOf("tourism" to "hotel")
        assertEquals(Category.HOTEL, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps park leisure correctly`() {
        val tags = mapOf("leisure" to "park")
        assertEquals(Category.PARK, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps place_of_worship to MOSQUE`() {
        val tags = mapOf("amenity" to "place_of_worship")
        assertEquals(Category.MOSQUE, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory maps government building correctly`() {
        val tags = mapOf("building" to "government")
        assertEquals(Category.GOVERNMENT, osmImportService.determineCategory(tags))
    }

    @Test
    fun `determineCategory returns OTHER for unknown tags`() {
        val tags = mapOf("something" to "else")
        assertEquals(Category.OTHER, osmImportService.determineCategory(tags))
    }

    @Test
    fun `buildAddress joins address parts with comma`() {
        val tags = mapOf(
            "addr:housenumber" to "42",
            "addr:street" to "Jalan Bukit Bintang",
            "addr:postcode" to "55100",
            "addr:city" to "Kuala Lumpur"
        )
        val address = osmImportService.buildAddress(tags)
        assertEquals("42, Jalan Bukit Bintang, 55100, Kuala Lumpur", address)
    }

    @Test
    fun `buildAddress returns null when no address tags`() {
        val tags = mapOf("name" to "Some Place")
        val address = osmImportService.buildAddress(tags)
        assertNull(address)
    }

    @Test
    fun `buildAddress handles partial address`() {
        val tags = mapOf("addr:street" to "Jalan Sultan")
        val address = osmImportService.buildAddress(tags)
        assertEquals("Jalan Sultan", address)
    }

    @Test
    fun `mapToCreatePlaceRequest returns null when no name tag`() {
        val element = OverpassElement(
            id = 1,
            type = "node",
            lat = 3.15,
            lon = 101.70,
            tags = mapOf("amenity" to "restaurant")
        )
        assertNull(osmImportService.mapToCreatePlaceRequest(element))
    }

    @Test
    fun `mapToCreatePlaceRequest returns null when no tags`() {
        val element = OverpassElement(
            id = 1,
            type = "node",
            lat = 3.15,
            lon = 101.70,
            tags = null
        )
        assertNull(osmImportService.mapToCreatePlaceRequest(element))
    }

    @Test
    fun `mapToCreatePlaceRequest maps node with name correctly`() {
        val element = OverpassElement(
            id = 123,
            type = "node",
            lat = 3.1535,
            lon = 101.7123,
            tags = mapOf(
                "name" to "Pavilion KL",
                "name:ms" to "Pavilion Kuala Lumpur",
                "shop" to "mall",
                "addr:street" to "Jalan Bukit Bintang",
                "addr:city" to "Kuala Lumpur"
            )
        )

        val result = osmImportService.mapToCreatePlaceRequest(element)

        assertNotNull(result)
        assertEquals("Pavilion KL", result!!.name)
        assertEquals("Pavilion Kuala Lumpur", result.nameMs)
        assertEquals(3.1535, result.latitude)
        assertEquals(101.7123, result.longitude)
        assertEquals(Category.MALL, result.category)
        assertEquals("Kuala Lumpur", result.city)
    }

    @Test
    fun `mapToCreatePlaceRequest uses center for ways`() {
        val element = OverpassElement(
            id = 456,
            type = "way",
            lat = null,
            lon = null,
            center = OverpassCenter(lat = 3.16, lon = 101.71),
            tags = mapOf(
                "name" to "Hospital KL",
                "amenity" to "hospital"
            )
        )

        val result = osmImportService.mapToCreatePlaceRequest(element)

        assertNotNull(result)
        assertEquals("Hospital KL", result!!.name)
        assertEquals(3.16, result.latitude)
        assertEquals(101.71, result.longitude)
        assertEquals(Category.HOSPITAL, result.category)
    }

    @Test
    fun `mapToCreatePlaceRequest uses name_en fallback`() {
        val element = OverpassElement(
            id = 789,
            type = "node",
            lat = 3.15,
            lon = 101.70,
            tags = mapOf(
                "name:en" to "KLCC Park",
                "leisure" to "park"
            )
        )

        val result = osmImportService.mapToCreatePlaceRequest(element)

        assertNotNull(result)
        assertEquals("KLCC Park", result!!.name)
        assertEquals(Category.PARK, result.category)
    }

    @Test
    fun `buildOverpassQuery contains bbox`() {
        val query = osmImportService.buildOverpassQuery("3.05,101.60,3.25,101.80")
        assertTrue(query.contains("3.05,101.60,3.25,101.80"))
        assertTrue(query.contains("[out:json]"))
        assertTrue(query.contains("restaurant"))
        assertTrue(query.contains("hospital"))
    }
}
