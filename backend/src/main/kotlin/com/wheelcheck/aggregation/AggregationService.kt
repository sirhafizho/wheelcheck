package com.wheelcheck.aggregation

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceRepository
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class AggregationService(
    private val adapters: List<AccessibilityDataAdapter>,
    private val placeRepository: PlaceRepository,
    private val orsRoutingAdapter: OrsRoutingAdapter? = null
) {
    private val logger = LoggerFactory.getLogger(AggregationService::class.java)
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)

    enum class MalaysiaRegion(val bbox: BoundingBox) {
        KL(BoundingBox(south = 3.05, west = 101.60, north = 3.25, east = 101.80)),
        SELANGOR(BoundingBox(south = 2.70, west = 101.15, north = 3.55, east = 102.00)),
        JOHOR(BoundingBox(south = 1.20, west = 103.40, north = 2.10, east = 104.35)),
        KEDAH(BoundingBox(south = 5.60, west = 100.00, north = 6.73, east = 101.20)),
        KELANTAN(BoundingBox(south = 4.75, west = 101.65, north = 6.30, east = 102.35)),
        MELAKA(BoundingBox(south = 1.90, west = 102.00, north = 2.60, east = 102.85)),
        NEGERI_SEMBILAN(BoundingBox(south = 2.40, west = 101.70, north = 3.20, east = 102.65)),
        PAHANG(BoundingBox(south = 2.50, west = 101.30, north = 4.75, east = 103.55)),
        PENANG(BoundingBox(south = 5.10, west = 100.15, north = 5.65, east = 100.80)),
        PERAK(BoundingBox(south = 3.80, west = 100.40, north = 5.80, east = 101.85)),
        PERLIS(BoundingBox(south = 6.40, west = 100.07, north = 6.73, east = 100.45)),
        SABAH(BoundingBox(south = 4.00, west = 115.20, north = 7.40, east = 119.30)),
        SARAWAK(BoundingBox(south = 0.85, west = 109.55, north = 5.05, east = 115.65)),
        TERENGGANU(BoundingBox(south = 4.57, west = 102.55, north = 5.90, east = 103.60)),
        PENINSULAR(BoundingBox(south = 1.20, west = 99.60, north = 6.73, east = 104.35)),
        FULL_MALAYSIA(BoundingBox(south = 0.85, west = 99.60, north = 7.40, east = 119.30));
    }

    companion object {
        val KL_BBOX = MalaysiaRegion.KL.bbox
        val SELANGOR_BBOX = MalaysiaRegion.SELANGOR.bbox
    }

    fun importFromRegion(region: MalaysiaRegion): List<ImportStats> =
        importFromAllSources(region.bbox)

    /**
     * Import places from all enabled adapters for a given bounding box.
     * Deduplicates by OSM ID and proximity (50m).
     */
    @Transactional
    fun importFromAllSources(bbox: BoundingBox): List<ImportStats> {
        val enabledAdapters = adapters.filter { it.isEnabled }
        logger.info("Aggregation: starting import from ${enabledAdapters.size} adapter(s)")

        return enabledAdapters.map { adapter ->
            try {
                importFromAdapter(adapter, bbox)
            } catch (e: Exception) {
                logger.error("Aggregation: adapter ${adapter.sourceType} failed: ${e.message}", e)
                ImportStats(
                    source = adapter.sourceType,
                    fetched = 0, imported = 0, updated = 0, skipped = 0, errors = 1,
                    message = "Failed: ${e.message}"
                )
            }
        }
    }

    /**
     * Import from a single adapter.
     */
    @Transactional
    fun importFromAdapter(adapter: AccessibilityDataAdapter, bbox: BoundingBox): ImportStats {
        val externalPlaces = adapter.fetchPlaces(bbox)
        logger.info("${adapter.sourceType}: fetched ${externalPlaces.size} places")

        var imported = 0
        var updated = 0
        var skipped = 0
        var errors = 0

        for (ep in externalPlaces) {
            try {
                val result = upsertPlace(ep)
                when (result) {
                    UpsertResult.CREATED -> imported++
                    UpsertResult.UPDATED -> updated++
                    UpsertResult.SKIPPED -> skipped++
                }
            } catch (e: Exception) {
                logger.warn("${adapter.sourceType}: error processing ${ep.name}: ${e.message}")
                errors++
            }
        }

        val stats = ImportStats(
            source = adapter.sourceType,
            fetched = externalPlaces.size,
            imported = imported,
            updated = updated,
            skipped = skipped,
            errors = errors,
            message = "Success"
        )
        logger.info("${adapter.sourceType}: $stats")
        return stats
    }

    private fun upsertPlace(ep: ExternalPlace): UpsertResult {
        // Check by external ID first (exact match)
        val existingByOsmId = ep.externalId.let { placeRepository.findByOsmId(it) }
        if (existingByOsmId != null) {
            return updateExistingPlace(existingByOsmId, ep)
        }

        // Check by proximity (within 50m) to avoid duplicates
        val nearby = placeRepository.findNearby(ep.latitude, ep.longitude, 50, 1)
        val nameMatch = nearby.firstOrNull { it.name.equals(ep.name, ignoreCase = true) }
        if (nameMatch != null) {
            return updateExistingPlace(nameMatch, ep)
        }

        // Create new place
        val point = geometryFactory.createPoint(Coordinate(ep.longitude, ep.latitude))
        val accessLevel = ep.wheelchairAccess.toAccessLevel()
        val geo = MalaysiaGeoUtils.lookup(ep.latitude, ep.longitude)

        val place = Place(
            name = ep.name,
            nameMs = ep.nameMs,
            location = point,
            address = ep.address,
            city = ep.city.ifBlank { geo.city },
            state = ep.state ?: geo.state,
            category = ep.category,
            accessibilityLevel = accessLevel,
            osmId = ep.externalId,
            dataSource = ep.sourceType.name,
            osmWheelchairTag = ep.rawTags["wheelchair"],
            osmToiletAccessible = ep.hasAccessibleToilet,
            osmTactilePaving = ep.hasTactilePaving,
            osmDescription = ep.description,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        placeRepository.save(place)
        return UpsertResult.CREATED
    }

    private fun updateExistingPlace(existing: Place, ep: ExternalPlace): UpsertResult {
        // Only update OSM metadata if the external source has new info
        val wheelchairTag = ep.rawTags["wheelchair"]
        val hasNewAccessData = wheelchairTag != null && wheelchairTag != existing.osmWheelchairTag

        if (!hasNewAccessData && existing.osmId != null) {
            return UpsertResult.SKIPPED
        }

        val updatedLevel = if (hasNewAccessData) {
            ep.wheelchairAccess.toAccessLevel()
        } else {
            existing.accessibilityLevel
        }

        val geo = MalaysiaGeoUtils.lookup(ep.latitude, ep.longitude)
        val updated = existing.copy(
            osmId = existing.osmId ?: ep.externalId,
            dataSource = if (existing.dataSource == "SEED") ep.sourceType.name else existing.dataSource,
            osmWheelchairTag = wheelchairTag ?: existing.osmWheelchairTag,
            osmToiletAccessible = ep.hasAccessibleToilet ?: existing.osmToiletAccessible,
            osmTactilePaving = ep.hasTactilePaving ?: existing.osmTactilePaving,
            osmDescription = ep.description ?: existing.osmDescription,
            state = existing.state ?: ep.state ?: geo.state,
            accessibilityLevel = if (existing.reviewCount == 0) updatedLevel else existing.accessibilityLevel,
            updatedAt = Instant.now()
        )
        placeRepository.save(updated)
        return UpsertResult.UPDATED
    }

    private enum class UpsertResult { CREATED, UPDATED, SKIPPED }

    fun getAdaptersInfo(): AdaptersInfo {
        val placeAdapters = adapters.map {
            AdapterInfo(
                source = it.sourceType.name,
                displayName = it.sourceType.displayName,
                enabled = it.isEnabled,
                priority = it.sourceType.priority
            )
        }
        val routingAdapters = listOfNotNull(
            orsRoutingAdapter?.let {
                AdapterInfo(
                    source = "ORS",
                    displayName = "OpenRouteService Wheelchair Routing",
                    enabled = it.isEnabled,
                    priority = 85
                )
            }
        )
        return AdaptersInfo(placeAdapters = placeAdapters, routingAdapters = routingAdapters)
    }
}
