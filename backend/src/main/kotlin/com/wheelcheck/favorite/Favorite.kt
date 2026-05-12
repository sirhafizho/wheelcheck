package com.wheelcheck.favorite

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "favorites")
data class Favorite(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "place_id", nullable = false)
    val placeId: UUID,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
