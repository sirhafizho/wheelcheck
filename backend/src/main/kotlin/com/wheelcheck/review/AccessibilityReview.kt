package com.wheelcheck.review

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.place.Place
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "accessibility_reviews")
data class AccessibilityReview(
    @Id
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    val place: Place,
    
    @Column(name = "user_id")
    val userId: UUID? = null,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val entrance: AccessLevel,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val toilet: AccessLevel,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val parking: AccessLevel,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "internal_nav", nullable = false)
    val internalNav: AccessLevel,
    
    @Column(columnDefinition = "TEXT")
    val notes: String? = null,

    @Column(name = "photo_urls", columnDefinition = "JSONB")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    val photoUrls: List<String> = emptyList(),
    
    @Column(name = "is_verified", nullable = false)
    val isVerified: Boolean = false,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
