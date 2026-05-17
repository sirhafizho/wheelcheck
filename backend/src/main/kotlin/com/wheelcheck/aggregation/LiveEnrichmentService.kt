package com.wheelcheck.aggregation

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceDto
import com.wheelcheck.place.PlaceRepository
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import kotlin.math.cos

/**
 * Live enrichment service that queries external data sources in parallel with DB
 * and merges results. Uses a simple TTL cache to avoid hammering external APIs.
 * New discoveries are asynchronously saved to DB (shadow enrichment).
 */
@Service
class LiveEnrichmentService(
    private val osmAdapter: OsmOverpassAdapter,
    private val placeRepository: PlaceRepository
) {
    private val logger = LoggerFactory.getLogger(LiveEnrichmentService::class.java)
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)

    // Simple cache: grid cell key -> (timestamp, results)
    private val cache = ConcurrentHashMap<String, CachedResult>()
    private val cacheTtlMs = TimeUnit.MINUTES.toMillis(10)
    private val gridSizeDegrees = 0.02 // ~2km grid cells

    data class CachedResult(
        val timestamp: Long,
        val places: List<ExternalPlace>
    )

    /**
     * Fetch live places from OSM for the given area.
     * Results are cached per grid cell to avoid repeated API calls.
     */
    fun fetchLivePlaces(lat: Double, lng: Double, radiusMeters: Int): List<PlaceDto> {
        val bbox = radiusToBbox(lat, lng, radiusMeters)
        val cacheKey = bboxToGridKey(bbox)

        // Check cache
        val cached = cache[cacheKey]
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < cacheTtlMs) {
            logger.debug("Live enrichment cache hit for grid $cacheKey (${cached.places.size} places)")
            return cached.places.map { it.toDto() }
        }

        return try {
            val externalPlaces = osmAdapter.fetchPlaces(bbox)
            cache[cacheKey] = CachedResult(System.currentTimeMillis(), externalPlaces)
            logger.info("Live enrichment: fetched ${externalPlaces.size} places from OSM for grid $cacheKey")

            // Shadow-save new discoveries asynchronously
            shadowSaveAsync(externalPlaces)

            externalPlaces.map { it.toDto() }
        } catch (e: Exception) {
            logger.warn("Live enrichment failed: ${e.message}")
            emptyList()
        }
    }

    /**
     * Merge DB results with live results, deduplicating by externalId or name+proximity.
     */
    fun mergeAndDedupe(dbPlaces: List<PlaceDto>, livePlaces: List<PlaceDto>): List<PlaceDto> {
        if (livePlaces.isEmpty()) return dbPlaces

        val merged = dbPlaces.toMutableList()
        val dbNames = dbPlaces.map { it.name.lowercase().replace(" ", "") }.toSet()
        val dbCoords = dbPlaces.map { Pair(it.latitude, it.longitude) }

        for (livePlace in livePlaces) {
            val normalizedName = livePlace.name.lowercase().replace(" ", "")

            // Skip if name already exists in DB results
            if (normalizedName in dbNames) continue

            // Skip if very close to an existing DB result (within 50m)
            val tooClose = dbCoords.any { (lat, lng) ->
                haversineDistance(lat, lng, livePlace.latitude, livePlace.longitude) < 50
            }
            if (tooClose) continue

            merged.add(livePlace)
        }

        return merged
    }

    /**
     * Asynchronously save new discoveries to DB.
     */
    @Async
    fun shadowSaveAsync(externalPlaces: List<ExternalPlace>) {
        var saved = 0
        var skipped = 0

        for (ep in externalPlaces) {
            try {
                // Check if already in DB by externalId
                if (placeRepository.findByOsmId(ep.externalId) != null) {
                    skipped++
                    continue
                }

                // Check by proximity (within 50m) + name match
                val nearby = placeRepository.findNearby(ep.latitude, ep.longitude, 50, 5)
                val nameMatch = nearby.any { it.name.equals(ep.name, ignoreCase = true) }
                if (nameMatch) {
                    skipped++
                    continue
                }

                // Save new place
                val point = geometryFactory.createPoint(Coordinate(ep.longitude, ep.latitude))
                val geo = MalaysiaGeoUtils.lookup(ep.latitude, ep.longitude)

                val place = Place(
                    name = ep.name,
                    nameMs = ep.nameMs,
                    location = point,
                    address = ep.address,
                    city = ep.city.ifBlank { geo.city },
                    state = ep.state ?: geo.state,
                    category = ep.category,
                    accessibilityLevel = ep.wheelchairAccess.toAccessLevel(),
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
                saved++
            } catch (e: Exception) {
                logger.warn("Shadow save failed for ${ep.name}: ${e.message}")
            }
        }

        if (saved > 0) {
            logger.info("Shadow enrichment: saved $saved new places, skipped $skipped duplicates")
        }
    }

    /**
     * Convert lat/lng/radius to a BoundingBox.
     */
    private fun radiusToBbox(lat: Double, lng: Double, radiusMeters: Int): BoundingBox {
        val latDelta = radiusMeters / 111_320.0
        val lngDelta = radiusMeters / (111_320.0 * cos(Math.toRadians(lat)))
        return BoundingBox(
            south = lat - latDelta,
            west = lng - lngDelta,
            north = lat + latDelta,
            east = lng + lngDelta
        )
    }

    /**
     * Convert a bbox to a grid cell key for caching.
     */
    private fun bboxToGridKey(bbox: BoundingBox): String {
        val gridLat = (bbox.south / gridSizeDegrees).toInt()
        val gridLng = (bbox.west / gridSizeDegrees).toInt()
        val gridLatEnd = (bbox.north / gridSizeDegrees).toInt()
        val gridLngEnd = (bbox.east / gridSizeDegrees).toInt()
        return "$gridLat,$gridLng-$gridLatEnd,$gridLngEnd"
    }

    /**
     * Haversine distance in meters between two coordinates.
     */
    private fun haversineDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val R = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    private fun ExternalPlace.toDto() = PlaceDto(
        id = java.util.UUID.nameUUIDFromBytes(externalId.toByteArray()),
        name = name,
        nameMs = nameMs,
        latitude = latitude,
        longitude = longitude,
        address = address,
        city = city,
        state = state,
        category = category,
        accessibilityLevel = wheelchairAccess.toAccessLevel(),
        reviewCount = 0,
        createdAt = Instant.now(),
        isLive = true,
        dataSource = sourceType.name,
        description = description,
        osmWheelchairTag = rawTags["wheelchair"],
        osmToiletAccessible = hasAccessibleToilet,
        osmTactilePaving = hasTactilePaving
    )

    /**
     * Evict stale cache entries (called periodically or on demand).
     */
    fun evictStaleCache() {
        val now = System.currentTimeMillis()
        cache.entries.removeIf { (now - it.value.timestamp) > cacheTtlMs }
    }
}
