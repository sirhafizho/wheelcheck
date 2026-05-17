package com.wheelcheck.favorite

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import java.time.Instant
import java.util.*

data class FavoriteDto(
    val id: UUID,
    val placeId: UUID,
    val placeName: String?,
    val placeCategory: Category?,
    val accessibilityLevel: AccessLevel?,
    val createdAt: Instant
)

data class FavoriteToggleResponse(
    val favorited: Boolean,
    val totalFavorites: Long
)
