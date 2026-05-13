package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.Arguments
import org.junit.jupiter.params.provider.MethodSource
import java.util.stream.Stream

/**
 * Live smoke tests — these hit the REAL APIs (Overpass, data.gov.my).
 *
 * Run with:
 *   ./gradlew test --tests "*LiveAdapterSmokeTest" -Djunit.jupiter.tags.include=live
 *
 * They are excluded from normal CI via the @Tag("live") annotation.
 * Each test verifies that at least 1 place is returned for a given state.
 */
@Tag("live")
class LiveAdapterSmokeTest {

    private val objectMapper = ObjectMapper()

    private val osmAdapter = OsmOverpassAdapter(
        objectMapper = objectMapper,
        overpassUrl = "https://overpass-api.de/api/interpreter",
        enabled = true
    )

    private val dataGovAdapter = DataGovMyFacilitiesAdapter(
        objectMapper = objectMapper
    )

    companion object {
        @JvmStatic
        fun stateSmokeBboxes(): Stream<Arguments> = Stream.of(
            // State, city-level bbox (tight to reduce API load)
            Arguments.of("Kuala Lumpur",
                BoundingBox(south = 3.10, west = 101.65, north = 3.20, east = 101.75)),
            Arguments.of("Selangor (Petaling Jaya)",
                BoundingBox(south = 3.05, west = 101.58, north = 3.15, east = 101.68)),
            Arguments.of("Johor Bahru",
                BoundingBox(south = 1.44, west = 103.68, north = 1.54, east = 103.78)),
            Arguments.of("Kuantan (Pahang)",
                BoundingBox(south = 3.78, west = 103.28, north = 3.88, east = 103.38)),
            Arguments.of("Kuala Terengganu",
                BoundingBox(south = 5.30, west = 103.10, north = 5.40, east = 103.20)),
            Arguments.of("Kota Bharu (Kelantan)",
                BoundingBox(south = 6.08, west = 102.22, north = 6.18, east = 102.32)),
            Arguments.of("Georgetown (Penang)",
                BoundingBox(south = 5.38, west = 100.28, north = 5.47, east = 100.40)),
            Arguments.of("Ipoh (Perak)",
                BoundingBox(south = 4.57, west = 101.05, north = 4.67, east = 101.15)),
            Arguments.of("Alor Setar (Kedah)",
                BoundingBox(south = 6.11, west = 100.35, north = 6.21, east = 100.45)),
            Arguments.of("Seremban (Negeri Sembilan)",
                BoundingBox(south = 2.70, west = 101.90, north = 2.80, east = 102.00)),
            Arguments.of("Melaka",
                BoundingBox(south = 2.18, west = 102.20, north = 2.28, east = 102.30)),
            Arguments.of("Kangar (Perlis)",
                BoundingBox(south = 6.43, west = 100.17, north = 6.53, east = 100.27)),
            Arguments.of("Kota Kinabalu (Sabah)",
                BoundingBox(south = 5.96, west = 116.06, north = 6.08, east = 116.16)),
            Arguments.of("Kuching (Sarawak)",
                BoundingBox(south = 1.53, west = 110.32, north = 1.63, east = 110.42)),
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OSM Overpass — at least 1 place per state
    // ─────────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "OSM: {0}")
    @MethodSource("stateSmokeBboxes")
    fun `OSM Overpass returns at least 1 place for each state`(label: String, bbox: BoundingBox) {
        val places = osmAdapter.fetchPlaces(bbox)

        assertTrue(places.isNotEmpty()) {
            "OSM Overpass returned 0 places for $label (bbox=$bbox). " +
            "This state may have very sparse OSM data or the query timed out."
        }

        // Verify all returned places have valid coordinates near the bbox
        // (Overpass way centers can be slightly outside the query bbox)
        val tolerance = 0.01
        for (place in places) {
            assertTrue(place.latitude in (bbox.south - tolerance)..(bbox.north + tolerance)) {
                "${place.name}: lat ${place.latitude} too far outside bbox [${bbox.south}, ${bbox.north}]"
            }
            assertTrue(place.longitude in (bbox.west - tolerance)..(bbox.east + tolerance)) {
                "${place.name}: lng ${place.longitude} too far outside bbox [${bbox.west}, ${bbox.east}]"
            }
        }

        println("  ✓ OSM [$label]: ${places.size} places found")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // data.gov.my — at least 1 hospital/clinic per state
    // ─────────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "data.gov.my: {0}")
    @MethodSource("stateSmokeBboxes")
    fun `data_gov_my returns at least 1 facility for each state`(label: String, bbox: BoundingBox) {
        val places = dataGovAdapter.fetchPlaces(bbox)

        assertTrue(places.isNotEmpty()) {
            "data.gov.my returned 0 facilities for $label (bbox=$bbox). " +
            "Check if the dataset still has records with valid coordinates for this region."
        }

        // Verify all returned places are hospitals/clinics
        for (place in places) {
            assertEquals(DataSourceType.DATA_GOV_MY, place.sourceType)
        }

        println("  ✓ data.gov.my [$label]: ${places.size} facilities found")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OSM: wheelchair-tagged places specifically
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `OSM returns wheelchair-tagged places in KL`() {
        val klBbox = BoundingBox(south = 3.10, west = 101.65, north = 3.20, east = 101.75)
        val places = osmAdapter.fetchPlaces(klBbox)

        val wheelchairTagged = places.filter { it.wheelchairAccess != WheelchairAccess.UNKNOWN }

        assertTrue(wheelchairTagged.isNotEmpty()) {
            "Expected at least some wheelchair-tagged OSM places in KL. " +
            "Total places: ${places.size}, wheelchair-tagged: ${wheelchairTagged.size}"
        }

        println("  ✓ KL wheelchair-tagged: ${wheelchairTagged.size}/${places.size} places")
    }

    @Test
    fun `OSM returns wheelchair-tagged places in Georgetown Penang`() {
        val penangBbox = BoundingBox(south = 5.38, west = 100.28, north = 5.47, east = 100.40)
        val places = osmAdapter.fetchPlaces(penangBbox)

        val wheelchairTagged = places.filter { it.wheelchairAccess != WheelchairAccess.UNKNOWN }

        assertTrue(wheelchairTagged.isNotEmpty()) {
            "Expected at least some wheelchair-tagged OSM places in Georgetown. " +
            "Total places: ${places.size}, wheelchair-tagged: ${wheelchairTagged.size}"
        }

        println("  ✓ Georgetown wheelchair-tagged: ${wheelchairTagged.size}/${places.size} places")
    }

    @Test
    fun `OSM returns wheelchair-tagged places in Johor Bahru`() {
        val jbBbox = BoundingBox(south = 1.44, west = 103.68, north = 1.54, east = 103.78)
        val places = osmAdapter.fetchPlaces(jbBbox)

        val wheelchairTagged = places.filter { it.wheelchairAccess != WheelchairAccess.UNKNOWN }

        assertTrue(wheelchairTagged.isNotEmpty()) {
            "Expected at least some wheelchair-tagged OSM places in JB. " +
            "Total places: ${places.size}, wheelchair-tagged: ${wheelchairTagged.size}"
        }

        println("  ✓ JB wheelchair-tagged: ${wheelchairTagged.size}/${places.size} places")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cross-adapter: KL should return places from BOTH OSM and data.gov.my
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `KL bbox returns places from both OSM and data_gov_my adapters`() {
        val klBbox = BoundingBox(south = 3.05, west = 101.60, north = 3.25, east = 101.80)

        val osmPlaces = osmAdapter.fetchPlaces(klBbox)
        val govPlaces = dataGovAdapter.fetchPlaces(klBbox)

        assertTrue(osmPlaces.isNotEmpty()) { "OSM returned 0 places for full KL bbox" }
        assertTrue(govPlaces.isNotEmpty()) { "data.gov.my returned 0 places for full KL bbox" }

        println("  ✓ KL cross-adapter: OSM=${osmPlaces.size}, data.gov.my=${govPlaces.size}")
    }

    @Test
    fun `Kota Kinabalu Sabah returns places from both OSM and data_gov_my`() {
        val kkBbox = BoundingBox(south = 5.90, west = 116.00, north = 6.10, east = 116.20)

        val osmPlaces = osmAdapter.fetchPlaces(kkBbox)
        val govPlaces = dataGovAdapter.fetchPlaces(kkBbox)

        assertTrue(osmPlaces.isNotEmpty()) { "OSM returned 0 places for KK bbox" }
        assertTrue(govPlaces.isNotEmpty()) { "data.gov.my returned 0 places for KK bbox" }

        println("  ✓ KK cross-adapter: OSM=${osmPlaces.size}, data.gov.my=${govPlaces.size}")
    }

    @Test
    fun `Kuching Sarawak returns places from both OSM and data_gov_my`() {
        val kchBbox = BoundingBox(south = 1.50, west = 110.30, north = 1.65, east = 110.45)

        val osmPlaces = osmAdapter.fetchPlaces(kchBbox)
        val govPlaces = dataGovAdapter.fetchPlaces(kchBbox)

        assertTrue(osmPlaces.isNotEmpty()) { "OSM returned 0 places for Kuching bbox" }
        assertTrue(govPlaces.isNotEmpty()) { "data.gov.my returned 0 places for Kuching bbox" }

        println("  ✓ Kuching cross-adapter: OSM=${osmPlaces.size}, data.gov.my=${govPlaces.size}")
    }
}
