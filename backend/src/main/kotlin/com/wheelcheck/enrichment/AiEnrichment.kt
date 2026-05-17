package com.wheelcheck.enrichment

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "ai_enrichment")
data class AiEnrichment(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "place_id", nullable = false, unique = true)
    val placeId: UUID,

    /**
     * VERIFIED  — direct confirmation found via Gemini search grounding
     * INFERRED  — indirect evidence (building type, similar venues, partial info)
     * ASSUMPTION — no specific info found; based on general Malaysian standards only
     */
    @Column(name = "confidence_tier", nullable = false)
    val confidenceTier: String = "ASSUMPTION",

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    val aiSummary: String? = null,

    @Column(name = "ai_reasoning", columnDefinition = "TEXT")
    val aiReasoning: String? = null,

    @Column(name = "is_accessible")
    val isAccessible: Boolean? = null,

    @Column(columnDefinition = "TEXT")
    val disclaimer: String? = null,

    @Column(name = "photo_url")
    val photoUrl: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    val sources: String = "[]",

    @Column(name = "model_used")
    val modelUsed: String? = null,

    @Column(name = "enriched_at", nullable = false)
    val enrichedAt: Instant = Instant.now()
)

data class AiEnrichmentDto(
    val placeId: UUID,
    val confidenceTier: String,
    val aiSummary: String?,
    val aiReasoning: String?,
    val isAccessible: Boolean?,
    val disclaimer: String?,
    val photoUrl: String?,
    val sources: List<AiSource>,
    val modelUsed: String?,
    val enrichedAt: Instant
)

data class AiSource(
    val url: String,
    val title: String,
    val snippet: String? = null
)
