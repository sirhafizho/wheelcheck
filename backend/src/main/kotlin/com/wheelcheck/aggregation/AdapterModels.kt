package com.wheelcheck.aggregation

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category

enum class DataSourceType(val displayName: String, val priority: Int) {
    OSM("OpenStreetMap", 90),
    ACCESSIBILITY_CLOUD("accessibility.cloud", 80),
    WIKIDATA("Wikidata", 75),
    GOOGLE_PLACES("Google Places", 70),
    COMMUNITY("WheelCheck Community", 100),
    SEED("Seed Data", 50)
}

enum class WheelchairAccess {
    YES, NO, LIMITED, UNKNOWN;

    fun toAccessLevel(): AccessLevel = when (this) {
        YES -> AccessLevel.FULL
        LIMITED -> AccessLevel.PARTIAL
        NO -> AccessLevel.NOT_ACCESSIBLE
        UNKNOWN -> AccessLevel.UNKNOWN
    }
}

data class ExternalPlace(
    val externalId: String,
    val sourceType: DataSourceType,
    val name: String,
    val nameMs: String? = null,
    val latitude: Double,
    val longitude: Double,
    val address: String,
    val city: String = "Kuala Lumpur",
    val category: Category,
    val wheelchairAccess: WheelchairAccess = WheelchairAccess.UNKNOWN,
    val hasAccessibleToilet: Boolean? = null,
    val hasTactilePaving: Boolean? = null,
    val description: String? = null,
    val rawTags: Map<String, String> = emptyMap()
)

data class BoundingBox(
    val south: Double,
    val west: Double,
    val north: Double,
    val east: Double
) {
    fun toOverpassString() = "$south,$west,$north,$east"
}

data class ImportStats(
    val source: DataSourceType,
    val fetched: Int,
    val imported: Int,
    val updated: Int,
    val skipped: Int,
    val errors: Int,
    val message: String
)

/**
 * Adapter interface for external accessibility data sources.
 * Each adapter knows how to query one source and map results to ExternalPlace.
 */
interface AccessibilityDataAdapter {
    val sourceType: DataSourceType
    val isEnabled: Boolean

    fun fetchPlaces(bbox: BoundingBox): List<ExternalPlace>
}
