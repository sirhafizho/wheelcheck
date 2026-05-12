package com.wheelcheck.favorite

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface FavoriteRepository : JpaRepository<Favorite, UUID> {
    fun findByUserId(userId: UUID): List<Favorite>
    fun findByUserIdAndPlaceId(userId: UUID, placeId: UUID): Favorite?
    fun existsByUserIdAndPlaceId(userId: UUID, placeId: UUID): Boolean
    fun deleteByUserIdAndPlaceId(userId: UUID, placeId: UUID)
    fun countByPlaceId(placeId: UUID): Long
}
