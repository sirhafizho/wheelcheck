package com.wheelcheck.config

import com.wheelcheck.auth.JwtTokenProvider
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Protects the demo deployment from abuse by demo accounts.
 *
 * Demo accounts (identified by email suffix) are restricted from:
 *  - Bulk/destructive admin operations (delete users, change roles)
 *  - Deleting more than N places per hour (prevent wiping the DB)
 *  - Creating excessive content (spam guard)
 *
 * Real admin accounts (not demo) retain full power.
 */
@Component
class DemoGuardFilter(
    private val jwtTokenProvider: JwtTokenProvider,
    @Value("\${wheelcheck.demo.enabled:true}") private val demoGuardEnabled: Boolean
) : OncePerRequestFilter() {

    companion object {
        private val DEMO_EMAILS = setOf(
            "admin@wheelcheck.demo",
            "user@wheelcheck.demo"
        )

        // Max destructive operations per demo account per hour
        private const val MAX_DEMO_DELETES_PER_HOUR = 5
        private const val MAX_DEMO_CREATES_PER_HOUR = 20
    }

    // Track demo account operations: email -> list of timestamps
    private val deleteTracker = java.util.concurrent.ConcurrentHashMap<String, MutableList<Long>>()
    private val createTracker = java.util.concurrent.ConcurrentHashMap<String, MutableList<Long>>()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (!demoGuardEnabled) {
            filterChain.doFilter(request, response)
            return
        }

        val email = extractEmailFromToken(request)
        if (email == null || !isDemoAccount(email)) {
            filterChain.doFilter(request, response)
            return
        }

        val path = request.requestURI
        val method = request.method

        // Block demo accounts from dangerous admin operations
        if (path.startsWith("/api/admin")) {
            when {
                // Block: delete users, change user roles (could lock out real admins)
                path.matches(Regex("/api/admin/users/[^/]+")) && method == "DELETE" -> {
                    denyWithReason(response, "Demo accounts cannot delete users")
                    return
                }
                path.matches(Regex("/api/admin/users/[^/]+/role")) && method == "PUT" -> {
                    denyWithReason(response, "Demo accounts cannot change user roles")
                    return
                }
                // Rate-limit: admin place deletion
                path.matches(Regex("/api/admin/places/[^/]+")) && method == "DELETE" -> {
                    if (!checkAndTrack(deleteTracker, email, MAX_DEMO_DELETES_PER_HOUR)) {
                        denyWithReason(response, "Demo account delete limit reached ($MAX_DEMO_DELETES_PER_HOUR/hour)")
                        return
                    }
                }
                // Admin reads are fine
            }
        }

        // Rate-limit place/comment creation for demo accounts
        if (method == "POST" && (path.startsWith("/api/places") || path.startsWith("/api/comments"))) {
            if (!checkAndTrack(createTracker, email, MAX_DEMO_CREATES_PER_HOUR)) {
                denyWithReason(response, "Demo account creation limit reached ($MAX_DEMO_CREATES_PER_HOUR/hour)")
                return
            }
        }

        // Rate-limit place deletion via owner endpoint too
        if (method == "DELETE" && path.matches(Regex("/api/places/[^/]+"))) {
            if (!checkAndTrack(deleteTracker, email, MAX_DEMO_DELETES_PER_HOUR)) {
                denyWithReason(response, "Demo account delete limit reached ($MAX_DEMO_DELETES_PER_HOUR/hour)")
                return
            }
        }

        filterChain.doFilter(request, response)
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        // Only apply to write operations and admin paths
        val method = request.method
        val path = request.requestURI
        return method == "GET" && !path.startsWith("/api/admin")
    }

    private fun isDemoAccount(email: String): Boolean = email.lowercase() in DEMO_EMAILS

    private fun extractEmailFromToken(request: HttpServletRequest): String? {
        val header = request.getHeader("Authorization") ?: return null
        if (!header.startsWith("Bearer ")) return null
        return try {
            val token = header.substring(7)
            jwtTokenProvider.getEmailFromToken(token)
        } catch (e: Exception) {
            null
        }
    }

    private fun checkAndTrack(
        tracker: java.util.concurrent.ConcurrentHashMap<String, MutableList<Long>>,
        email: String,
        maxPerHour: Int
    ): Boolean {
        val now = System.currentTimeMillis()
        val oneHourAgo = now - 3_600_000

        val timestamps = tracker.getOrPut(email) { mutableListOf() }
        synchronized(timestamps) {
            timestamps.removeAll { it < oneHourAgo }
            if (timestamps.size >= maxPerHour) return false
            timestamps.add(now)
        }
        return true
    }

    private fun denyWithReason(response: HttpServletResponse, reason: String) {
        response.status = HttpStatus.FORBIDDEN.value()
        response.contentType = "application/json"
        response.writer.write("""{"error":"Demo restriction","message":"$reason","hint":"Register your own account for full access"}""")
    }
}
