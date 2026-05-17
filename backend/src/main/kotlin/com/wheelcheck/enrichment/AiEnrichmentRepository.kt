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
        LEFT JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE p.state = :state AND ae.id IS NULL
    """, nativeQuery = true)
    fun countUnenrichedByState(@Param("state") state: String): Long

    @Query(value = """
        SELECT COUNT(*) FROM places p
        INNER JOIN ai_enrichment ae ON ae.place_id = p.id
        WHERE p.state = :state
    """, nativeQuery = true)
    fun countEnrichedByState(@Param("state") state: String): Long

    @Query(value = """
        SELECT COUNT(*) FROM places p WHERE p.state = :state
    """, nativeQuery = true)
    fun countTotalByState(@Param("state") state: String): Long
}
