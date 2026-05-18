package com.wheelcheck.place

import com.wheelcheck.admin.UpdatePlaceRequest
import com.wheelcheck.aggregation.LiveEnrichmentService
import com.wheelcheck.aggregation.MalaysiaGeoUtils
import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import com.wheelcheck.search.EmbeddingService
import com.wheelcheck.search.PlaceEmbeddingRepository
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
    private val liveEnrichmentService: LiveEnrichmentService? = null,
    private val embeddingService: EmbeddingService? = null,
    private val embeddingRepository: PlaceEmbeddingRepository? = null
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

        // Fire-and-forget background shadow enrichment (never blocks the response)
        // This seeds new OSM places into DB for future requests
        liveEnrichmentService?.triggerShadowEnrichAsync(request.latitude, request.longitude, request.radius)

        return dbDtos
    }

    @Transactional(readOnly = true)
    fun searchByName(name: String): List<PlaceDto> {
        return placeRepository.findByNameContainingIgnoreCaseLimited(expandAbbreviations(name)).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun semanticSearch(query: String, lat: Double?, lng: Double?, radius: Int = 5000, limit: Int = 20): List<PlaceDto> {
        val vector = embeddingService?.embed(query) ?: return searchByName(query)
        val vectorStr = embeddingService.toVectorString(vector)

        val results = if (lat != null && lng != null) {
            embeddingRepository?.semanticSearch(vectorStr, lat, lng, radius, limit) ?: emptyList()
        } else {
            embeddingRepository?.semanticSearchGlobal(vectorStr, limit) ?: emptyList()
        }

        if (results.isEmpty()) return searchByName(query)

        return results.mapNotNull { result -> placeRepository.findByIdOrNull(result.id)?.toDto() }
    }

    @Transactional(readOnly = true)
    fun searchWithFilters(
        query: String?,
        category: String?,
        city: String?,
        accessLevel: String?,
        pageable: Pageable
    ): Page<PlaceDto> {
        val q = query?.takeIf { it.isNotBlank() }?.let { expandAbbreviations(it) }
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

    /**
     * Expand Malaysian city/state abbreviations so searches like "KL" or "KB"
     * match "Kuala Lumpur" or "Kota Bharu".
     */
    private fun expandAbbreviations(input: String): String {
        val ABBREVIATIONS = mapOf(
            "\\bKL\\b" to "Kuala Lumpur",
            "\\bKB\\b" to "Kota Bharu",
            "\\bKK\\b" to "Kota Kinabalu",
            "\\bJB\\b" to "Johor Bahru",
            "\\bPG\\b" to "Penang",
            "\\bPNG\\b" to "Penang",
            "\\bPenang\\b" to "Penang",
            "\\bIPOH\\b" to "Ipoh",
            "\\bMKK\\b" to "Kota Bharu",
            "\\bKT\\b" to "Kuala Terengganu",
            "\\bALOR SETAR\\b" to "Alor Setar",
            "\\bAS\\b" to "Alor Setar",
            "\\bSBH\\b" to "Sabah",
            "\\bSRWK\\b" to "Sarawak",
            "\\bKCHI\\b" to "Kuching",
            "\\bMY\\b" to "Malaysia",
            "\\bPJ\\b" to "Petaling Jaya",
            "\\bSA\\b" to "Shah Alam",
            "\\bSUBJ\\b" to "Subang Jaya",
            "\\bKLIA\\b" to "KLIA",
            "\\bMV\\b" to "Mid Valley",
            "\\bPVMLL\\b" to "Pavilion",
            "\\bPAV\\b" to "Pavilion",
            "\\bNUEPD\\b" to "Nu Sentral"
        )

        var result = input.trim()
        for ((pattern, expansion) in ABBREVIATIONS) {
            result = result.replace(Regex(pattern, RegexOption.IGNORE_CASE), expansion)
        }
        return result
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

        // Community-submitted places start as PENDING (need admin approval)
        // OSM/seeded data stays APPROVED
        val status = if (userId != null) "PENDING" else "APPROVED"

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
            status = status,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val savedPlace = placeRepository.save(place)

        // Check for nearby duplicates (within 100m) and attach warning
        val nearby = placeRepository.findNearbyForDuplicateCheck(
            request.latitude, request.longitude, 100, savedPlace.id
        )
        val withWarning = if (nearby.isNotEmpty()) {
            val names = nearby.take(3).joinToString(", ") { it.name }
            placeRepository.save(savedPlace.copy(
                nearbyWarning = "Nearby places already exist within 100m: $names"
            ))
        } else savedPlace

        embeddingService?.let { svc ->
            embeddingRepository?.let { repo ->
                try {
                    val text = "${withWarning.name} ${withWarning.category.name.lowercase().replace('_', ' ')}"
                    val vector = svc.embed(text)
                    if (vector != null) repo.saveEmbedding(withWarning.id, svc.toVectorString(vector))
                } catch (_: Exception) { }
            }
        }
        return withWarning.toDto()
    }

    @Transactional
    fun approve(placeId: UUID): PlaceDto {
        val place = placeRepository.findByIdOrNull(placeId)
            ?: throw NoSuchElementException("Place not found: $placeId")
        return placeRepository.save(place.copy(status = "APPROVED", updatedAt = Instant.now())).toDto()
    }

    @Transactional
    fun reject(placeId: UUID, reason: String?): PlaceDto {
        val place = placeRepository.findByIdOrNull(placeId)
            ?: throw NoSuchElementException("Place not found: $placeId")
        return placeRepository.save(place.copy(
            status = "REJECTED",
            rejectionReason = reason,
            updatedAt = Instant.now()
        )).toDto()
    }

    @Transactional(readOnly = true)
    fun findPending(pageable: Pageable): org.springframework.data.domain.Page<PlaceDto> {
        return placeRepository.findPending(pageable).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun countPending(): Long = placeRepository.countPending()

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
        status = status,
        nearbyWarning = nearbyWarning,
        rejectionReason = rejectionReason,
        dataSource = dataSource,
        description = osmDescription,
        osmWheelchairTag = osmWheelchairTag,
        osmToiletAccessible = osmToiletAccessible,
        osmTactilePaving = osmTactilePaving,
        osmSurface = osmSurface,
        osmIncline = osmIncline,
        osmEntranceWheelchair = osmEntranceWheelchair,
        osmKerbTactile = osmKerbTactile,
        lastReportedAt = updatedAt
    )
}
