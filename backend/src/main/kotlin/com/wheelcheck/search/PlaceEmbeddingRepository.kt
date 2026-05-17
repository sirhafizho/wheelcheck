package com.wheelcheck.search

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.util.UUID

data class SemanticSearchResult(
    val id: UUID,
    val similarity: Double
)

@Repository
class PlaceEmbeddingRepository(private val jdbcTemplate: JdbcTemplate) {

    fun saveEmbedding(placeId: UUID, vectorString: String) {
        jdbcTemplate.update(
            "UPDATE places SET embedding = ?::vector WHERE id = ?",
            vectorString, placeId
        )
    }

    fun semanticSearch(queryVector: String, lat: Double, lng: Double, radiusMeters: Int, limit: Int): List<SemanticSearchResult> {
        return jdbcTemplate.query(
            """
            SELECT id, 1 - (embedding <=> ?::vector) AS similarity
            FROM places
            WHERE embedding IS NOT NULL
              AND ST_DWithin(location::geography, ST_SetSRID(ST_Point(?, ?), 4326)::geography, ?)
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """,
            { rs, _ -> SemanticSearchResult(UUID.fromString(rs.getString("id")), rs.getDouble("similarity")) },
            queryVector, lng, lat, radiusMeters, queryVector, limit
        )
    }

    fun semanticSearchGlobal(queryVector: String, limit: Int): List<SemanticSearchResult> {
        return jdbcTemplate.query(
            """
            SELECT id, 1 - (embedding <=> ?::vector) AS similarity
            FROM places
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """,
            { rs, _ -> SemanticSearchResult(UUID.fromString(rs.getString("id")), rs.getDouble("similarity")) },
            queryVector, queryVector, limit
        )
    }

    fun countWithEmbeddings(): Int =
        jdbcTemplate.queryForObject("SELECT COUNT(*) FROM places WHERE embedding IS NOT NULL", Int::class.java) ?: 0

    fun countTotal(): Int =
        jdbcTemplate.queryForObject("SELECT COUNT(*) FROM places", Int::class.java) ?: 0

    fun findUnembeddedIds(batchSize: Int): List<Pair<UUID, String>> {
        return jdbcTemplate.query(
            "SELECT id, name, category FROM places WHERE embedding IS NULL LIMIT ?",
            { rs, _ ->
                val id = UUID.fromString(rs.getString("id"))
                val text = "${rs.getString("name")} ${rs.getString("category").lowercase().replace('_', ' ')}"
                Pair(id, text)
            },
            batchSize
        )
    }
}
