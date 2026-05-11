package com.wheelcheck.user

import java.util.UUID

data class UserProfileDto(
    val id: UUID,
    val name: String,
    val email: String,
    val reviewCount: Long,
    val createdAt: String
)

data class UserStatsDto(
    val reviewCount: Long,
    val placesAdded: Long
)
