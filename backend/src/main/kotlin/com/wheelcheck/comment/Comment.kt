package com.wheelcheck.comment

import com.wheelcheck.place.Place
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "comments")
data class Comment(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    val place: Place,

    @Column(name = "user_id")
    val userId: UUID? = null,

    @Column(name = "parent_id")
    val parentId: UUID? = null,

    @Column(columnDefinition = "TEXT", nullable = false)
    val content: String,

    @Column(nullable = false)
    val upvotes: Int = 0,

    @Column(nullable = false)
    val downvotes: Int = 0,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
