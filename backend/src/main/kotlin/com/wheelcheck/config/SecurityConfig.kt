package com.wheelcheck.config

import com.wheelcheck.auth.JwtAuthFilter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthFilter: JwtAuthFilter
) {
    
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // Public endpoints
                    .requestMatchers(HttpMethod.GET, "/api/places", "/api/places/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/places/nearby").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/reviews", "/api/reviews/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/reviews").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/photos", "/api/photos/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/photos/upload").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    
                    // Admin endpoints (auth required)
                    .requestMatchers("/api/admin/**").authenticated()
                    
                    // Swagger/OpenAPI
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                    
                    // All other endpoints require authentication
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
        
        return http.build()
    }
    
    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder()
    }
}
