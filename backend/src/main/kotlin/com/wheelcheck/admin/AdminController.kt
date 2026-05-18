package com.wheelcheck.admin

import com.wheelcheck.place.PlaceDto
import com.wheelcheck.place.PlaceService
import com.wheelcheck.review.AccessibilityReview
import com.wheelcheck.review.ReviewDto
import com.wheelcheck.review.ReviewRepository
import com.wheelcheck.review.ReviewService
import com.wheelcheck.user.User
import com.wheelcheck.user.UserRepository
import jakarta.validation.Valid
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
class AdminController(
    private val placeService: PlaceService,
    private val reviewRepository: ReviewRepository,
    private val userRepository: UserRepository,
    private val reviewService: ReviewService
) {
    @GetMapping("/places")
    fun getAllPlaces(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) category: String?,
        @RequestParam(required = false) city: String?,
        @RequestParam(required = false) accessLevel: String?,
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC)
        pageable: Pageable
    ): ResponseEntity<Page<PlaceDto>> {
        val hasFilters = !search.isNullOrBlank() || !category.isNullOrBlank() ||
            !city.isNullOrBlank() || !accessLevel.isNullOrBlank()

        return if (hasFilters) {
            ResponseEntity.ok(placeService.searchWithFilters(search, category, city, accessLevel, pageable))
        } else {
            ResponseEntity.ok(placeService.findAll(pageable))
        }
    }

    @PutMapping("/places/{id}")
    fun updatePlace(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdatePlaceRequest
    ): ResponseEntity<PlaceDto> {
        return ResponseEntity.ok(placeService.update(id, request))
    }

    @DeleteMapping("/places/{id}")
    fun deletePlace(@PathVariable id: UUID): ResponseEntity<Void> {
        placeService.delete(id)
        return ResponseEntity.noContent().build()
    }

    /** Get all PENDING places awaiting approval */
    @GetMapping("/places/pending")
    fun getPendingPlaces(
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC)
        pageable: Pageable
    ): ResponseEntity<Page<PlaceDto>> {
        return ResponseEntity.ok(placeService.findPending(pageable))
    }

    /** Count of PENDING places — for admin badge */
    @GetMapping("/places/pending/count")
    fun getPendingCount(): ResponseEntity<Map<String, Long>> {
        return ResponseEntity.ok(mapOf("count" to placeService.countPending()))
    }

    @PostMapping("/places/{id}/approve")
    fun approvePlace(@PathVariable id: UUID): ResponseEntity<PlaceDto> {
        return ResponseEntity.ok(placeService.approve(id))
    }

    @PostMapping("/places/{id}/reject")
    fun rejectPlace(
        @PathVariable id: UUID,
        @RequestBody(required = false) body: Map<String, String>?
    ): ResponseEntity<PlaceDto> {
        return ResponseEntity.ok(placeService.reject(id, body?.get("reason")))
    }

    @GetMapping("/reviews")
    fun getAllReviews(
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC)
        pageable: Pageable
    ): ResponseEntity<Page<ReviewDto>> {
        return ResponseEntity.ok(reviewRepository.findAll(pageable).map { it.toDto() })
    }

    @DeleteMapping("/reviews/{id}")
    fun deleteReview(@PathVariable id: UUID): ResponseEntity<Void> {
        reviewService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/users")
    fun getAllUsers(
        @PageableDefault(size = 20, sort = ["createdAt"], direction = Sort.Direction.DESC)
        pageable: Pageable
    ): ResponseEntity<Page<AdminUserDto>> {
        return ResponseEntity.ok(userRepository.findAll(pageable).map { it.toAdminDto() })
    }

    @PutMapping("/users/{id}/role")
    fun updateUserRole(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateUserRoleRequest
    ): ResponseEntity<AdminUserDto> {
        val user = userRepository.findById(id).orElseThrow {
            NoSuchElementException("User not found: $id")
        }
        val normalizedRole = request.role.trim().uppercase()
        require(normalizedRole in setOf("USER", "ADMIN")) {
            "Invalid role: ${request.role}"
        }

        val updated = userRepository.save(
            user.copy(
                role = normalizedRole,
                updatedAt = Instant.now()
            )
        )
        return ResponseEntity.ok(updated.toAdminDto())
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!userRepository.existsById(id)) {
            throw NoSuchElementException("User not found: $id")
        }
        userRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/stats")
    fun getDashboardStats(): ResponseEntity<AdminStatsDto> {
        val recentReviews = reviewRepository.findAll(
            PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).content.map { it.toDto() }

        return ResponseEntity.ok(
            AdminStatsDto(
                totalPlaces = placeService.count(),
                totalReviews = reviewRepository.count(),
                totalUsers = userRepository.count(),
                pendingPlaces = placeService.countPending(),
                recentReviews = recentReviews
            )
        )
    }

    private fun AccessibilityReview.toDto() = ReviewDto(
        id = id,
        placeId = place.id,
        placeName = place.name,
        userId = userId,
        userName = null,
        entrance = entrance,
        toilet = toilet,
        parking = parking,
        internalNav = internalNav,
        notes = notes,
        photoUrls = photoUrls,
        isVerified = isVerified,
        createdAt = createdAt
    )

    private fun User.toAdminDto() = AdminUserDto(
        id = id,
        email = email,
        name = name,
        isVerified = isVerified,
        role = role,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}
