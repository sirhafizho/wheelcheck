package com.wheelcheck.aggregation

import com.wheelcheck.common.Category
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.InputStreamReader
import java.util.zip.ZipInputStream

/**
 * Adapter for Prasarana GTFS static data via data.gov.my.
 * Provides OKU (Orang Kurang Upaya / wheelchair) accessibility data for
 * Malaysian LRT, MRT, BRT, Monorail, and bus stations — completely free, no API key.
 *
 * Enable by setting:
 *   wheelcheck.adapters.prasarana.enabled=true
 *
 * Data source: https://api.data.gov.my/gtfs-static/prasarana/?category=rapid-rail-kl
 * Fetches the entire GTFS ZIP on demand and filters stops by bbox in-memory.
 * Schedule periodic refreshes (weekly) rather than calling per-request.
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.prasarana.enabled", havingValue = "true", matchIfMissing = false)
class PrasaranaGtfsAdapter(
    @Value("\${wheelcheck.adapters.prasarana.base-url:https://api.data.gov.my/gtfs-static/prasarana}")
    private val baseUrl: String,
    @Value("\${wheelcheck.adapters.prasarana.categories:rapid-rail-kl}")
    private val categoriesConfig: String
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(PrasaranaGtfsAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.PRASARANA_GTFS
    override val isEnabled = true

    private val categories get() = categoriesConfig.split(",").map { it.trim() }.filter { it.isNotBlank() }

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        val allStops = mutableListOf<ExternalPlace>()

        for (category in categories) {
            try {
                val stops = fetchCategory(category, bbox)
                logger.info("Prasarana GTFS [$category]: ${stops.size} stops in bbox")
                allStops.addAll(stops)
            } catch (e: Exception) {
                logger.error("Prasarana GTFS [$category] error: ${e.message}", e)
            }
        }

        return allStops
    }

    private fun fetchCategory(category: String, bbox: BoundingBox): List<ExternalPlace> {
        val url = "$baseUrl/?category=$category"
        logger.info("Prasarana GTFS: downloading $url")

        val zipBytes = restTemplate.getForObject(url, ByteArray::class.java) ?: run {
            logger.warn("Prasarana GTFS [$category]: empty response")
            return emptyList()
        }

        return parseStopsFromZip(zipBytes, bbox, category)
    }

    private fun parseStopsFromZip(zipBytes: ByteArray, bbox: BoundingBox, categoryLabel: String): List<ExternalPlace> {
        val places = mutableListOf<ExternalPlace>()

        ZipInputStream(ByteArrayInputStream(zipBytes)).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                if (entry.name == "stops.txt") {
                    val reader = BufferedReader(InputStreamReader(zip, Charsets.UTF_8))
                    val headerLine = reader.readLine() ?: break
                    val headers = headerLine.split(",").map { it.trim().removeSurrounding("\"") }

                    reader.lineSequence().forEach { line ->
                        parseStop(line, headers, bbox, categoryLabel)?.let { places.add(it) }
                    }
                    break
                }
                entry = zip.nextEntry
            }
        }

        return places
    }

    private fun parseStop(
        line: String,
        headers: List<String>,
        bbox: BoundingBox,
        categoryLabel: String
    ): ExternalPlace? {
        val values = parseCsvLine(line)
        if (values.size < headers.size) return null

        val row = headers.zip(values).toMap()

        val stopId = row["stop_id"]?.takeIf { it.isNotBlank() } ?: return null
        val stopName = row["stop_name"]?.takeIf { it.isNotBlank() } ?: return null
        val lat = row["stop_lat"]?.toDoubleOrNull() ?: return null
        val lng = row["stop_lon"]?.toDoubleOrNull() ?: return null

        if (lat < bbox.south || lat > bbox.north || lng < bbox.west || lng > bbox.east) return null

        // isOKU field: "true" = wheelchair accessible, "false" = not, absent = unknown
        val isOku = row["isOKU"]
        val wheelchairAccess = when (isOku?.lowercase()) {
            "true", "1", "yes" -> WheelchairAccess.YES
            "false", "0", "no" -> WheelchairAccess.NO
            else -> WheelchairAccess.UNKNOWN
        }

        val transitCategory = row["category"] ?: categoryLabel
        val description = buildDescription(transitCategory, isOku)

        return ExternalPlace(
            externalId = "prasarana:$stopId",
            sourceType = DataSourceType.PRASARANA_GTFS,
            name = stopName,
            latitude = lat,
            longitude = lng,
            address = "Address not available",
            city = determineCityFromCoords(lat, lng),
            category = Category.TRANSPORT,
            wheelchairAccess = wheelchairAccess,
            description = description,
            rawTags = buildRawTags(row, transitCategory, wheelchairAccess)
        )
    }

    private fun buildDescription(transitCategory: String, isOku: String?): String {
        val typeLabel = when (transitCategory.uppercase()) {
            "LRT" -> "LRT Station"
            "MRT" -> "MRT Station"
            "BRT" -> "BRT Station"
            "MR", "MONORAIL" -> "Monorail Station"
            "KTMB", "KTM" -> "KTM Station"
            else -> "Transit Station"
        }
        val okuLabel = when (isOku?.lowercase()) {
            "true", "1", "yes" -> " — OKU accessible"
            "false", "0", "no" -> " — not OKU accessible"
            else -> ""
        }
        return "$typeLabel$okuLabel"
    }

    private fun buildRawTags(
        row: Map<String, String>,
        transitCategory: String,
        wheelchairAccess: WheelchairAccess
    ): Map<String, String> {
        val tags = mutableMapOf(
            "source" to "prasarana_gtfs",
            "public_transport" to "station",
            "transit_category" to transitCategory
        )
        row["route_id"]?.let { tags["route_id"] = it }
        row["isOKU"]?.let { tags["isOKU"] = it }
        when (wheelchairAccess) {
            WheelchairAccess.YES -> tags["wheelchair"] = "yes"
            WheelchairAccess.NO -> tags["wheelchair"] = "no"
            else -> Unit
        }
        return tags
    }

    // Handles quoted CSV fields with embedded commas
    private fun parseCsvLine(line: String): List<String> {
        val result = mutableListOf<String>()
        val current = StringBuilder()
        var inQuotes = false

        for (char in line) {
            when {
                char == '"' -> inQuotes = !inQuotes
                char == ',' && !inQuotes -> {
                    result.add(current.toString().trim())
                    current.clear()
                }
                else -> current.append(char)
            }
        }
        result.add(current.toString().trim())
        return result
    }

    private fun determineCityFromCoords(lat: Double, lng: Double): String = when {
        lat in 3.05..3.25 && lng in 101.60..101.80 -> "Kuala Lumpur"
        lat in 3.00..3.20 && lng in 101.55..101.70 -> "Petaling Jaya"
        lat in 3.05..3.15 && lng in 101.45..101.60 -> "Shah Alam"
        lat in 2.95..3.10 && lng in 101.35..101.55 -> "Klang"
        lat in 3.10..3.25 && lng in 101.55..101.70 -> "Subang Jaya"
        lat in 2.85..3.00 && lng in 101.60..101.80 -> "Putrajaya"
        lat in 2.90..3.05 && lng in 101.65..101.85 -> "Kajang"
        lat in 5.30..5.50 && lng in 100.20..100.50 -> "Penang"
        else -> "Malaysia"
    }
}
