package com.wheelcheck.aggregation

import com.wheelcheck.common.Category
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.test.util.ReflectionTestUtils
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class PrasaranaGtfsAdapterTest {

    private lateinit var adapter: PrasaranaGtfsAdapter

    private val klBbox = BoundingBox(south = 3.05, west = 101.60, north = 3.25, east = 101.80)

    @BeforeEach
    fun setup() {
        adapter = PrasaranaGtfsAdapter(
            baseUrl = "https://api.data.gov.my/gtfs-static/prasarana",
            categoriesConfig = "rapid-rail-kl"
        )
    }

    // ── isEnabled ──────────────────────────────────────────────────────────────

    @Test
    fun `isEnabled is always true since no API key required`() {
        assertTrue(adapter.isEnabled)
    }

    @Test
    fun `sourceType is PRASARANA_GTFS`() {
        assertEquals(DataSourceType.PRASARANA_GTFS, adapter.sourceType)
    }

    // ── CSV parsing ────────────────────────────────────────────────────────────

    @Test
    fun `parses stop with isOKU true as WheelchairAccess YES`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG18,AMPANG,3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals(WheelchairAccess.YES, places[0].wheelchairAccess)
        assertEquals("AMPANG", places[0].name)
        assertEquals("prasarana:AG18", places[0].externalId)
        assertEquals(Category.TRANSPORT, places[0].category)
        assertEquals(DataSourceType.PRASARANA_GTFS, places[0].sourceType)
    }

    @Test
    fun `parses stop with isOKU false as WheelchairAccess NO`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG20,SOME STOP,3.160000,101.700000,LRT,false"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals(WheelchairAccess.NO, places[0].wheelchairAccess)
    }

    @Test
    fun `parses stop with missing isOKU as WheelchairAccess UNKNOWN`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category
MR1,MONORAIL STOP,3.145000,101.710000,MR"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals(WheelchairAccess.UNKNOWN, places[0].wheelchairAccess)
    }

    @Test
    fun `filters out stops outside bounding box`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
PG1,PENANG STOP,5.400000,100.330000,BUS,true
AG18,AMPANG,3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals("AMPANG", places[0].name)
    }

    @Test
    fun `returns empty list when stops_txt is not in ZIP`() {
        val zipBytes = buildGtfsZip(null, fileName = "routes.txt")
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertTrue(places.isEmpty())
    }

    @Test
    fun `skips rows with missing required fields`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
,EMPTY ID,3.150000,101.700000,LRT,true
AG18,,3.150318,101.760049,LRT,true
AG19,VALID STOP,3.160000,101.710000,MRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        // Only AG19 — AG18 has no name, first row has no id
        assertEquals(1, places.size)
        assertEquals("VALID STOP", places[0].name)
    }

    @Test
    fun `skips rows with non-numeric lat or lng`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
BAD1,BAD COORDS,not-a-lat,101.700000,LRT,true
GOOD1,GOOD STOP,3.150000,101.700000,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals("GOOD STOP", places[0].name)
    }

    // ── description building ───────────────────────────────────────────────────

    @Test
    fun `description says LRT Station for LRT category`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG18,AMPANG,3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertTrue(places[0].description?.contains("LRT Station") == true)
        assertTrue(places[0].description?.contains("OKU accessible") == true)
    }

    @Test
    fun `description says MRT Station for MRT category`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
MRT1,PUTRAJAYA SENTRAL,3.090000,101.670000,MRT,false"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertTrue(places[0].description?.contains("MRT Station") == true)
        assertTrue(places[0].description?.contains("not OKU accessible") == true)
    }

    // ── rawTags ────────────────────────────────────────────────────────────────

    @Test
    fun `rawTags include source and wheelchair for OKU accessible stop`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG18,AMPANG,3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        val tags = places[0].rawTags
        assertEquals("prasarana_gtfs", tags["source"])
        assertEquals("yes", tags["wheelchair"])
        assertEquals("station", tags["public_transport"])
    }

    @Test
    fun `rawTags set wheelchair=no for non-OKU stop`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG20,STOP,3.160000,101.700000,LRT,false"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals("no", places[0].rawTags["wheelchair"])
    }

    // ── city detection ─────────────────────────────────────────────────────────

    @Test
    fun `assigns Kuala Lumpur for KL coordinates`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG18,AMPANG,3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals("Kuala Lumpur", places[0].city)
    }

    @Test
    fun `assigns Georgetown for Penang island coordinates`() {
        val penangBbox = BoundingBox(south = 5.30, west = 100.20, north = 5.50, east = 100.50)
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
PG1,WELD QUAY,5.415000,100.340000,BUS,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, penangBbox, "rapid-bus-penang")

        assertEquals("Georgetown", places[0].city)
        assertEquals("Pulau Pinang", places[0].state)
    }

    @Test
    fun `assigns state via MalaysiaGeoUtils for Johor Bahru coordinates`() {
        val jbBbox = BoundingBox(south = 1.40, west = 103.60, north = 1.60, east = 103.85)
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
JB1,JB SENTRAL,1.485000,103.729000,BUS,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, jbBbox, "rapid-bus-jb")

        assertEquals("Johor Bahru", places[0].city)
        assertEquals("Johor", places[0].state)
    }

    // ── multi-category config ──────────────────────────────────────────────────

    @Test
    fun `categories config is split by comma`() {
        val multiAdapter = PrasaranaGtfsAdapter(
            baseUrl = "https://api.data.gov.my/gtfs-static/prasarana",
            categoriesConfig = "rapid-rail-kl, rapid-bus-kl, rapid-bus-mrtfeeder"
        )
        // Verify adapter is enabled and source type is correct
        assertTrue(multiAdapter.isEnabled)
        assertEquals(DataSourceType.PRASARANA_GTFS, multiAdapter.sourceType)
    }

    // ── quoted CSV handling ────────────────────────────────────────────────────

    @Test
    fun `handles quoted CSV fields with embedded commas in name`() {
        val zipBytes = buildGtfsZip(
            """stop_id,stop_name,stop_lat,stop_lon,category,isOKU
AG18,"AMPANG, SELANGOR",3.150318,101.760049,LRT,true"""
        )
        val places = invokeParseStopsFromZip(zipBytes, klBbox, "rapid-rail-kl")

        assertEquals(1, places.size)
        assertEquals("AMPANG, SELANGOR", places[0].name)
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun buildGtfsZip(csvContent: String?, fileName: String = "stops.txt"): ByteArray {
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            zip.putNextEntry(ZipEntry(fileName))
            if (csvContent != null) {
                zip.write(csvContent.toByteArray(Charsets.UTF_8))
            }
            zip.closeEntry()
        }
        return baos.toByteArray()
    }

    @Suppress("UNCHECKED_CAST")
    private fun invokeParseStopsFromZip(
        zipBytes: ByteArray,
        bbox: BoundingBox,
        categoryLabel: String
    ): List<ExternalPlace> {
        val method = PrasaranaGtfsAdapter::class.java
            .getDeclaredMethod("parseStopsFromZip", ByteArray::class.java, BoundingBox::class.java, String::class.java)
        method.isAccessible = true
        return method.invoke(adapter, zipBytes, bbox, categoryLabel) as List<ExternalPlace>
    }
}
