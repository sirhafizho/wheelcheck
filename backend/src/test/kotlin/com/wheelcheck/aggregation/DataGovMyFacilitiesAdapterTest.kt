package com.wheelcheck.aggregation

import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

private typealias DatasetConfig = DataGovMyFacilitiesAdapter.DatasetConfig

class DataGovMyFacilitiesAdapterTest {

    private lateinit var adapter: DataGovMyFacilitiesAdapter
    private val objectMapper = ObjectMapper()

    @BeforeEach
    fun setup() {
        adapter = DataGovMyFacilitiesAdapter(
            objectMapper = objectMapper
        )
    }

    // ── basic config ──────────────────────────────────────────────────────────

    @Test
    fun `isEnabled is always true since no API key required`() {
        assertTrue(adapter.isEnabled)
    }

    @Test
    fun `sourceType is DATA_GOV_MY`() {
        assertEquals(DataSourceType.DATA_GOV_MY, adapter.sourceType)
    }

    // ── record mapping ────────────────────────────────────────────────────────

    @Test
    fun `maps hospital record with latitude longitude fields`() {
        val record = mapOf(
            "name" to "Hospital Kuala Lumpur",
            "latitude" to "3.1500",
            "longitude" to "101.7000",
            "code" to "HKL",
            "state" to "WILAYAH PERSEKUTUAN",
            "address" to "Jalan Pahang"
        )

        val place = invokeMapRecord(record, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"),
            BoundingBox(south = 3.00, west = 101.55, north = 3.30, east = 101.85))

        assertNotNull(place)
        assertEquals("Hospital Kuala Lumpur", place!!.name)
        assertEquals(DataSourceType.DATA_GOV_MY, place.sourceType)
        assertEquals(Category.HOSPITAL, place.category)
        assertEquals(WheelchairAccess.UNKNOWN, place.wheelchairAccess)
        assertEquals("datagov:hospital:HKL", place.externalId)
        assertEquals(3.15, place.latitude, 0.001)
        assertEquals(101.70, place.longitude, 0.001)
    }

    @Test
    fun `maps record using alternative coordinate field names`() {
        val record = mapOf(
            "nama" to "Klinik Kesihatan Cheras",
            "lat" to "3.0900",
            "lon" to "101.7500",
            "code" to "KK001"
        )

        val place = invokeMapRecord(record, DatasetConfig("clinic_kesihatan", Category.HOSPITAL, "clinic"),
            BoundingBox(south = 3.00, west = 101.60, north = 3.20, east = 101.90))

        assertNotNull(place)
        assertEquals("Klinik Kesihatan Cheras", place!!.name)
    }

    @Test
    fun `returns null when record has no coordinates`() {
        val record = mapOf(
            "name" to "Some Facility",
            "code" to "X001"
        )

        val place = invokeMapRecord(record, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"),
            BoundingBox(south = 1.0, west = 99.0, north = 7.5, east = 120.0))

        assertNull(place)
    }

    @Test
    fun `returns null when name is missing`() {
        val record = mapOf(
            "latitude" to "3.15",
            "longitude" to "101.70"
        )

        val place = invokeMapRecord(record, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"),
            BoundingBox(south = 3.0, west = 101.6, north = 3.3, east = 101.9))

        assertNull(place)
    }

    @Test
    fun `filters out records outside bounding box`() {
        val outsideRecord = mapOf(
            "name" to "Hospital Penang",
            "latitude" to "5.42",
            "longitude" to "100.33",
            "code" to "HPG"
        )

        val klBbox = BoundingBox(south = 3.05, west = 101.60, north = 3.25, east = 101.80)
        val place = invokeMapRecord(outsideRecord, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"), klBbox)

        assertNull(place)
    }

    @Test
    fun `auto-resolves city and state via MalaysiaGeoUtils`() {
        val record = mapOf(
            "name" to "Hospital Ipoh",
            "latitude" to "4.60",
            "longitude" to "101.08",
            "code" to "HI"
        )

        val perakBbox = BoundingBox(south = 4.0, west = 100.5, north = 5.0, east = 102.0)
        val place = invokeMapRecord(record, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"), perakBbox)

        assertNotNull(place)
        assertEquals("Ipoh", place!!.city)
        assertEquals("Perak", place.state)
    }

    @Test
    fun `rawTags include source, dataset and facility_code`() {
        val record = mapOf(
            "name" to "Hospital KL",
            "latitude" to "3.15",
            "longitude" to "101.70",
            "code" to "HKL",
            "district" to "WP KL"
        )

        val place = invokeMapRecord(record, DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"),
            BoundingBox(south = 3.0, west = 101.6, north = 3.3, east = 101.9))

        assertNotNull(place)
        val tags = place!!.rawTags
        assertEquals("data.gov.my", tags["source"])
        assertEquals("hospital_list", tags["dataset"])
        assertEquals("HKL", tags["facility_code"])
        assertEquals("WP KL", tags["addr:district"])
    }

    @Test
    fun `handles koordinat field names used in some datasets`() {
        val record = mapOf(
            "nama_klinik" to "Klinik 1Malaysia Batu Caves",
            "koordinat_latitud" to "3.2380",
            "koordinat_longitud" to "101.6830",
            "code" to "K1M001"
        )

        val place = invokeMapRecord(record, DatasetConfig("clinic_1malaysia", Category.HOSPITAL, "clinic_1m"),
            BoundingBox(south = 3.0, west = 101.5, north = 3.5, east = 102.0))

        assertNotNull(place)
        assertEquals("Klinik 1Malaysia Batu Caves", place!!.name)
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun invokeMapRecord(
        record: Map<String, Any?>,
        ds: DataGovMyFacilitiesAdapter.DatasetConfig,
        bbox: BoundingBox
    ): ExternalPlace? {
        return adapter.mapRecord(record, ds, bbox)
    }
}
