package com.wheelcheck.auth

import com.wheelcheck.user.User
import com.wheelcheck.user.UserService
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.concurrent.ConcurrentHashMap

@Service
class AuthService(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val passwordEncoder: PasswordEncoder
) {

    companion object {
        private const val MAX_FAILED_ATTEMPTS = 10
        private const val LOCKOUT_DURATION_MS = 900_000L // 15 minutes
    }

    // Track failed login attempts per email: email -> list of failure timestamps
    private val failedAttempts = ConcurrentHashMap<String, MutableList<Long>>()

    @Transactional
    fun register(email: String, password: String, name: String): AuthResponse {
        val user = userService.createUser(email, password, name)
        val token = jwtTokenProvider.generateToken(user.id, user.email, user.role)
        return AuthResponse(token, user.id, user.email, user.name)
    }

    @Transactional(readOnly = true)
    fun login(email: String, password: String): AuthResponse? {
        val normalizedEmail = email.lowercase().trim()

        // Check if account is locked out due to too many failed attempts
        if (isLockedOut(normalizedEmail)) {
            return null
        }

        val user = userService.findByEmail(email)

        // Constant-time comparison: always run BCrypt even if user doesn't exist
        // to prevent timing-based account enumeration
        val passwordValid = if (user != null) {
            userService.validatePassword(user, password)
        } else {
            // Hash against a dummy to keep timing consistent
            passwordEncoder.matches(password, "\$2a\$10\$dummyhashtopreventtimingattacksenumeration")
            false
        }

        if (!passwordValid) {
            recordFailedAttempt(normalizedEmail)
            return null
        }

        // Successful login — clear failed attempts
        failedAttempts.remove(normalizedEmail)

        val token = jwtTokenProvider.generateToken(user!!.id, user.email, user.role)
        return AuthResponse(token, user.id, user.email, user.name)
    }

    private fun isLockedOut(email: String): Boolean {
        val attempts = failedAttempts[email] ?: return false
        val now = System.currentTimeMillis()
        val cutoff = now - LOCKOUT_DURATION_MS
        synchronized(attempts) {
            attempts.removeAll { it < cutoff }
            return attempts.size >= MAX_FAILED_ATTEMPTS
        }
    }

    private fun recordFailedAttempt(email: String) {
        val now = System.currentTimeMillis()
        val attempts = failedAttempts.getOrPut(email) { mutableListOf() }
        synchronized(attempts) {
            attempts.add(now)
        }
    }
}

data class AuthResponse(
    val token: String,
    val userId: java.util.UUID,
    val email: String,
    val name: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    @field:jakarta.validation.constraints.Email(message = "Invalid email format")
    @field:jakarta.validation.constraints.NotBlank(message = "Email is required")
    val email: String,

    @field:jakarta.validation.constraints.NotBlank(message = "Password is required")
    @field:jakarta.validation.constraints.Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    val password: String,

    @field:jakarta.validation.constraints.NotBlank(message = "Name is required")
    @field:jakarta.validation.constraints.Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    val name: String
)
