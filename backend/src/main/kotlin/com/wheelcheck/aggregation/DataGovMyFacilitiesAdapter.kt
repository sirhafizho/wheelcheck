package com.wheelcheck.aggregation

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder

/**
 * Adapter for the data.gov.my Data Catalogue REST API.
 *
 * Fetches MOH public hospitals and government clinics (Klinik Kesihatan) that
 * have coordinates, covering the entire country — completely free, no API key.
 *
 * Enable by setting:
 *   wheelcheck.adapters.data-gov-my.enabled=true
 *
 * Dataset IDs used:
 *   - hospital_list      : MOH public hospitals with GPS coordinates
 *   - clinic_1malaysia   : Klinik 1Malaysia (KD1M/KR1M) locations
 *   - clinic_kesihatan   : Klinik Kesihatan (government health clinics)
 *
 * API reference: https://api.data.gov.my/data-catalogue/
 *
 * Note: accessibility tagging (wheelchair, OKU bays) is not present in these
 * datasets. Imported records start as UNKNOWN and rely on community reviews.
 * The adapter's value is populating nationwide hospital/clinic coverage that
 * OSM alone would miss in rural areas.
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.data-gov-my.enabled", havingValue = "true", matchIfMissing = false)
class DataGovMyFacilitiesAdapter(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.adapters.data-gov-my.base-url:https://api.data.gov.my}")
    private val baseUrl: String,
    @Value("\${wheelcheck.adapters.data-gov-my.page-size:1000}")
    private val pageSize: Int
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(DataGovMyFacilitiesAdapter::class.java)
    private val restTemplate = RestTemplate()

    override val sourceType = DataSourceType.DATA_GOV_MY
    override val isEnabled = true

    private val datasets = listOf(
        DatasetConfig("hospital_list", Category.HOSPITAL, "hospital"),
        DatasetConfig("clinic_kesihatan", Category.HOSPITAL, "clinic"),
        DatasetConfig("clinic_1malaysia", Category.HOSPITAL, "clinic_1m")
    )

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        val all = mutableListOf<ExternalPlace>()
        for (ds in datasets) {
            try {
                val places = fetchDataset(ds, bbox)
                logger.info("data.gov.my [${ds.id}]: ${places.size} facilities in bbox")
                all.addAll(places)
            } catch (e: Exception) {
                logger.error("data.gov.my [${ds.id}] error: ${e.message}", e)
            }
        }
        return all
    }

    private fun fetchDataset(ds: DatasetConfig, bbox: BoundingBox): List<ExternalPlace> {
        val places = mutableListOf<ExternalPlace>()
        var offset = 0

        while (true) {
            val url = UriComponentsBuilder.fromHttpUrl("$baseUrl/data-catalogue/")
                .queryParam("id", ds.id)
                .queryParam("limit", pageSize)
                .queryParam("offset", offset)
                .build().toUriString()

            val responseStr = restTemplate.getForObject(url, String::class.java) ?: break
            val response = objectMapper.readValue(responseStr, DataGovMyResponse::class.java)

            val batch = response.data
                .mapNotNull { record -> mapRecord(record, ds, bbox) }
            places.addAll(batch)

            if (response.data.size < pageSize) break
            offset += pageSize
        }

        return places
    }

    private fun mapRecord(
        record: Map<String, Any?>,
        ds: DatasetConfig,
        bbox: BoundingBox
    ): ExternalPlace? {
        val lat = record.latValue() ?: return null
        val lng = record.lngValue() ?: return null

        if (lat !in bbox.south..bbox.north || lng !in bbox.west..bbox.east) return null

        val name = record.nameValue() ?: return null
        val address = buildAddress(record)
        val geo = MalaysiaGeoUtils.lookup(lat, lng)

        return ExternalPlace(
            externalId = "datagov:${ds.idPrefix}:${record["code"] ?: "$lat,$lng"}",
            sourceType = DataSourceType.DATA_GOV_MY,
            name = name,
            latitude = lat,
            longitude = lng,
            address = address,
            city = geo.city,
            state = geo.state,
            category = ds.category,
            wheelchairAccess = WheelchairAccess.UNKNOWN,
            rawTags = buildRawTags(record, ds)
        )
    }

    private fun buildAddress(record: Map<String, Any?>): String {
        val parts = listOfNotNull(
            record["address"]?.toString()?.takeIf { it.isNotBlank() },
            record["address_1"]?.toString()?.takeIf { it.isNotBlank() },
            record["address_2"]?.toString()?.takeIf { it.isNotBlank() },
            record["postcode"]?.toString()?.takeIf { it.isNotBlank() },
            record["city"]?.toString()?.takeIf { it.isNotBlank() },
            record["state"]?.toString()?.takeIf { it.isNotBlank() }
        )
        return if (parts.isNotEmpty()) parts.joinToString(", ") else "Address not available"
    }

    private fun buildRawTags(record: Map<String, Any?>, ds: DatasetConfig): Map<String, String> {
        val tags = mutableMapOf(
            "source" to "data.gov.my",
            "dataset" to ds.id
        )
        record["code"]?.toString()?.let { tags["facility_code"] = it }
        record["state"]?.toString()?.let { tags["addr:state"] = it }
        record["district"]?.toString()?.let { tags["addr:district"] = it }
        record["phone"]?.toString()?.let { tags["phone"] = it }
        return tags
    }

    // ── coordinate extraction ──────────────────────────────────────────────────
    // data.gov.my uses varying field names across datasets

    private fun Map<String, Any?>.latValue(): Double? =
        getDoubleOrNull("latitude")
            ?: getDoubleOrNull("lat")
            ?: getDoubleOrNull("y_coordinate")
            ?: getDoubleOrNull("koordinat_latitud")

    private fun Map<String, Any?>.lngValue(): Double? =
        getDoubleOrNull("longitude")
            ?: getDoubleOrNull("lon")
            ?: getDoubleOrNull("lng")
            ?: getDoubleOrNull("x_coordinate")
            ?: getDoubleOrNull("koordinat_longitud")

    private fun Map<String, Any?>.nameValue(): String? =
        (get("name") ?: get("nama") ?: get("facility_name") ?: get("hospital_name")
            ?: get("clinic_name") ?: get("nama_klinik") ?: get("nama_hospital"))
            ?.toString()?.takeIf { it.isNotBlank() }

    private fun Map<String, Any?>.getDoubleOrNull(key: String): Double? =
        get(key)?.toString()?.toDoubleOrNull()

    private data class DatasetConfig(
        val id: String,
        val category: Category,
        val idPrefix: String
    )
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class DataGovMyResponse(
    val data: List<Map<String, Any?>> = emptyList()
)
