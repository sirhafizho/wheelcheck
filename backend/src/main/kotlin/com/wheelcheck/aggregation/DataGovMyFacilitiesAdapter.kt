package com.wheelcheck.aggregation

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.wheelcheck.common.Category
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

/**
 * Adapter for MOH Malaysia healthcare facilities data.
 *
 * Source: MoH-Malaysia/kkmnow-data on GitHub (parquet, converted to bundled JSON).
 * Contains 3,304 government hospitals and clinics with GPS coordinates,
 * covering all 16 states/territories — completely free, no API key.
 *
 * The original data.gov.my REST API datasets (hospital_list, clinic_kesihatan,
 * clinic_1malaysia) were removed circa 2025. This adapter now reads from a
 * bundled JSON snapshot at classpath:data/moh_facilities.json.
 *
 * Enable by setting:
 *   wheelcheck.adapters.data-gov-my.enabled=true
 *
 * Note: accessibility tagging (wheelchair, OKU bays) is not present.
 * Imported records start as UNKNOWN and rely on community reviews.
 */
@Component
@ConditionalOnProperty("wheelcheck.adapters.data-gov-my.enabled", havingValue = "true", matchIfMissing = false)
class DataGovMyFacilitiesAdapter(
    private val objectMapper: ObjectMapper
) : AccessibilityDataAdapter {

    private val logger = LoggerFactory.getLogger(DataGovMyFacilitiesAdapter::class.java)

    override val sourceType = DataSourceType.DATA_GOV_MY
    override val isEnabled = true

    private val facilities: List<MohFacility> by lazy { loadFacilities() }

    override fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace> {
        val places = facilities
            .filter { it.lat in bbox.south..bbox.north && it.lon in bbox.west..bbox.east }
            .map { mapToExternalPlace(it) }

        logger.info("data.gov.my: ${places.size} facilities in bbox")
        return places
    }

    private fun loadFacilities(): List<MohFacility> {
        val stream = javaClass.classLoader.getResourceAsStream("data/moh_facilities.json")
        if (stream == null) {
            logger.error("data.gov.my: bundled moh_facilities.json not found on classpath")
            return emptyList()
        }

        return try {
            val lenientMapper = objectMapper.copy()
                .enable(JsonParser.Feature.ALLOW_NON_NUMERIC_NUMBERS)
            val typeRef = object : TypeReference<List<MohFacility>>() {}
            val data = lenientMapper.readValue(stream, typeRef)
                .filter { it.lat.isFinite() && it.lon.isFinite() && it.lat != 0.0 && it.lon != 0.0 }
            logger.info("data.gov.my: loaded ${data.size} facilities from bundled dataset")
            data
        } catch (e: Exception) {
            logger.error("data.gov.my: failed to parse moh_facilities.json: ${e.message}", e)
            emptyList()
        }
    }

    internal fun mapToExternalPlace(facility: MohFacility): ExternalPlace {
        val geo = MalaysiaGeoUtils.lookup(facility.lat, facility.lon)
        val category = if (facility.type == "hospital") Category.HOSPITAL else Category.HOSPITAL

        return ExternalPlace(
            externalId = "datagov:${facility.type}:${facility.lat},${facility.lon}",
            sourceType = DataSourceType.DATA_GOV_MY,
            name = facility.name,
            latitude = facility.lat,
            longitude = facility.lon,
            address = facility.address ?: null,
            city = geo.city,
            state = geo.state,
            category = category,
            wheelchairAccess = WheelchairAccess.UNKNOWN,
            rawTags = buildRawTags(facility)
        )
    }

    private fun buildRawTags(facility: MohFacility): Map<String, String> {
        val tags = mutableMapOf(
            "source" to "data.gov.my",
            "dataset" to "moh_facilities",
            "facility_type" to facility.type
        )
        facility.state?.let { tags["addr:state"] = it }
        facility.district?.let { tags["addr:district"] = it }
        facility.phone?.let { tags["phone"] = it }
        return tags
    }

    // Keep mapRecord accessible for existing unit tests
    internal fun mapRecord(
        record: Map<String, Any?>,
        ds: DatasetConfig,
        bbox: BoundingBox
    ): ExternalPlace? {
        val lat = record.latValue() ?: return null
        val lng = record.lngValue() ?: return null

        if (lat !in bbox.south..bbox.north || lng !in bbox.west..bbox.east) return null

        val name = record.nameValue() ?: return null
        val geo = MalaysiaGeoUtils.lookup(lat, lng)

        return ExternalPlace(
            externalId = "datagov:${ds.idPrefix}:${record["code"] ?: "$lat,$lng"}",
            sourceType = DataSourceType.DATA_GOV_MY,
            name = name,
            latitude = lat,
            longitude = lng,
            address = record["address"]?.toString() ?: null,
            city = geo.city,
            state = geo.state,
            category = ds.category,
            wheelchairAccess = WheelchairAccess.UNKNOWN,
            rawTags = buildMapRecordTags(record, ds)
        )
    }

    private fun buildMapRecordTags(record: Map<String, Any?>, ds: DatasetConfig): Map<String, String> {
        val tags = mutableMapOf("source" to "data.gov.my", "dataset" to ds.id)
        record["code"]?.toString()?.let { tags["facility_code"] = it }
        record["district"]?.toString()?.let { tags["addr:district"] = it }
        return tags
    }

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

    internal data class DatasetConfig(
        val id: String,
        val category: Category,
        val idPrefix: String
    )
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class MohFacility(
    val state: String? = null,
    val district: String? = null,
    val type: String = "",
    val name: String = "",
    val address: String? = null,
    val phone: String? = null,
    val lat: Double = 0.0,
    val lon: Double = 0.0
)
