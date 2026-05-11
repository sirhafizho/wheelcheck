package com.wheelcheck.comment

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "comment_votes")
data class CommentVote(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "comment_id", nullable = false)
    val commentId: UUID,

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "vote_type", nullable = false)
    val voteType: String,

    @Column(name = "created_at")
    val createdAt: Instant = Instant.now()
)
