package com.wheelcheck.comment

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.*

data class CommentDto(
    val id: UUID,
    val placeId: UUID,
    val userId: UUID?,
    val userName: String?,
    val parentId: UUID?,
    val content: String,
    val upvotes: Int,
    val downvotes: Int,
    val userVote: String?,
    val replies: List<CommentDto>,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateCommentRequest(
    val placeId: UUID,
    val parentId: UUID? = null,
    @field:NotBlank(message = "Content is required")
    @field:Size(max = 2000, message = "Content must be at most 2000 characters")
    val content: String
)

data class UpdateCommentRequest(
    @field:NotBlank(message = "Content is required")
    @field:Size(max = 2000, message = "Content must be at most 2000 characters")
    val content: String
)
