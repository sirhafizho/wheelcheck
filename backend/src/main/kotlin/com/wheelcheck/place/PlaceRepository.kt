package com.wheelcheck.place

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface PlaceRepository : JpaRepository<Place, UUID> {
    
    @Query(value = """
        SELECT p.*, ST_Distance(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography) as distance 
        FROM places p 
        WHERE ST_DWithin(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, :radius)
        ORDER BY ST_Distance(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography)
        LIMIT :limit
    """, nativeQuery = true)
    fun findNearby(
        @Param("lat") lat: Double, 
        @Param("lng") lng: Double, 
        @Param("radius") radius: Int, 
        @Param("limit") limit: Int
    ): List<Place>
    
    @Query(value = """
        SELECT p.*, ST_Distance(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography) as distance 
        FROM places p 
        WHERE ST_DWithin(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, :radius)
        AND p.category = CAST(:category AS category_enum)
        ORDER BY ST_Distance(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography)
        LIMIT :limit
    """, nativeQuery = true)
    fun findNearbyByCategory(
        @Param("lat") lat: Double, 
        @Param("lng") lng: Double, 
        @Param("radius") radius: Int, 
        @Param("category") category: String,
        @Param("limit") limit: Int
    ): List<Place>
    
    @Query(value = """
        SELECT * FROM places 
        WHERE LOWER(name) LIKE LOWER(CONCAT('%', :name, '%'))
        LIMIT 50
    """, nativeQuery = true)
    fun findByNameContainingIgnoreCaseLimited(@Param("name") name: String): List<Place>
    
    fun findByOsmId(osmId: String): Place?
    
    fun existsByOsmId(osmId: String): Boolean
}
