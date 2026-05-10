package com.wheelcheck.user

import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {
    
    @Transactional(readOnly = true)
    fun findById(id: UUID): User? {
        return userRepository.findById(id).orElse(null)
    }
    
    @Transactional(readOnly = true)
    fun findByEmail(email: String): User? {
        return userRepository.findByEmail(email)
    }
    
    @Transactional
    fun createUser(email: String, password: String, name: String): User {
        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already exists: $email")
        }
        
        val user = User(
            email = email,
            passwordHash = passwordEncoder.encode(password),
            name = name,
            isVerified = false
        )
        
        return userRepository.save(user)
    }
    
    @Transactional
    fun verifyUser(userId: UUID) {
        val user = userRepository.findById(userId).orElse(null) ?: return
        val updated = user.copy(
            isVerified = true,
            updatedAt = java.time.Instant.now()
        )
        userRepository.save(updated)
    }
    
    fun validatePassword(user: User, password: String): Boolean {
        return passwordEncoder.matches(password, user.passwordHash)
    }
}
