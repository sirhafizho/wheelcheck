package com.wheelcheck.user

import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = ["*"])
class UserController(
    private val userProfileService: UserProfileService
) {
    @GetMapping("/me")
    fun getCurrentUser(authentication: Authentication): ResponseEntity<UserProfileDto> {
        val userId = UUID.fromString(authentication.name)
        val profile = userProfileService.getUserProfile(userId)
        return ResponseEntity.ok(profile)
    }

    @GetMapping("/{userId}/stats")
    fun getUserStats(@PathVariable userId: UUID): ResponseEntity<UserStatsDto> {
        val stats = userProfileService.getUserStats(userId)
        return ResponseEntity.ok(stats)
    }
}
