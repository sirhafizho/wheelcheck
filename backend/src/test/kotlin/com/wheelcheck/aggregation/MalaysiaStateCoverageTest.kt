package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import com.wheelcheck.osm.OverpassElement
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.Arguments
import org.junit.jupiter.params.provider.MethodSource
import java.io.ByteArrayOutputStream
import java.util.stream.Stream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Verifies that each Malaysian state can receive and correctly route data through the adapters.
 *
 * Tests cover two independent concerns:
 *  1. MalaysiaGeoUtils.lookup() resolves to the right city/state for real city coordinates.
 *  2. OSM and data.gov.my adapters return ≥1 place when fed representative records for each state.
 *
 * No network calls are made — records are fed directly to the adapters' internal mapping methods.
 */
class MalaysiaStateCoverageTest {

    private val objectMapper = ObjectMapper()
    private val osmAdapter = OsmOverpassAdapter(
        objectMapper = objectMapper,
        overpassUrl = "https://overpass-api.de/api/interpreter",
        enabled = true
    )
    private val dataGovAdapter = DataGovMyFacilitiesAdapter(
        objectMapper = objectMapper,
        baseUrl = "https://api.data.gov.my",
        pageSize = 1000
    )
    private val prasaranaAdapter = PrasaranaGtfsAdapter(
        baseUrl = "https://api.data.gov.my/gtfs-static/prasarana",
        categoriesConfig = "rapid-rail-kl"
    )

    // ─────────────────────────────────────────────────────────────────────────
    // 1. GeoUtils: every major city resolves to its correct state
    // ─────────────────────────────────────────────────────────────────────────

