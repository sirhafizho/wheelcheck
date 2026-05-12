package com.wheelcheck.favorite

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/favorites")
@CrossOrigin(origins = ["*"])
class FavoriteController(
    private val favoriteService: FavoriteService
) {

    @GetMapping
    fun getUserFavorites(authentication: Authentication?): ResponseEntity<List<FavoriteDto>> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return ResponseEntity.ok(favoriteService.getUserFavorites(userId))
    }

    @PostMapping("/{placeId}")
    fun toggleFavorite(
        @PathVariable placeId: UUID,
        authentication: Authentication?
    ): ResponseEntity<FavoriteToggleResponse> {
        val userId = authentication?.principal as? UUID
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            ResponseEntity.ok(favoriteService.toggleFavorite(userId, placeId))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/{placeId}/status")
    fun getFavoriteStatus(
        @PathVariable placeId: UUID,
        authentication: Authentication?
    ): ResponseEntity<Map<String, Any>> {
        val userId = authentication?.principal as? UUID
        val favorited = userId?.let { favoriteService.isFavorited(it, placeId) } ?: false
        val count = favoriteService.getFavoriteCount(placeId)
        return ResponseEntity.ok(mapOf("favorited" to favorited, "totalFavorites" to count))
    }
}
