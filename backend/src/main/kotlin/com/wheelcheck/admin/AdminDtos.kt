package com.wheelcheck.admin

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import com.wheelcheck.review.ReviewDto
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.Instant
import java.util.UUID

data class AdminStatsDto(
    val totalPlaces: Long,
    val totalReviews: Long,
    val totalUsers: Long,
    val recentReviews: List<ReviewDto>
)

data class UpdatePlaceRequest(
    @field:NotBlank(message = "Name is required")
    val name: String,
    val nameMs: String? = null,
    @field:NotNull(message = "Latitude is required")
    val latitude: Double,
    @field:NotNull(message = "Longitude is required")
    val longitude: Double,
    val address: String? = null,
    @field:NotBlank(message = "City is required")
    val city: String,
    @field:NotNull(message = "Category is required")
    val category: Category,
    @field:NotNull(message = "Accessibility level is required")
    val accessibilityLevel: AccessLevel
)

data class UpdateUserRoleRequest(
    @field:NotBlank(message = "Role is required")
    val role: String
)

data class AdminUserDto(
    val id: UUID,
    val email: String,
    val name: String,
    val isVerified: Boolean,
    val role: String,
    val createdAt: Instant,
    val updatedAt: Instant
)
