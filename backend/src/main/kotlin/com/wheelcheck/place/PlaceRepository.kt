package com.wheelcheck.place

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
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
        AND p.status = 'APPROVED'
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
        AND p.category = :category
        AND p.status = 'APPROVED'
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

    /** Find places within [radiusMeters] of a point (any status) — used for duplicate check */
    @Query(value = """
        SELECT p.* FROM places p
        WHERE ST_DWithin(p.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, :radius)
        AND p.id != :excludeId
        LIMIT 5
    """, nativeQuery = true)
    fun findNearbyForDuplicateCheck(
        @Param("lat") lat: Double,
        @Param("lng") lng: Double,
        @Param("radius") radius: Int,
        @Param("excludeId") excludeId: UUID
    ): List<Place>

    /** All PENDING places for admin review, newest first */
    @Query("SELECT p FROM Place p WHERE p.status = 'PENDING' ORDER BY p.createdAt DESC")
    fun findPending(pageable: Pageable): Page<Place>

    @Query("SELECT COUNT(p) FROM Place p WHERE p.status = 'PENDING'")
    fun countPending(): Long
    
    @Query(value = """
        SELECT * FROM places 
        WHERE (LOWER(REPLACE(name, ' ', '')) LIKE LOWER(CONCAT('%%', REPLACE(:name, ' ', ''), '%%'))
           OR name ILIKE CONCAT('%%', :name, '%%'))
        AND status = 'APPROVED'
        ORDER BY 
            CASE WHEN name ILIKE :name THEN 0
                 WHEN name ILIKE CONCAT(:name, '%%') THEN 1
                 WHEN name ILIKE CONCAT('%%', :name, '%%') THEN 2
                 ELSE 3
            END
        LIMIT 50
    """, nativeQuery = true)
    fun findByNameContainingIgnoreCaseLimited(@Param("name") name: String): List<Place>
    
    fun findByOsmId(osmId: String): Place?
    
    fun existsByOsmId(osmId: String): Boolean
    
    fun findByCreatedBy(userId: UUID): List<Place>

    fun findByStateIgnoreCase(state: String): List<Place>

    @Query(value = """
        SELECT * FROM places p
        WHERE LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(CONCAT('%%', REPLACE(:search, ' ', ''), '%%'))
           OR p.name ILIKE CONCAT('%%', :search, '%%')
           OR p.address ILIKE CONCAT('%%', :search, '%%')
        ORDER BY p.created_at DESC
    """,
    countQuery = """
        SELECT COUNT(*) FROM places p
        WHERE LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(CONCAT('%%', REPLACE(:search, ' ', ''), '%%'))
           OR p.name ILIKE CONCAT('%%', :search, '%%')
           OR p.address ILIKE CONCAT('%%', :search, '%%')
    """,
    nativeQuery = true)
    fun searchByText(
        @Param("search") search: String,
        pageable: Pageable
    ): Page<Place>

    @Query("SELECT p FROM Place p WHERE p.category = :category")
    fun findByCategoryPaged(
        @Param("category") category: Category,
        pageable: Pageable
    ): Page<Place>

    @Query("SELECT p FROM Place p WHERE p.accessibilityLevel = :accessLevel")
    fun findByAccessLevelPaged(
        @Param("accessLevel") accessLevel: AccessLevel,
        pageable: Pageable
    ): Page<Place>

    @Query(value = """
        SELECT * FROM places p
        WHERE (LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(CONCAT('%%', REPLACE(:search, ' ', ''), '%%'))
           OR p.name ILIKE CONCAT('%%', :search, '%%')
           OR p.address ILIKE CONCAT('%%', :search, '%%'))
        AND p.category = :category
        ORDER BY p.created_at DESC
    """,
    countQuery = """
        SELECT COUNT(*) FROM places p
        WHERE (LOWER(REPLACE(p.name, ' ', '')) LIKE LOWER(CONCAT('%%', REPLACE(:search, ' ', ''), '%%'))
           OR p.name ILIKE CONCAT('%%', :search, '%%')
           OR p.address ILIKE CONCAT('%%', :search, '%%'))
        AND p.category = :category
    """,
    nativeQuery = true)
    fun searchByTextAndCategory(
        @Param("search") search: String,
        @Param("category") category: String,
        pageable: Pageable
    ): Page<Place>
}
