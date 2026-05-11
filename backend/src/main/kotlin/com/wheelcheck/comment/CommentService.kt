package com.wheelcheck.comment

import com.wheelcheck.place.PlaceRepository
import com.wheelcheck.user.UserRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.*

@Service
class CommentService(
    private val commentRepository: CommentRepository,
    private val placeRepository: PlaceRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getCommentsForPlace(placeId: UUID): List<CommentDto> {
        val topLevelComments = commentRepository.findByPlaceIdAndParentIdIsNullOrderByCreatedAtDesc(placeId)
        val repliesByParentId = topLevelComments.associate { comment ->
            comment.id to commentRepository.findByParentIdOrderByCreatedAtAsc(comment.id)
        }
        val allComments = topLevelComments + repliesByParentId.values.flatten()
        val userNames = getUserNames(allComments)

        return topLevelComments.map { comment ->
            toDto(comment, userNames, repliesByParentId)
        }
    }

    @Transactional
    fun createComment(request: CreateCommentRequest, userId: UUID): CommentDto {
        val place = placeRepository.findByIdOrNull(request.placeId)
            ?: throw IllegalArgumentException("Place not found: ${request.placeId}")

        val parentComment = request.parentId?.let { parentId ->
            commentRepository.findByIdOrNull(parentId)
                ?: throw IllegalArgumentException("Parent comment not found: $parentId")
        }

        if (parentComment != null && parentComment.place.id != request.placeId) {
            throw IllegalArgumentException("Parent comment does not belong to place: ${request.placeId}")
        }

        val saved = commentRepository.save(
            Comment(
                place = place,
                userId = userId,
                parentId = parentComment?.id,
                content = request.content.trim(),
                createdAt = Instant.now(),
                updatedAt = Instant.now()
            )
        )

        return toDto(saved, getUserNames(listOf(saved)), emptyMap())
    }

    @Transactional
    fun updateComment(id: UUID, request: UpdateCommentRequest, userId: UUID): CommentDto {
        val comment = commentRepository.findByIdOrNull(id)
            ?: throw NoSuchElementException("Comment not found: $id")

        if (comment.userId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You can only edit your own comment")
        }

        val updated = commentRepository.save(
            comment.copy(
                content = request.content.trim(),
                updatedAt = Instant.now()
            )
        )

        return toDto(updated, getUserNames(listOf(updated)), emptyMap())
    }

    @Transactional
    fun deleteComment(id: UUID, userId: UUID) {
        val comment = commentRepository.findByIdOrNull(id)
            ?: throw NoSuchElementException("Comment not found: $id")
        val user = userRepository.findByIdOrNull(userId)
            ?: throw NoSuchElementException("User not found: $userId")

        val isAdmin = user.role.uppercase() == "ADMIN"
        if (comment.userId != userId && !isAdmin) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own comment")
        }

        commentRepository.delete(comment)
    }

    @Transactional
    fun voteComment(id: UUID, userId: UUID, isUpvote: Boolean): CommentDto {
        if (!userRepository.existsById(userId)) {
            throw NoSuchElementException("User not found: $userId")
        }

        val comment = commentRepository.findByIdOrNull(id)
            ?: throw NoSuchElementException("Comment not found: $id")

        val updated = commentRepository.save(
            comment.copy(
                upvotes = comment.upvotes + if (isUpvote) 1 else 0,
                downvotes = comment.downvotes + if (isUpvote) 0 else 1,
                updatedAt = Instant.now()
            )
        )

        return toDto(updated, getUserNames(listOf(updated)), emptyMap())
    }

    private fun toDto(
        comment: Comment,
        userNames: Map<UUID, String>,
        repliesByParentId: Map<UUID, List<Comment>>
    ): CommentDto {
        val replies = repliesByParentId[comment.id].orEmpty().map { reply ->
            toDto(reply, userNames, emptyMap())
        }

        return CommentDto(
            id = comment.id,
            placeId = comment.place.id,
            userId = comment.userId,
            userName = comment.userId?.let(userNames::get),
            parentId = comment.parentId,
            content = comment.content,
            upvotes = comment.upvotes,
            downvotes = comment.downvotes,
            replies = replies,
            createdAt = comment.createdAt,
            updatedAt = comment.updatedAt
        )
    }

    private fun getUserNames(comments: List<Comment>): Map<UUID, String> {
        val userIds = comments.mapNotNull { it.userId }.distinct()
        if (userIds.isEmpty()) {
            return emptyMap()
        }

        return userRepository.findAllById(userIds).associate { user ->
            user.id to user.name
        }
    }
}
