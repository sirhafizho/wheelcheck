package com.wheelcheck.comment

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CommentVoteRepository : JpaRepository<CommentVote, UUID> {
    fun findByCommentIdAndUserId(commentId: UUID, userId: UUID): CommentVote?

    fun deleteByCommentIdAndUserId(commentId: UUID, userId: UUID)

    fun findByUserIdAndCommentIdIn(userId: UUID, commentIds: Collection<UUID>): List<CommentVote>

    fun countByCommentIdAndVoteType(commentId: UUID, voteType: String): Long
}
