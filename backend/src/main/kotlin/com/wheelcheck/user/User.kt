package com.wheelcheck.user

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "users")
data class User(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(unique = true, nullable = false)
    val email: String,

    @Column(name = "password_hash", nullable = false)
    val passwordHash: String,

    @Column(nullable = false)
    val name: String,

    @Column(name = "is_verified", nullable = false)
    val isVerified: Boolean = false,

    @Column(nullable = false)
    val role: String = "USER",

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
