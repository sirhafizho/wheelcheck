package com.wheelcheck.place

import com.wheelcheck.review.ReviewDto
import com.wheelcheck.review.ReviewService
import com.wheelcheck.user.UserRepository
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/places")
class PlaceController(
    private val placeService: PlaceService,
    private val reviewService: ReviewService,
    private val userRepository: UserRepository
) {
    
    @GetMapping
    fun getAllPlaces(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Page<PlaceDto>> {
        val pageable = PageRequest.of(page, size.coerceAtMost(100))
        return ResponseEntity.ok(placeService.findAll(pageable))
    }
    
    @GetMapping("/{id}")
    fun getPlaceById(@PathVariable id: UUID): ResponseEntity<PlaceDto> {
        val place = placeService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(place)
    }

    @GetMapping("/{id}/reports")
    fun getPlaceReports(@PathVariable id: UUID): ResponseEntity<List<ReviewDto>> {
        val reviews = reviewService.findByPlaceId(id)
        return ResponseEntity.ok(reviews)
    }
    
    @PostMapping("/nearby")
    fun findNearbyPlaces(
        @Valid @RequestBody request: NearbyPlacesRequest
    ): ResponseEntity<List<PlaceDto>> {
        val places = placeService.findNearby(request)
        return ResponseEntity.ok(places)
    }
    
    @GetMapping("/search")
    fun searchPlaces(@RequestParam name: String): ResponseEntity<List<PlaceDto>> {
        val places = placeService.searchByName(name)
        return ResponseEntity.ok(places)
    }
    
    @PostMapping
    fun createPlace(
        @Valid @RequestBody request: CreatePlaceRequest,
        authentication: Authentication?
    ): ResponseEntity<PlaceDto> {
        val userId = authentication?.principal as? UUID
        val place = placeService.create(request, userId)
        return ResponseEntity.status(HttpStatus.CREATED).body(place)
    }

    @PutMapping("/{id}")
    fun updatePlace(
        @PathVariable id: UUID,
        @Valid @RequestBody request: CreatePlaceRequest,
        authentication: Authentication?
    ): ResponseEntity<PlaceDto> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val existing = placeService.findById(id)
            ?: return ResponseEntity.notFound().build()

        if (!isOwnerOrAdmin(existing, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        val updated = placeService.update(id, com.wheelcheck.admin.UpdatePlaceRequest(
            name = request.name,
            nameMs = request.nameMs,
            latitude = request.latitude,
            longitude = request.longitude,
            address = request.address,
            city = request.city,
            category = request.category,
            accessibilityLevel = existing.accessibilityLevel
        ))
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/{id}")
    fun deletePlace(
        @PathVariable id: UUID,
        authentication: Authentication?
    ): ResponseEntity<Void> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val existing = placeService.findById(id)
            ?: return ResponseEntity.notFound().build()

        if (!isOwnerOrAdmin(existing, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }

        placeService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/my")
    fun getMyPlaces(authentication: Authentication?): ResponseEntity<List<PlaceDto>> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return ResponseEntity.ok(placeService.findByOwner(userId))
    }

    private fun isOwnerOrAdmin(place: PlaceDto, userId: UUID): Boolean {
        if (place.createdBy == userId) return true
        val user = userRepository.findByIdOrNull(userId) ?: return false
        return user.role.uppercase() == "ADMIN"
    }
}
