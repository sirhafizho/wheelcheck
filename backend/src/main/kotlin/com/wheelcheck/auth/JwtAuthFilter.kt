package com.wheelcheck.auth

import com.wheelcheck.user.UserService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtTokenProvider: JwtTokenProvider,
    private val userService: UserService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        try {
            val token = extractTokenFromRequest(request)

            if (token != null && jwtTokenProvider.validateToken(token)) {
                val userId = jwtTokenProvider.getUserIdFromToken(token)

                if (userId != null) {
                    val user = if (jwtTokenProvider.isSupabaseToken(token)) {
                        // Supabase token: auto-create user if needed
                        val email = jwtTokenProvider.getEmailFromToken(token) ?: ""
                        val metadata = jwtTokenProvider.getUserMetadata(token)
                        val name = (metadata?.get("full_name") as? String)
                            ?: (metadata?.get("name") as? String)
                            ?: email.substringBefore("@")
                        if (email.isNotBlank()) {
                            userService.findOrCreateFromSupabase(userId, email, name)
                        } else {
                            userService.findById(userId)
                        }
                    } else {
                        userService.findById(userId)
                    }

                    if (user != null) {
                        val role = (jwtTokenProvider.extractRole(token) ?: user.role).uppercase()
                        val normalizedRole = if (role == "AUTHENTICATED") "USER" else role
                        val authentication = UsernamePasswordAuthenticationToken(
                            user.id,
                            null,
                            listOf(SimpleGrantedAuthority("ROLE_$normalizedRole"))
                        )
                        SecurityContextHolder.getContext().authentication = authentication
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Could not set user authentication in security context", e)
        }

        filterChain.doFilter(request, response)
    }

    private fun extractTokenFromRequest(request: HttpServletRequest): String? {
        val bearerToken = request.getHeader("Authorization")
        return if (bearerToken?.startsWith("Bearer ") == true) {
            bearerToken.substring(7)
        } else {
            null
        }
    }
}
