package com.wheelcheck.comment

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface CommentRepository : JpaRepository<Comment, UUID> {
    fun findByPlaceIdAndParentIdIsNullOrderByCreatedAtDesc(placeId: UUID): List<Comment>

    fun findByParentIdOrderByCreatedAtAsc(parentId: UUID): List<Comment>

    fun findByPlaceIdOrderByCreatedAtDesc(placeId: UUID): List<Comment>

    fun countByPlaceId(placeId: UUID): Long
}
