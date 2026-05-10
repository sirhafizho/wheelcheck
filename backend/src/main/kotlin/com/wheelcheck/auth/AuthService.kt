package com.wheelcheck.auth

import com.wheelcheck.user.User
import com.wheelcheck.user.UserService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider
) {
    
    @Transactional
    fun register(email: String, password: String, name: String): AuthResponse {
        val user = userService.createUser(email, password, name)
        val token = jwtTokenProvider.generateToken(user.id, user.email)
        return AuthResponse(token, user.id, user.email, user.name)
    }
    
    @Transactional(readOnly = true)
    fun login(email: String, password: String): AuthResponse? {
        val user = userService.findByEmail(email) ?: return null
        
        if (!userService.validatePassword(user, password)) {
            return null
        }
        
        val token = jwtTokenProvider.generateToken(user.id, user.email)
        return AuthResponse(token, user.id, user.email, user.name)
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
    val email: String,
    val password: String,
    val name: String
)
