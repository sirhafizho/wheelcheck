package com.wheelcheck.place

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.Instant
import java.util.*

data class PlaceDto(
    val id: UUID,
    val name: String,
    val nameMs: String?,
    val latitude: Double,
    val longitude: Double,
    val address: String? = null,
    val city: String,
    val state: String? = null,
    val category: Category,
    val accessibilityLevel: AccessLevel,
    val reviewCount: Int,
    val createdAt: Instant,
    val createdBy: UUID? = null,
    val distance: Double? = null,
    val dataSource: String? = null,
    val description: String? = null,
    val osmWheelchairTag: String? = null,
    val osmToiletAccessible: Boolean? = null,
    val osmTactilePaving: Boolean? = null,
    val osmSurface: String? = null,
    val osmIncline: String? = null,
    val osmEntranceWheelchair: String? = null,
    val osmKerbTactile: Boolean? = null,
    val lastReportedAt: Instant? = null,
    val isLive: Boolean = false
)

data class CreatePlaceRequest(
    @field:NotBlank(message = "Name is required")
    val name: String,
    val nameMs: String? = null,
    @field:NotNull(message = "Latitude is required")
    val latitude: Double,
    @field:NotNull(message = "Longitude is required")
    val longitude: Double,
    val address: String? = null,
    val city: String = "Kuala Lumpur",
    @field:NotNull(message = "Category is required")
    val category: Category
)

data class NearbyPlacesRequest(
    @field:NotNull(message = "Latitude is required")
    val latitude: Double,
    @field:NotNull(message = "Longitude is required")
    val longitude: Double,
    val radius: Int = 5000,
    val limit: Int = 50,
    val category: Category? = null,
    val enrichLive: Boolean = false
)
