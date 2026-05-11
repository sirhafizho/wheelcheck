package com.wheelcheck.comment

import com.wheelcheck.place.PlaceRepository
import com.wheelcheck.user.UserRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@Service
class CommentService(
    private val commentRepository: CommentRepository,
    private val commentVoteRepository: CommentVoteRepository,
    private val placeRepository: PlaceRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getCommentsForPlace(placeId: UUID, userId: UUID? = null): List<CommentDto> {
        val topLevelComments = commentRepository.findByPlaceIdAndParentIdIsNullOrderByCreatedAtDesc(placeId)
        val repliesByParentId = topLevelComments.associate { comment ->
            comment.id to commentRepository.findByParentIdOrderByCreatedAtAsc(comment.id)
        }
        val allComments = topLevelComments + repliesByParentId.values.flatten()
        val userNames = getUserNames(allComments)
        val userVotes = getUserVotes(allComments, userId)

        return topLevelComments.map { comment ->
            toDto(comment, userNames, repliesByParentId, userVotes)
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

        return toDto(saved, getUserNames(listOf(saved)), emptyMap(), emptyMap())
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

        return toDto(updated, getUserNames(listOf(updated)), emptyMap(), emptyMap())
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

        val existingVote = commentVoteRepository.findByCommentIdAndUserId(id, userId)
        val newVoteType = if (isUpvote) "UP" else "DOWN"

        val currentUserVote = when {
            existingVote != null && existingVote.voteType == newVoteType -> {
                commentVoteRepository.delete(existingVote)
                null
            }

            existingVote != null -> {
                commentVoteRepository.save(existingVote.copy(voteType = newVoteType))
                newVoteType
            }

            else -> {
                commentVoteRepository.save(CommentVote(commentId = id, userId = userId, voteType = newVoteType))
                newVoteType
            }
        }

        val updated = comment.copy(
            upvotes = commentVoteRepository.countByCommentIdAndVoteType(id, "UP").toInt(),
            downvotes = commentVoteRepository.countByCommentIdAndVoteType(id, "DOWN").toInt(),
            updatedAt = Instant.now()
        )

        val saved = commentRepository.save(updated)
        val userVotes = currentUserVote?.let { mapOf(saved.id to it) }.orEmpty()

        return toDto(saved, getUserNames(listOf(saved)), emptyMap(), userVotes)
    }

    private fun toDto(
        comment: Comment,
        userNames: Map<UUID, String>,
        repliesByParentId: Map<UUID, List<Comment>>,
        userVotes: Map<UUID, String>
    ): CommentDto {
        val replies = repliesByParentId[comment.id].orEmpty().map { reply ->
            toDto(reply, userNames, emptyMap(), userVotes)
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
            userVote = userVotes[comment.id],
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

    private fun getUserVotes(comments: List<Comment>, userId: UUID?): Map<UUID, String> {
        if (userId == null || comments.isEmpty()) {
            return emptyMap()
        }

        return commentVoteRepository.findByUserIdAndCommentIdIn(userId, comments.map { it.id }).associate { vote ->
            vote.commentId to vote.voteType
        }
    }
}
