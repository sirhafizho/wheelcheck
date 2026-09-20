package com.wheelcheck.auth

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.math.BigInteger
import java.net.URI
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import java.security.spec.ECParameterSpec
import java.security.AlgorithmParameters
import java.security.spec.ECGenParameterSpec
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*
import javax.crypto.SecretKey
import com.fasterxml.jackson.databind.ObjectMapper

@Component
class JwtTokenProvider(
    @Value("\${app.jwt.secret}") private val jwtSecret: String,
    @Value("\${app.jwt.expiration:86400}") private val jwtExpiration: Long,
    @Value("\${app.supabase.url:}") private val supabaseUrl: String
) {
    private val logger = LoggerFactory.getLogger(JwtTokenProvider::class.java)

    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtSecret.toByteArray())
    }

    private val supabaseEcKey: PublicKey? by lazy {
        if (supabaseUrl.isNotBlank()) {
            try {
                fetchSupabaseJwksPublicKey()
            } catch (e: Exception) {
                logger.warn("Failed to fetch Supabase JWKS public key: ${e.message}")
                null
            }
        } else null
    }

    private fun fetchSupabaseJwksPublicKey(): PublicKey {
        val jwksUrl = "${supabaseUrl}/auth/v1/.well-known/jwks.json"
        val json = URI(jwksUrl).toURL().readText()
        val mapper = ObjectMapper()
        val jwks = mapper.readTree(json)
        val key = jwks["keys"][0]

        val x = Base64.getUrlDecoder().decode(key["x"].asText())
        val y = Base64.getUrlDecoder().decode(key["y"].asText())

        val params = AlgorithmParameters.getInstance("EC")
        params.init(ECGenParameterSpec("secp256r1"))
        val ecSpec = params.getParameterSpec(ECParameterSpec::class.java)

        val point = ECPoint(BigInteger(1, x), BigInteger(1, y))
        val pubSpec = ECPublicKeySpec(point, ecSpec)
        return KeyFactory.getInstance("EC").generatePublic(pubSpec)
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
        if (supabaseEcKey == null) return false
        return try {
            parseWithPublicKey(token, supabaseEcKey!!)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun parseToken(token: String): Claims {
        // Try Supabase ES256 public key first, then fall back to app HMAC key
        if (supabaseEcKey != null) {
            try {
                return parseWithPublicKey(token, supabaseEcKey!!)
            } catch (_: Exception) { }
        }
        return parseWithSecretKey(token, key)
    }

    private fun parseWithPublicKey(token: String, publicKey: PublicKey): Claims {
        return Jwts.parser()
            .verifyWith(publicKey)
            .build()
            .parseSignedClaims(token)
            .payload
    }

    private fun parseWithSecretKey(token: String, secretKey: SecretKey): Claims {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .payload
    }
}
