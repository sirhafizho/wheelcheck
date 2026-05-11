package com.wheelcheck.user

import com.wheelcheck.review.ReviewRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class UserProfileService(
    private val userService: UserService,
    private val reviewRepository: ReviewRepository
) {
    fun getUserProfile(userId: UUID): UserProfileDto {
        val user = userService.findById(userId) ?: throw NoSuchElementException("User not found")
        val reviewCount = reviewRepository.countByUserId(userId)

        return UserProfileDto(
            id = user.id,
            name = user.name,
            email = user.email,
            reviewCount = reviewCount,
            createdAt = user.createdAt.toString()
        )
    }

    fun getUserStats(userId: UUID): UserStatsDto {
        val reviewCount = reviewRepository.countByUserId(userId)

        return UserStatsDto(
            reviewCount = reviewCount,
            placesAdded = 0
        )
    }
}
