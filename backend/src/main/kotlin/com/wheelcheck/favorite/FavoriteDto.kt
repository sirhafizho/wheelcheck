package com.wheelcheck.favorite

import java.time.Instant
import java.util.*

data class FavoriteDto(
    val id: UUID,
    val placeId: UUID,
    val placeName: String?,
    val createdAt: Instant
)

data class FavoriteToggleResponse(
    val favorited: Boolean,
    val totalFavorites: Long
)
