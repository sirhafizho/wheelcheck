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

@Component
class RateLimitConfig : OncePerRequestFilter() {
    
    private val cache = ConcurrentHashMap<String, Bucket>()
    
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val key = getClientKey(request)
        val bucket = cache.computeIfAbsent(key) { createBucket(request) }
        
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = HttpStatus.TOO_MANY_REQUESTS.value()
            response.writer.write("Too many requests. Please try again later.")
        }
    }
    
    private fun getClientKey(request: HttpServletRequest): String {
        val isAuthenticated = request.getHeader("Authorization")?.startsWith("Bearer ") == true
        val ip = request.remoteAddr
        return if (isAuthenticated) "auth:$ip" else "anon:$ip"
    }
    
    private fun createBucket(request: HttpServletRequest): Bucket {
        val isAuthenticated = request.getHeader("Authorization")?.startsWith("Bearer ") == true
        
        val limit = if (isAuthenticated) {
            Bandwidth.classic(30, Refill.intervally(30, Duration.ofHours(1)))
        } else {
            Bandwidth.classic(10, Refill.intervally(10, Duration.ofHours(1)))
        }
        
        return Bucket.builder()
            .addLimit(limit)
            .build()
    }
    
    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI
        // Don't rate limit GET requests or auth endpoints
        return request.method == "GET" || 
               path.startsWith("/api/auth") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs")
    }
}
