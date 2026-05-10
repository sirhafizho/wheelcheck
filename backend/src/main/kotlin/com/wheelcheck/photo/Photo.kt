package com.wheelcheck.photo

import com.wheelcheck.place.Place
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "photos")
data class Photo(
    @Id
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    val place: Place,
    
    @Column(name = "user_id")
    val userId: UUID? = null,
    
    @Column(name = "file_path", nullable = false)
    val filePath: String,
    
    @Column(name = "file_size", nullable = false)
    val fileSize: Long,
    
    @Column(name = "content_type", nullable = false)
    val contentType: String,
    
    @Column(columnDefinition = "TEXT")
    val description: String? = null,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
