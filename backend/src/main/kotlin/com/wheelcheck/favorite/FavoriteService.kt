package com.wheelcheck.favorite

import com.wheelcheck.place.PlaceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class FavoriteService(
    private val favoriteRepository: FavoriteRepository,
    private val placeRepository: PlaceRepository
) {
    fun getUserFavorites(userId: UUID): List<FavoriteDto> {
        return favoriteRepository.findByUserId(userId).map { fav ->
            val place = placeRepository.findById(fav.placeId).orElse(null)
            FavoriteDto(
                id = fav.id,
                placeId = fav.placeId,
                placeName = place?.name,
                createdAt = fav.createdAt
            )
        }
    }

    fun isFavorited(userId: UUID, placeId: UUID): Boolean {
        return favoriteRepository.existsByUserIdAndPlaceId(userId, placeId)
    }

    fun getFavoriteCount(placeId: UUID): Long {
        return favoriteRepository.countByPlaceId(placeId)
    }

    @Transactional
    fun toggleFavorite(userId: UUID, placeId: UUID): FavoriteToggleResponse {
        val existing = favoriteRepository.findByUserIdAndPlaceId(userId, placeId)

        if (existing != null) {
            favoriteRepository.deleteByUserIdAndPlaceId(userId, placeId)
            return FavoriteToggleResponse(
                favorited = false,
                totalFavorites = favoriteRepository.countByPlaceId(placeId)
            )
        }

        // Verify place exists
        require(placeRepository.existsById(placeId)) { "Place not found: $placeId" }

        favoriteRepository.save(Favorite(userId = userId, placeId = placeId))
        return FavoriteToggleResponse(
            favorited = true,
            totalFavorites = favoriteRepository.countByPlaceId(placeId)
        )
    }
}
