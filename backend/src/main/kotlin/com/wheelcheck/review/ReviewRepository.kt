package com.wheelcheck.review

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ReviewRepository : JpaRepository<AccessibilityReview, UUID> {
    fun findByPlaceIdOrderByCreatedAtDesc(placeId: UUID): List<AccessibilityReview>
    fun findByUserId(userId: UUID): List<AccessibilityReview>
}
