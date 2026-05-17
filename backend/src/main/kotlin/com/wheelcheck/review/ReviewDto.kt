package com.wheelcheck.review

import com.wheelcheck.common.AccessLevel
import jakarta.validation.constraints.NotNull
import java.time.Instant
import java.util.*

data class ReviewDto(
    val id: UUID,
    val placeId: UUID,
    val placeName: String? = null,
    val userId: UUID?,
    val userName: String?,
    val entrance: AccessLevel,
    val toilet: AccessLevel,
    val parking: AccessLevel,
    val internalNav: AccessLevel,
    val notes: String?,
    val photoUrls: List<String>,
    val isVerified: Boolean,
    val createdAt: Instant
)

data class CreateReviewRequest(
    @field:NotNull(message = "Place ID is required")
    val placeId: UUID,
    @field:NotNull(message = "Entrance accessibility is required")
    val entrance: AccessLevel,
    @field:NotNull(message = "Toilet accessibility is required")
    val toilet: AccessLevel,
    @field:NotNull(message = "Parking accessibility is required")
    val parking: AccessLevel,
    @field:NotNull(message = "Internal navigation accessibility is required")
    val internalNav: AccessLevel,
    val notes: String?,
    val comment: String? = null
)
