package com.wheelcheck.photo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface PhotoRepository : JpaRepository<Photo, UUID> {
    fun findByPlaceIdOrderByCreatedAtDesc(placeId: UUID): List<Photo>
    fun findByUserId(userId: UUID): List<Photo>
}