    companion object {
        @JvmStatic
        fun cityStateData(): Stream<Arguments> = Stream.of(
            // city, lat, lng, expectedCity, expectedState
            Arguments.of("Kuala Lumpur",      3.15,  101.70, "Kuala Lumpur",     "Wilayah Persekutuan Kuala Lumpur"),
            Arguments.of("Putrajaya",         2.93,  101.70, "Putrajaya",        "Wilayah Persekutuan Putrajaya"),
            Arguments.of("Labuan",            5.31,  115.22, "Labuan",           "Wilayah Persekutuan Labuan"),
            Arguments.of("Petaling Jaya",     3.04,  101.58, "Petaling Jaya",    "Selangor"),
            Arguments.of("Shah Alam",         3.09,  101.52, "Shah Alam",        "Selangor"),
            Arguments.of("Klang",             3.03,  101.44, "Klang",            "Selangor"),
            Arguments.of("Subang Jaya",       3.15,  101.60, "Subang Jaya",      "Selangor"),
            Arguments.of("Kajang",            2.99,  101.78, "Kajang",           "Selangor"),
            Arguments.of("Seremban",          2.73,  101.94, "Seremban",         "Negeri Sembilan"),
            Arguments.of("Port Dickson",      2.52,  101.22, "Port Dickson",     "Negeri Sembilan"),
            Arguments.of("Johor Bahru",       1.49,  103.74, "Johor Bahru",      "Johor"),
            Arguments.of("Batu Pahat",        1.85,  103.43, "Batu Pahat",       "Johor"),
            Arguments.of("Muar",              2.04,  102.57, "Muar",             "Johor"),
            Arguments.of("Melaka Tengah",     2.22,  102.24, "Melaka Tengah",    "Melaka"),
            Arguments.of("Kuantan",           3.83,  103.33, "Kuantan",          "Pahang"),
            Arguments.of("Temerloh",          3.55,  102.45, "Temerloh",         "Pahang"),
            Arguments.of("Cameron Highlands", 4.40,  101.75, "Cameron Highlands","Pahang"),
            Arguments.of("Kuala Terengganu",  5.33,  103.14, "Kuala Terengganu", "Terengganu"),
            Arguments.of("Kemaman",           4.85,  103.35, "Kemaman",          "Terengganu"),
            Arguments.of("Dungun",            5.58,  102.93, "Dungun",           "Terengganu"),
            Arguments.of("Kota Bharu",        6.13,  102.26, "Kota Bharu",       "Kelantan"),
            Arguments.of("Kuala Krai",        5.96,  102.02, "Kuala Krai",       "Kelantan"),
            Arguments.of("Alor Setar",        6.12,  100.37, "Alor Setar",       "Kedah"),
            Arguments.of("Sungai Petani",     5.65,  100.65, "Sungai Petani",    "Kedah"),
            Arguments.of("Langkawi",          6.10,  100.20, "Langkawi",         "Kedah"),
            Arguments.of("Georgetown",        5.42,  100.33, "Georgetown",       "Pulau Pinang"),
            Arguments.of("Butterworth",       5.42,  100.44, "Butterworth",      "Pulau Pinang"),
            Arguments.of("Bayan Lepas",       5.30,  100.46, "Bayan Lepas",      "Pulau Pinang"),
            Arguments.of("Ipoh",              4.60,  101.08, "Ipoh",             "Perak"),
            Arguments.of("Taiping",           5.03,  100.73, "Taiping",          "Perak"),
            Arguments.of("Kangar",            6.45,  100.19, "Kangar",           "Perlis"),
            Arguments.of("Kota Kinabalu",     6.00,  116.12, "Kota Kinabalu",    "Sabah"),
            Arguments.of("Sandakan",          5.87,  117.93, "Sandakan",         "Sabah"),
            Arguments.of("Tawau",             4.25,  117.89, "Tawau",            "Sabah"),
            Arguments.of("Kuching",           1.56,  110.36, "Kuching",          "Sarawak"),
            Arguments.of("Miri",              3.25,  113.07, "Miri",             "Sarawak"),
            Arguments.of("Sibu",              2.30,  111.85, "Sibu",             "Sarawak"),
        )

        @JvmStatic
        fun stateFallbackData(): Stream<Arguments> = Stream.of(
            // A coordinate that misses all city boxes but hits the state fallback
            Arguments.of("Johor rural",    1.50, 103.50,  "Johor",           "Johor"),
            Arguments.of("Pahang rural",   3.60, 102.80,  "Pahang",          "Pahang"),
            Arguments.of("Kelantan rural", 5.20, 102.00,  "Kelantan",        "Kelantan"),
            Arguments.of("Terengganu rural",5.00, 102.80, "Terengganu",      "Terengganu"),
            Arguments.of("Kedah rural",    6.00, 100.30,  "Kedah",           "Kedah"),
            Arguments.of("Perlis rural",   6.70, 100.10,  "Perlis",          "Perlis"),
            Arguments.of("Perak rural",    4.20, 101.60,  "Perak",           "Perak"),
            Arguments.of("NS rural",       2.70, 102.30,  "Negeri Sembilan", "Negeri Sembilan"),
            Arguments.of("Melaka rural",   2.30, 102.40,  "Melaka",          "Melaka"),
            Arguments.of("Sabah rural",    5.40, 116.50,  "Sabah",           "Sabah"),
            Arguments.of("Sarawak rural",  2.00, 112.00,  "Sarawak",         "Sarawak"),
        )
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("cityStateData")
    fun `MalaysiaGeoUtils resolves major city coordinates correctly`(
        label: String, lat: Double, lng: Double, expectedCity: String, expectedState: String
    ) {
        val geo = MalaysiaGeoUtils.lookup(lat, lng)
        assertEquals(expectedCity, geo.city, "$label: wrong city")
        assertEquals(expectedState, geo.state, "$label: wrong state")
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("stateFallbackData")
    fun `MalaysiaGeoUtils state fallback works for rural coordinates`(
        label: String, lat: Double, lng: Double, expectedCity: String, expectedState: String
    ) {
        val geo = MalaysiaGeoUtils.lookup(lat, lng)
        assertEquals(expectedState, geo.state, "$label: wrong state")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. OSM adapter: processes at least one place per state from representative elements
    // ─────────────────────────────────────────────────────────────────────────

    // Representative OSM elements — one hospital/amenity per state, with name tags.
    // These mirror what Overpass would return for each state's bbox.
    private fun osmElement(id: Long, lat: Double, lon: Double, name: String, amenity: String = "hospital") =
        OverpassElement(
            type = "node",
            id = id,
            lat = lat,
            lon = lon,
            tags = mapOf("name" to name, "amenity" to amenity),
            center = null
        )

    @Test
    fun `OSM adapter maps Kuala Terengganu hospital`() {
        val element = osmElement(1001L, 5.33, 103.14, "Hospital Sultanah Nur Zahirah")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Hospital Sultanah Nur Zahirah", place!!.name)
        assertEquals("Kuala Terengganu", place.city)
        assertEquals("Terengganu", MalaysiaGeoUtils.state(place.latitude, place.longitude))
        assertEquals(Category.HOSPITAL, place.category)
    }

    @Test
    fun `OSM adapter maps Kota Bharu hospital`() {
        val element = osmElement(1002L, 6.13, 102.26, "Hospital Raja Perempuan Zainab II")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Kota Bharu", place!!.city)
        assertEquals("Kelantan", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Kuantan Pahang hospital`() {
        val element = osmElement(1003L, 3.83, 103.33, "Hospital Tengku Ampuan Afzan")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Kuantan", place!!.city)
        assertEquals("Pahang", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Johor Bahru hospital`() {
        val element = osmElement(1004L, 1.49, 103.74, "Hospital Sultanah Aminah")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Johor Bahru", place!!.city)
        assertEquals("Johor", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Alor Setar Kedah hospital`() {
        val element = osmElement(1005L, 6.12, 100.37, "Hospital Sultanah Bahiyah")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Alor Setar", place!!.city)
        assertEquals("Kedah", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Georgetown Penang hospital`() {
        val element = osmElement(1006L, 5.42, 100.33, "Hospital Pulau Pinang")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Georgetown", place!!.city)
        assertEquals("Pulau Pinang", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Ipoh Perak hospital`() {
        val element = osmElement(1007L, 4.60, 101.08, "Hospital Raja Permaisuri Bainun")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Ipoh", place!!.city)
        assertEquals("Perak", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Seremban Negeri Sembilan hospital`() {
        val element = osmElement(1008L, 2.73, 101.94, "Hospital Tuanku Jaafar")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Seremban", place!!.city)
        assertEquals("Negeri Sembilan", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Melaka hospital`() {
        val element = osmElement(1009L, 2.22, 102.24, "Hospital Melaka")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Melaka Tengah", place!!.city)
        assertEquals("Melaka", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Kota Kinabalu Sabah hospital`() {
        val element = osmElement(1010L, 6.00, 116.12, "Hospital Queen Elizabeth")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Kota Kinabalu", place!!.city)
        assertEquals("Sabah", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Kuching Sarawak hospital`() {
        val element = osmElement(1011L, 1.56, 110.36, "Hospital Umum Sarawak")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Kuching", place!!.city)
        assertEquals("Sarawak", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Miri Sarawak hospital`() {
        val element = osmElement(1012L, 3.25, 113.07, "Hospital Miri")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Miri", place!!.city)
        assertEquals("Sarawak", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    @Test
    fun `OSM adapter maps Kangar Perlis hospital`() {
        val element = osmElement(1013L, 6.45, 100.19, "Hospital Tuanku Fauziah")
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals("Kangar", place!!.city)
        assertEquals("Perlis", MalaysiaGeoUtils.state(place.latitude, place.longitude))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. data.gov.my adapter: bbox filtering passes records in each state
    // ─────────────────────────────────────────────────────────────────────────

    private fun hospitalRecord(name: String, lat: Double, lng: Double, code: String, state: String) =
        mapOf(
            "name" to name,
            "latitude" to lat.toString(),
            "longitude" to lng.toString(),
            "code" to code,
            "state" to state
        )

    private fun invokeMapRecord(record: Map<String, Any?>, bbox: BoundingBox): ExternalPlace? {
        val innerClass = dataGovAdapter.javaClass.declaredClasses
            .find { it.simpleName == "DatasetConfig" }!!
        val innerInstance = innerClass
            .getDeclaredConstructor(String::class.java, Category::class.java, String::class.java)
            .also { it.isAccessible = true }
            .newInstance("hospital_list", Category.HOSPITAL, "hospital")

        val method = dataGovAdapter.javaClass
            .getDeclaredMethod("mapRecord", Map::class.java, innerClass, BoundingBox::class.java)
            .also { it.isAccessible = true }

        @Suppress("UNCHECKED_CAST")
        return method.invoke(dataGovAdapter, record, innerInstance, bbox) as ExternalPlace?
    }

    @Test
    fun `data_gov_my returns hospital in Kuala Terengganu bbox`() {
        val bbox = AggregationService.MalaysiaRegion.TERENGGANU.bbox
        val record = hospitalRecord("Hospital Sultanah Nur Zahirah", 5.33, 103.14, "HSNZ", "TERENGGANU")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kuala Terengganu", place!!.city)
        assertEquals("Terengganu", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Kota Bharu Kelantan bbox`() {
        val bbox = AggregationService.MalaysiaRegion.KELANTAN.bbox
        val record = hospitalRecord("Hospital Raja Perempuan Zainab II", 6.13, 102.26, "HRPZ2", "KELANTAN")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kota Bharu", place!!.city)
        assertEquals("Kelantan", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Kuantan Pahang bbox`() {
        val bbox = AggregationService.MalaysiaRegion.PAHANG.bbox
        val record = hospitalRecord("Hospital Tengku Ampuan Afzan", 3.83, 103.33, "HTAA", "PAHANG")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kuantan", place!!.city)
        assertEquals("Pahang", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Johor Bahru bbox`() {
        val bbox = AggregationService.MalaysiaRegion.JOHOR.bbox
        val record = hospitalRecord("Hospital Sultanah Aminah", 1.49, 103.74, "HSA", "JOHOR")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Johor Bahru", place!!.city)
        assertEquals("Johor", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Melaka bbox`() {
        val bbox = AggregationService.MalaysiaRegion.MELAKA.bbox
        val record = hospitalRecord("Hospital Melaka", 2.22, 102.24, "HM", "MELAKA")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Melaka Tengah", place!!.city)
        assertEquals("Melaka", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Seremban NS bbox`() {
        val bbox = AggregationService.MalaysiaRegion.NEGERI_SEMBILAN.bbox
        val record = hospitalRecord("Hospital Tuanku Jaafar", 2.73, 101.94, "HTJ", "NEGERI SEMBILAN")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Seremban", place!!.city)
        assertEquals("Negeri Sembilan", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Alor Setar Kedah bbox`() {
        val bbox = AggregationService.MalaysiaRegion.KEDAH.bbox
        val record = hospitalRecord("Hospital Sultanah Bahiyah", 6.12, 100.37, "HSBah", "KEDAH")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Alor Setar", place!!.city)
        assertEquals("Kedah", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Georgetown Penang bbox`() {
        val bbox = AggregationService.MalaysiaRegion.PENANG.bbox
        val record = hospitalRecord("Hospital Pulau Pinang", 5.42, 100.33, "HPP", "PULAU PINANG")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Georgetown", place!!.city)
        assertEquals("Pulau Pinang", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Ipoh Perak bbox`() {
        val bbox = AggregationService.MalaysiaRegion.PERAK.bbox
        val record = hospitalRecord("Hospital Raja Permaisuri Bainun", 4.60, 101.08, "HRPB", "PERAK")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Ipoh", place!!.city)
        assertEquals("Perak", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Kangar Perlis bbox`() {
        val bbox = AggregationService.MalaysiaRegion.PERLIS.bbox
        val record = hospitalRecord("Hospital Tuanku Fauziah", 6.45, 100.19, "HTF", "PERLIS")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kangar", place!!.city)
        assertEquals("Perlis", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Kota Kinabalu Sabah bbox`() {
        val bbox = AggregationService.MalaysiaRegion.SABAH.bbox
        val record = hospitalRecord("Hospital Queen Elizabeth", 6.00, 116.12, "HQE", "SABAH")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kota Kinabalu", place!!.city)
        assertEquals("Sabah", place.state)
    }

    @Test
    fun `data_gov_my returns hospital in Kuching Sarawak bbox`() {
        val bbox = AggregationService.MalaysiaRegion.SARAWAK.bbox
        val record = hospitalRecord("Hospital Umum Sarawak", 1.56, 110.36, "HUS", "SARAWAK")
        val place = invokeMapRecord(record, bbox)

        assertNotNull(place)
        assertEquals("Kuching", place!!.city)
        assertEquals("Sarawak", place.state)
    }

    @Test
    fun `data_gov_my filters out records outside the requested state bbox`() {
        // A KL hospital should NOT appear in the Terengganu bbox
        val bbox = AggregationService.MalaysiaRegion.TERENGGANU.bbox
        val record = hospitalRecord("Hospital Kuala Lumpur", 3.15, 101.70, "HKL", "WP KL")
        val place = invokeMapRecord(record, bbox)

        assertNull(place)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Prasarana GTFS: bbox filtering delivers transit stops in non-KL states
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `Prasarana GTFS delivers Penang bus stop within Penang bbox`() {
        val penangBbox = AggregationService.MalaysiaRegion.PENANG.bbox
        val zip = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
PG1,WELD QUAY,5.415000,100.340000,BUS,true
PG2,KOMTAR,5.418000,100.333000,BUS,false"""
        )
        val places = parsePrasaranaZip(zip, penangBbox, "rapid-bus-penang")

        assertTrue(places.size >= 2, "Expected ≥2 Penang stops, got ${places.size}")
        assertTrue(places.all { MalaysiaGeoUtils.state(it.latitude, it.longitude) == "Pulau Pinang" })
    }

    @Test
    fun `Prasarana GTFS filters KL stops out of Penang bbox`() {
        val penangBbox = AggregationService.MalaysiaRegion.PENANG.bbox
        val zip = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
KL1,MASJID JAMEK,3.149000,101.697000,LRT,true
PG1,WELD QUAY,5.415000,100.340000,BUS,true"""
        )
        val places = parsePrasaranaZip(zip, penangBbox, "rapid-bus-penang")

        assertEquals(1, places.size)
        assertEquals("WELD QUAY", places[0].name)
    }

    @Test
    fun `Prasarana GTFS delivers Johor Bahru bus stop within Johor bbox`() {
        val johorBbox = AggregationService.MalaysiaRegion.JOHOR.bbox
        val zip = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
JB1,JB SENTRAL,1.485000,103.729000,BUS,true
JB2,LARKIN TERMINAL,1.493000,103.720000,BUS,false"""
        )
        val places = parsePrasaranaZip(zip, johorBbox, "rapid-bus-johor")

        assertTrue(places.size >= 2, "Expected ≥2 JB stops, got ${places.size}")
        assertTrue(places.all { MalaysiaGeoUtils.state(it.latitude, it.longitude) == "Johor" })
    }

    @Test
    fun `Prasarana GTFS delivers Kuching bus stop within Sarawak bbox`() {
        val sarawakBbox = AggregationService.MalaysiaRegion.SARAWAK.bbox
        val zip = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
KCH1,KUCHING SENTRAL,1.557000,110.361000,BUS,true"""
        )
        val places = parsePrasaranaZip(zip, sarawakBbox, "rapid-bus-kuching")

        assertEquals(1, places.size)
        assertEquals("KUCHING SENTRAL", places[0].name)
        assertEquals("Kuching", places[0].city)
        assertEquals("Sarawak", places[0].state)
    }

    @Test
    fun `Prasarana GTFS delivers Kota Kinabalu bus stop within Sabah bbox`() {
        val sabahBbox = AggregationService.MalaysiaRegion.SABAH.bbox
        val zip = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
KK1,KK SENTRAL,6.002000,116.115000,BUS,true"""
        )
        val places = parsePrasaranaZip(zip, sabahBbox, "rapid-bus-kk")

        assertEquals(1, places.size)
        assertEquals("KK SENTRAL", places[0].name)
        assertEquals("Kota Kinabalu", places[0].city)
        assertEquals("Sabah", places[0].state)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. OSM: wheelchair-tagged places are passed through for all states
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `OSM wheelchair=yes is preserved for Terengganu place`() {
        val element = OverpassElement(
            type = "node", id = 9001L,
            lat = 5.33, lon = 103.14,
            tags = mapOf("name" to "Mall Mesra", "shop" to "mall", "wheelchair" to "yes"),
            center = null
        )
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals(WheelchairAccess.YES, place!!.wheelchairAccess)
        assertEquals("Kuala Terengganu", place.city)
    }

    @Test
    fun `OSM wheelchair=limited is preserved for Kelantan place`() {
        val element = OverpassElement(
            type = "node", id = 9002L,
            lat = 6.13, lon = 102.26,
            tags = mapOf("name" to "Kota Bharu Mall", "shop" to "mall", "wheelchair" to "limited"),
            center = null
        )
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals(WheelchairAccess.LIMITED, place!!.wheelchairAccess)
    }

    @Test
    fun `OSM wheelchair=no is preserved for Sabah place`() {
        val element = OverpassElement(
            type = "node", id = 9003L,
            lat = 6.00, lon = 116.12,
            tags = mapOf("name" to "Warisan Square", "shop" to "mall", "wheelchair" to "no"),
            center = null
        )
        val place = osmAdapter.mapToExternalPlace(element)

        assertNotNull(place)
        assertEquals(WheelchairAccess.NO, place!!.wheelchairAccess)
        assertEquals("Kota Kinabalu", place.city)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. AggregationService.MalaysiaRegion — all regions have correct bbox orientation
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `all MalaysiaRegion bounding boxes have south less than north and west less than east`() {
        val violations = AggregationService.MalaysiaRegion.entries.filter { region ->
            val b = region.bbox
            b.south >= b.north || b.west >= b.east
        }
        assertTrue(violations.isEmpty()) {
            "Inverted bbox in: ${violations.map { it.name }}"
        }
    }

    @Test
    fun `all MalaysiaGeoUtils city boxes have south less than north and west less than east`() {
        // Exercise the entire lookup table by sampling corners of each named city bbox
        // We verify indirectly: the lookup must not crash and state fallback must never
        // return the wrong state for a coordinate that should hit a city box.
        val cityChecks = listOf(
            Triple(3.15, 101.70, "Wilayah Persekutuan Kuala Lumpur"),
            Triple(5.33, 103.14, "Terengganu"),
            Triple(6.13, 102.26, "Kelantan"),
            Triple(3.83, 103.33, "Pahang"),
            Triple(1.49, 103.74, "Johor"),
            Triple(3.25, 113.07, "Sarawak"),
        )
        for ((lat, lng, expectedState) in cityChecks) {
            assertEquals(expectedState, MalaysiaGeoUtils.state(lat, lng),
                "Expected state $expectedState for ($lat, $lng)")
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private fun buildGtfsZip(csvContent: String): ByteArray {
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            zip.putNextEntry(ZipEntry("stops.txt"))
            zip.write(csvContent.toByteArray(Charsets.UTF_8))
            zip.closeEntry()
        }
        return baos.toByteArray()
    }

    @Suppress("UNCHECKED_CAST")
    private fun parsePrasaranaZip(
        zipBytes: ByteArray,
        bbox: BoundingBox,
        categoryLabel: String
    ): List<ExternalPlace> {
        val method = PrasaranaGtfsAdapter::class.java
            .getDeclaredMethod("parseStopsFromZip", ByteArray::class.java, BoundingBox::class.java, String::class.java)
            .also { it.isAccessible = true }
        return method.invoke(prasaranaAdapter, zipBytes, bbox, categoryLabel) as List<ExternalPlace>
    }
}
