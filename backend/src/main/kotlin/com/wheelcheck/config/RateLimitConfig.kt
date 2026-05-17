package com.wheelcheck.config

import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import io.github.bucket4j.Refill
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * Per-IP rate limiting for the public demo deployment.
 *
 * Tiers:
 *  - Heavy endpoints (nearby search, search): 30 req/min per IP
 *  - Write endpoints (reviews, reports, comments): 20 req/min per IP
 *  - Auth endpoints (login, register): 5 req/min per IP
 *  - Admin endpoints: 10 req/min per IP
 *  - General read (GET): 120 req/min per IP
 */
@Component
class RateLimitConfig : OncePerRequestFilter() {

    // Separate buckets per IP+tier
    private val heavyBuckets  = ConcurrentHashMap<String, Bucket>()  // nearby, search
    private val writeBuckets  = ConcurrentHashMap<String, Bucket>()  // POST reviews/comments
    private val authBuckets   = ConcurrentHashMap<String, Bucket>()  // login/register
    private val adminBuckets  = ConcurrentHashMap<String, Bucket>()  // admin endpoints
    private val generalBuckets = ConcurrentHashMap<String, Bucket>() // everything else

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val ip = getClientIp(request)
        val path = request.requestURI
        val method = request.method

        val (bucket, limitName) = when {
            // Auth — very strict: 5 per minute
            path.startsWith("/api/auth") ->
                authBuckets.getOrCreate(ip) { newBucket(5, Duration.ofMinutes(1)) } to "auth"

            // Admin endpoints — 10 per minute
            path.startsWith("/api/admin") ->
                adminBuckets.getOrCreate(ip) { newBucket(10, Duration.ofMinutes(1)) } to "admin"

            // Heavy read endpoints — 30 per minute
            path == "/api/places/nearby" || path.startsWith("/api/places/search") ->
                heavyBuckets.getOrCreate(ip) { newBucket(30, Duration.ofMinutes(1)) } to "heavy"

            // Write endpoints — 20 per minute
            method == "POST" || method == "PUT" || method == "DELETE" ->
                writeBuckets.getOrCreate(ip) { newBucket(20, Duration.ofMinutes(1)) } to "write"

            // General reads — 120 per minute
            else ->
                generalBuckets.getOrCreate(ip) { newBucket(120, Duration.ofMinutes(1)) } to "general"
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = HttpStatus.TOO_MANY_REQUESTS.value()
            response.setHeader("X-RateLimit-Tier", limitName)
            response.setHeader("Retry-After", "60")
            response.contentType = "application/json"
            response.writer.write("""{"error":"Rate limit exceeded","tier":"$limitName","retryAfter":60}""")
        }
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI
        // Only skip rate limiting for aggregation and docs endpoints
        return path.startsWith("/api/aggregation") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/actuator/health")
    }

    private fun getClientIp(request: HttpServletRequest): String {
        // Respect X-Forwarded-For from reverse proxies (HF Spaces, Vercel)
        val forwarded = request.getHeader("X-Forwarded-For")
        return if (!forwarded.isNullOrBlank()) forwarded.split(",").first().trim()
        else request.remoteAddr
    }

    private fun newBucket(tokens: Long, period: Duration): Bucket =
        Bucket.builder()
            .addLimit(Bandwidth.classic(tokens, Refill.intervally(tokens, period)))
            .build()

    private fun <K, V> ConcurrentHashMap<K, V>.getOrCreate(key: K, factory: () -> V): V =
        getOrPut(key, factory)
}
