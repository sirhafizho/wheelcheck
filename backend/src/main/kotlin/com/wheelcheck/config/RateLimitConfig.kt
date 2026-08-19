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
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * Per-IP rate limiting for the public demo deployment.
 *
 * Tiers:
 *  - Heavy endpoints (nearby search, search): 30 req/min per IP
 *  - Write endpoints (reviews, reports, comments): 20 req/min per IP
 *  - Auth endpoints (login, register): 5 req/min per IP
 *  - Admin endpoints: 10 req/min per IP
 *  - General read (GET): 120 req/min per IP
 *
 * Security:
 *  - X-Forwarded-For is NOT trusted from clients; only remoteAddr is used
 *    (HF Spaces / Vercel proxy sets remoteAddr to the real client IP)
 *  - Bounded cache with TTL eviction prevents memory exhaustion
 */
@Component
class RateLimitConfig : OncePerRequestFilter() {

    companion object {
        // Max unique IPs tracked per tier before oldest entries are evicted
        private const val MAX_BUCKETS_PER_TIER = 50_000
        // Evict buckets older than this (no requests in this window)
        private const val EVICTION_INTERVAL_MS = 300_000L // 5 minutes
    }

    // Bounded bucket stores: IP -> (Bucket, lastAccessTimestamp)
    private val heavyBuckets  = BoundedBucketStore()
    private val writeBuckets  = BoundedBucketStore()
    private val authBuckets   = BoundedBucketStore()
    private val adminBuckets  = BoundedBucketStore()
    private val generalBuckets = BoundedBucketStore()

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
        // Only exempt documentation and health endpoints — NOT aggregation
        return path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/actuator/health")
    }

    /**
     * Use remoteAddr only — do NOT trust X-Forwarded-For from clients.
     * Behind HF Spaces / Vercel reverse proxy, remoteAddr is set to the real
     * client IP by the proxy infrastructure itself.
     */
    private fun getClientIp(request: HttpServletRequest): String {
        return request.remoteAddr
    }

    private fun newBucket(tokens: Long, period: Duration): Bucket =
        Bucket.builder()
            .addLimit(Bandwidth.classic(tokens, Refill.intervally(tokens, period)))
            .build()

    /**
     * Bounded bucket store with LRU eviction to prevent memory exhaustion.
     * Evicts entries older than EVICTION_INTERVAL_MS and caps at MAX_BUCKETS_PER_TIER.
     */
    private class BoundedBucketStore {
        private val buckets = ConcurrentHashMap<String, BucketEntry>()
        private val accessOrder = ConcurrentLinkedDeque<String>()

        data class BucketEntry(val bucket: Bucket, @Volatile var lastAccess: Long)

        fun getOrCreate(ip: String, factory: () -> Bucket): Bucket {
            val now = System.currentTimeMillis()

            val entry = buckets.compute(ip) { _, existing ->
                if (existing != null) {
                    existing.lastAccess = now
                    existing
                } else {
                    accessOrder.addLast(ip)
                    BucketEntry(factory(), now)
                }
            }!!

            // Periodic eviction: remove stale entries
            if (buckets.size > MAX_BUCKETS_PER_TIER / 2) {
                evictStale(now)
            }

            return entry.bucket
        }

        private fun evictStale(now: Long) {
            val cutoff = now - EVICTION_INTERVAL_MS
            var evicted = 0
            val maxEvict = (buckets.size - MAX_BUCKETS_PER_TIER / 2).coerceAtLeast(0)

            val iter = accessOrder.iterator()
            while (iter.hasNext() && (evicted < maxEvict || buckets.size > MAX_BUCKETS_PER_TIER)) {
                val ip = iter.next()
                val entry = buckets[ip]
                if (entry == null || entry.lastAccess < cutoff) {
                    iter.remove()
                    buckets.remove(ip)
                    evicted++
                }
            }
        }
    }
}
