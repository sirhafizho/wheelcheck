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
    @Value("\${app.jwt.expiration:86400}") private val jwtExpiration: Long,
    @Value("\${app.supabase.jwt-secret:}") private val supabaseJwtSecret: String
) {

    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtSecret.toByteArray())
    }

    private val supabaseKey: SecretKey? by lazy {
        if (supabaseJwtSecret.isNotBlank()) {
            // Supabase JWT secret is base64-encoded
            val decoded = try {
                Base64.getDecoder().decode(supabaseJwtSecret)
            } catch (_: Exception) {
                supabaseJwtSecret.toByteArray()
            }
            Keys.hmacShaKeyFor(decoded)
        } else null
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

    fun getEmailFromToken(token: String): String? {
        return try {
            parseToken(token).get("email", String::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun getUserMetadata(token: String): Map<*, *>? {
        return try {
            parseToken(token).get("user_metadata", Map::class.java)
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

    fun isSupabaseToken(token: String): Boolean {
        return supabaseKey != null && try {
            parseWithKey(token, supabaseKey!!)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun parseToken(token: String): Claims {
        // Try Supabase JWT secret first, then fall back to app JWT secret
        if (supabaseKey != null) {
            try {
                return parseWithKey(token, supabaseKey!!)
            } catch (_: Exception) { }
        }
        return parseWithKey(token, key)
    }

    private fun parseWithKey(token: String, secretKey: SecretKey): Claims {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .payload
    }
}
