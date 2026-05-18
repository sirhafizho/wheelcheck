package com.wheelcheck.enrichment

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface AiEnrichmentRepository : JpaRepository<AiEnrichment, UUID> {
    fun findByPlaceId(placeId: UUID): AiEnrichment?

    @Query("SELECT COUNT(a) FROM AiEnrichment a WHERE a.confidenceTier = :tier")
    fun countByTier(@Param("tier") tier: String): Long

    @Query(value = """
        SELECT COUNT(*) FROM places p
        INNER JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE LOWER(p.state) = LOWER(:state) AND ae.confidence_tier = :tier
    """, nativeQuery = true)
    fun countByStateAndTier(@Param("state") state: String, @Param("tier") tier: String): Long

    @Query(value = """
        SELECT p.id FROM places p
        LEFT JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE LOWER(p.state) = LOWER(:state) AND ae.id IS NULL
    """, nativeQuery = true)
    fun findUnenrichedPlaceIdsByState(@Param("state") state: String): List<UUID>

    @Query(value = """
        SELECT COUNT(*) FROM places p
        LEFT JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE LOWER(p.state) = LOWER(:state) AND ae.id IS NULL
    """, nativeQuery = true)
    fun countUnenrichedByState(@Param("state") state: String): Long

    @Query(value = """
        SELECT COUNT(*) FROM places p
        INNER JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE LOWER(p.state) = LOWER(:state)
    """, nativeQuery = true)
    fun countEnrichedByState(@Param("state") state: String): Long

    @Query(value = """
        SELECT COUNT(*) FROM places p WHERE LOWER(p.state) = LOWER(:state)
    """, nativeQuery = true)
    fun countTotalByState(@Param("state") state: String): Long
}
