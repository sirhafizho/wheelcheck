package com.wheelcheck.place

import com.wheelcheck.common.AccessLevel
import com.wheelcheck.common.Category
import jakarta.persistence.*
import org.locationtech.jts.geom.Point
import java.time.Instant
import java.util.*

@Entity
@Table(name = "places")
data class Place(
    @Id
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false)
    val name: String,
    
    @Column(name = "name_ms")
    val nameMs: String? = null,
    
    @Column(columnDefinition = "geometry(Point, 4326)", nullable = false)
    val location: Point,
    
    @Column(nullable = false)
    val address: String,
    
    @Column(nullable = false)
    val city: String = "",

    @Column
    val state: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val category: Category,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "accessibility_level", nullable = false)
    val accessibilityLevel: AccessLevel = AccessLevel.UNKNOWN,
    
    @Column(name = "review_count", nullable = false)
    val reviewCount: Int = 0,
    
    @Column(name = "osm_id")
    val osmId: String? = null,
    
    @Column(name = "data_source", nullable = false)
    val dataSource: String = "COMMUNITY",
    
    @Column(name = "osm_wheelchair_tag")
    val osmWheelchairTag: String? = null,
    
    @Column(name = "osm_toilet_accessible")
    val osmToiletAccessible: Boolean? = null,
    
    @Column(name = "osm_tactile_paving")
    val osmTactilePaving: Boolean? = null,
    
    @Column(name = "osm_description")
    val osmDescription: String? = null,

    @Column(name = "osm_surface")
    val osmSurface: String? = null,

    @Column(name = "osm_incline")
    val osmIncline: String? = null,

    @Column(name = "osm_entrance_wheelchair")
    val osmEntranceWheelchair: String? = null,

    @Column(name = "osm_kerb_tactile")
    val osmKerbTactile: Boolean? = null,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
    
    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now(),

    @Column(name = "created_by")
    val createdBy: UUID? = null
)
