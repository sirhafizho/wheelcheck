package com.wheelcheck.auth

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    @Value("\${app.jwt.secret}") private val jwtSecret: String,
    @Value("\${app.jwt.expiration:86400}") private val jwtExpiration: Long
) {

    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtSecret.toByteArray())
    }

    fun generateToken(userId: UUID, email: String, role: String): String {
        val now = Instant.now()
        val expiryDate = now.plus(jwtExpiration, ChronoUnit.SECONDS)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiryDate))
            .signWith(key)
            .compact()
    }

    fun getUserIdFromToken(token: String): UUID? {
        return try {
            val claims = parseToken(token)
            UUID.fromString(claims.subject)
        } catch (e: Exception) {
            null
        }
    }

    fun extractRole(token: String): String? {
        return try {
            parseToken(token).get("role", String::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun validateToken(token: String): Boolean {
        return try {
            parseToken(token)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun parseToken(token: String): Claims {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
    }
}
