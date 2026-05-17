package com.wheelcheck.place

import com.wheelcheck.admin.UpdatePlaceRequest
import com.wheelcheck.aggregation.LiveEnrichmentService
import com.wheelcheck.aggregation.MalaysiaGeoUtils
import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import org.locationtech.jts.geom.Coordinate
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.PrecisionModel
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
class PlaceService(
    private val placeRepository: PlaceRepository,
    private val liveEnrichmentService: LiveEnrichmentService? = null
) {
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)

    @Transactional(readOnly = true)
    fun findById(id: UUID): PlaceDto? {
        return placeRepository.findByIdOrNull(id)?.toDto()
    }

    @Transactional(readOnly = true)
    fun findAll(): List<PlaceDto> {
        return placeRepository.findAll().map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun findAll(pageable: Pageable): Page<PlaceDto> {
        return placeRepository.findAll(pageable).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun count(): Long {
        return placeRepository.count()
    }

    @Transactional(readOnly = true)
    fun findNearby(request: NearbyPlacesRequest): List<PlaceDto> {
        val dbPlaces = if (request.category != null) {
            placeRepository.findNearbyByCategory(
                request.latitude,
                request.longitude,
                request.radius,
                request.category.name,
                request.limit
            )
        } else {
            placeRepository.findNearby(
                request.latitude,
                request.longitude,
                request.radius,
                request.limit
            )
        }
        val dbDtos = dbPlaces.map { it.toDto() }

        // Live enrichment: merge OSM results when requested
        if (request.enrichLive && liveEnrichmentService != null) {
            val livePlaces = liveEnrichmentService.fetchLivePlaces(
                request.latitude,
                request.longitude,
                request.radius
            )
            return liveEnrichmentService.mergeAndDedupe(dbDtos, livePlaces)
        }

        return dbDtos
    }

    @Transactional(readOnly = true)
    fun searchByName(name: String): List<PlaceDto> {
        return placeRepository.findByNameContainingIgnoreCaseLimited(name).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun searchWithFilters(
        query: String?,
        category: String?,
        city: String?,
        accessLevel: String?,
        pageable: Pageable
    ): Page<PlaceDto> {
        val q = query?.takeIf { it.isNotBlank() }
        val cat = category?.takeIf { it.isNotBlank() }?.let {
            try { Category.valueOf(it.uppercase()) } catch (_: Exception) { null }
        }
        val access = accessLevel?.takeIf { it.isNotBlank() }?.let {
            try { AccessLevel.valueOf(it.uppercase()) } catch (_: Exception) { null }
        }

        // Native queries have their own ORDER BY, so strip sort from pageable
        val unsorted = PageRequest.of(pageable.pageNumber, pageable.pageSize)

        val result: Page<Place> = when {
            q != null && cat != null -> placeRepository.searchByTextAndCategory(q, cat.name, unsorted)
            q != null -> placeRepository.searchByText(q, unsorted)
            cat != null -> placeRepository.findByCategoryPaged(cat, pageable)
            access != null -> placeRepository.findByAccessLevelPaged(access, pageable)
            else -> placeRepository.findAll(pageable)
        }

        return result.map(java.util.function.Function { place: Place -> place.toDto() })
    }

    @Transactional(readOnly = true)
    fun findByOwner(userId: UUID): List<PlaceDto> {
        return placeRepository.findByCreatedBy(userId).map { it.toDto() }
    }

    @Transactional
    fun create(request: CreatePlaceRequest, userId: UUID? = null): PlaceDto {
        val point = geometryFactory.createPoint(
            Coordinate(request.longitude, request.latitude)
        )

        val geo = MalaysiaGeoUtils.lookup(request.latitude, request.longitude)
        val place = Place(
            name = request.name,
            nameMs = request.nameMs,
            location = point,
            address = request.address,
            city = request.city.ifBlank { geo.city },
            state = geo.state,
            category = request.category,
            accessibilityLevel = AccessLevel.UNKNOWN,
            reviewCount = 0,
            createdBy = userId,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        return placeRepository.save(place).toDto()
    }

    @Transactional
    fun update(placeId: UUID, request: UpdatePlaceRequest): PlaceDto {
        val place = placeRepository.findByIdOrNull(placeId)
            ?: throw NoSuchElementException("Place not found: $placeId")

        val geo = MalaysiaGeoUtils.lookup(request.latitude, request.longitude)
        val updated = place.copy(
            name = request.name,
            nameMs = request.nameMs,
            location = geometryFactory.createPoint(Coordinate(request.longitude, request.latitude)),
            address = request.address,
            city = request.city.ifBlank { geo.city },
            state = geo.state,
            category = request.category,
            accessibilityLevel = request.accessibilityLevel,
            updatedAt = Instant.now()
        )

        return placeRepository.save(updated).toDto()
    }

    @Transactional
    fun delete(placeId: UUID) {
        if (!placeRepository.existsById(placeId)) {
            throw NoSuchElementException("Place not found: $placeId")
        }
        placeRepository.deleteById(placeId)
    }

    @Transactional
    fun updateAccessibilityLevel(placeId: UUID, level: AccessLevel) {
        val place = placeRepository.findByIdOrNull(placeId) ?: return
        val updated = place.copy(
            accessibilityLevel = level,
            updatedAt = Instant.now()
        )
        placeRepository.save(updated)
    }

    @Transactional
    fun incrementReviewCount(placeId: UUID) {
        val place = placeRepository.findByIdOrNull(placeId) ?: return
        val updated = place.copy(
            reviewCount = place.reviewCount + 1,
            updatedAt = Instant.now()
        )
        placeRepository.save(updated)
    }

    private fun Place.toDto() = PlaceDto(
        id = id,
        name = name,
        nameMs = nameMs,
        latitude = location.y,
        longitude = location.x,
        address = address,
        city = city,
        state = state,
        category = category,
        accessibilityLevel = accessibilityLevel,
        reviewCount = reviewCount,
        createdAt = createdAt,
        createdBy = createdBy,
        dataSource = dataSource,
        description = osmDescription,
        osmWheelchairTag = osmWheelchairTag,
        osmToiletAccessible = osmToiletAccessible,
        osmTactilePaving = osmTactilePaving,
        lastReportedAt = updatedAt
    )
}
