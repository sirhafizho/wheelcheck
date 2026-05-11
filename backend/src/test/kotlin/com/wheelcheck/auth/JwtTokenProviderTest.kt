package com.wheelcheck.auth

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.*

class JwtTokenProviderTest {

    private lateinit var jwtTokenProvider: JwtTokenProvider

    @BeforeEach
    fun setup() {
        // Use a 256-bit (32-byte) secret key for HS256
        jwtTokenProvider = JwtTokenProvider(
            jwtSecret = "test-secret-key-for-testing-purpose-only-min-32-chars",
            jwtExpiration = 3600
        )
    }

    @Test
    fun `generateToken creates valid token`() {
        val userId = UUID.randomUUID()
        val email = "test@wheelcheck.com"

        val token = jwtTokenProvider.generateToken(userId, email, "USER")

        assertNotNull(token)
        assertTrue(token.isNotBlank())
        assertTrue(token.split(".").size == 3) // JWT has 3 parts
    }

    @Test
    fun `getUserIdFromToken extracts correct userId`() {
        val userId = UUID.randomUUID()
        val email = "test@wheelcheck.com"

        val token = jwtTokenProvider.generateToken(userId, email, "USER")
        val extractedId = jwtTokenProvider.getUserIdFromToken(token)

        assertEquals(userId, extractedId)
    }

    @Test
    fun `extractRole extracts correct role`() {
        val token = jwtTokenProvider.generateToken(UUID.randomUUID(), "test@wheelcheck.com", "ADMIN")

        assertEquals("ADMIN", jwtTokenProvider.extractRole(token))
    }

    @Test
    fun `validateToken returns true for valid token`() {
        val userId = UUID.randomUUID()
        val token = jwtTokenProvider.generateToken(userId, "test@wheelcheck.com", "USER")

        assertTrue(jwtTokenProvider.validateToken(token))
    }

    @Test
    fun `validateToken returns false for invalid token`() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.here"))
    }

    @Test
    fun `validateToken returns false for tampered token`() {
        val userId = UUID.randomUUID()
        val token = jwtTokenProvider.generateToken(userId, "test@wheelcheck.com", "USER")
        val tampered = token.dropLast(5) + "XXXXX"

        assertFalse(jwtTokenProvider.validateToken(tampered))
    }

    @Test
    fun `getUserIdFromToken returns null for invalid token`() {
        val result = jwtTokenProvider.getUserIdFromToken("not.a.valid.jwt")
        assertNull(result)
    }

    @Test
    fun `expired token is invalid`() {
        // Create a provider with 0-second expiration
        val shortLivedProvider = JwtTokenProvider(
            jwtSecret = "test-secret-key-for-testing-purpose-only-min-32-chars",
            jwtExpiration = 0
        )

        val userId = UUID.randomUUID()
        val token = shortLivedProvider.generateToken(userId, "test@wheelcheck.com", "USER")

        // Token with 0 expiration should be expired immediately
        // Give it a tiny moment to expire
        Thread.sleep(100)
        assertFalse(shortLivedProvider.validateToken(token))
    }
}
