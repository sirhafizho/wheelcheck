package com.wheelcheck.review

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.place.PlaceRepository
import com.wheelcheck.user.UserRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class ReviewService(
    private val reviewRepository: ReviewRepository,
    private val placeRepository: PlaceRepository,
    private val userRepository: UserRepository
) {

    private val userNameCache = mutableMapOf<UUID, String>()

    @Transactional(readOnly = true)
    fun findById(id: UUID): ReviewDto? {
        return reviewRepository.findByIdOrNull(id)?.toDto()
    }

    @Transactional(readOnly = true)
    fun findByPlaceId(placeId: UUID): List<ReviewDto> {
        return reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId).map { it.toDto() }
    }

    @Transactional(readOnly = true)
    fun findByUserId(userId: UUID): List<ReviewDto> {
        return reviewRepository.findByUserId(userId).map { it.toDto() }
    }

    @Transactional
    fun create(request: CreateReviewRequest, userId: UUID? = null): ReviewDto {
        val place = placeRepository.findByIdOrNull(request.placeId)
            ?: throw IllegalArgumentException("Place not found: ${request.placeId}")

        val reviewNotes = request.notes ?: request.comment

        val review = AccessibilityReview(
            place = place,
            userId = userId,
            entrance = request.entrance,
            toilet = request.toilet,
            parking = request.parking,
            internalNav = request.internalNav,
            notes = reviewNotes,
            isVerified = false
        )

        val saved = reviewRepository.save(review)
        updatePlaceAccessibility(request.placeId)
        return saved.toDto()
    }

    @Transactional
    fun update(reviewId: UUID, request: UpdateReviewRequest, userId: UUID?): ReviewDto {
        val review = reviewRepository.findByIdOrNull(reviewId)
            ?: throw NoSuchElementException("Review not found: $reviewId")
        if (userId != null && review.userId != userId) {
            throw IllegalArgumentException("Not authorized to modify this review")
        }
        val updated = review.copy(
            entrance = request.entrance,
            toilet = request.toilet,
            parking = request.parking,
            internalNav = request.internalNav,
            notes = request.notes
        )
        val saved = reviewRepository.save(updated)
        updatePlaceAccessibility(review.place.id)
        return saved.toDto()
    }

    @Transactional
    fun addPhotos(reviewId: UUID, photoUrls: List<String>, userId: UUID?): ReviewDto {
        val review = reviewRepository.findByIdOrNull(reviewId)
            ?: throw NoSuchElementException("Review not found: $reviewId")
        if (userId != null && review.userId != userId) {
            throw IllegalArgumentException("Not authorized to modify this review")
        }
        val updated = review.copy(photoUrls = review.photoUrls + photoUrls)
        return reviewRepository.save(updated).toDto()
    }

    @Transactional
    fun delete(reviewId: UUID) {
        val review = reviewRepository.findByIdOrNull(reviewId)
            ?: throw NoSuchElementException("Review not found: $reviewId")
        val placeId = review.place.id
        reviewRepository.delete(review)
        updatePlaceAccessibility(placeId)
    }

    private fun updatePlaceAccessibility(placeId: UUID) {
        val reviews = reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId)
        val place = placeRepository.findByIdOrNull(placeId) ?: return

        if (reviews.isEmpty()) {
            placeRepository.save(
                place.copy(
                    reviewCount = 0,
                    accessibilityLevel = AccessLevel.UNKNOWN,
                    updatedAt = java.time.Instant.now()
                )
            )
            return
        }

        // Calculate overall accessibility based on latest reviews
        val overallLevel = calculateOverallAccessibility(reviews.take(5))

        val updated = place.copy(
            reviewCount = reviews.size,
            accessibilityLevel = overallLevel,
            updatedAt = java.time.Instant.now()
        )

        placeRepository.save(updated)
    }

    /**
     * Calculate overall accessibility level using a point-based scoring system.
     * 
     * For each review dimension (entrance, toilet, parking, internal):
     *   FULL = 3 points
     *   PARTIAL = 2 points
     *   NOT_ACCESSIBLE = 1 point
     *   UNKNOWN = excluded from calculation
     *
     * Overall score = average of all non-UNKNOWN dimensions across recent reviews.
     *
     * Verdict:
     *   score >= 2.5 → FULL (Accessible)
     *   score >= 1.5 → PARTIAL (Partially Accessible)
     *   score < 1.5  → NOT_ACCESSIBLE
     *   no data      → UNKNOWN
     */
    internal fun calculateOverallAccessibility(reviews: List<AccessibilityReview>): AccessLevel {
        if (reviews.isEmpty()) return AccessLevel.UNKNOWN

        val scores = reviews.flatMap { review ->
            listOf(review.entrance, review.toilet, review.parking, review.internalNav)
        }.filter { it != AccessLevel.UNKNOWN }

        if (scores.isEmpty()) return AccessLevel.UNKNOWN

        val averageScore = scores.map { level ->
            when (level) {
                AccessLevel.FULL -> 3.0
                AccessLevel.PARTIAL -> 2.0
                AccessLevel.NOT_ACCESSIBLE -> 1.0
                AccessLevel.UNKNOWN -> 0.0 // won't happen due to filter
            }
        }.average()

        return when {
            averageScore >= 2.5 -> AccessLevel.FULL
            averageScore >= 1.5 -> AccessLevel.PARTIAL
            else -> AccessLevel.NOT_ACCESSIBLE
        }
    }

    private fun lookupUserName(userId: UUID?): String? {
        if (userId == null) return null
        return userNameCache.getOrPut(userId) {
            userRepository.findById(userId).map { it.name }.orElse("Unknown")
        }
    }

    private fun AccessibilityReview.toDto() = ReviewDto(
        id = id,
        placeId = place.id,
        placeName = place.name,
        userId = userId,
        userName = lookupUserName(userId),
        entrance = entrance,
        toilet = toilet,
        parking = parking,
        internalNav = internalNav,
        notes = notes,
        photoUrls = photoUrls,
        isVerified = isVerified,
        createdAt = createdAt
    )
}
