package com.wheelcheck.osm

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/admin/osm")
@PreAuthorize("hasRole('ADMIN')")
class OsmImportController(
    private val osmImportService: OsmImportService
) {

    /**
     * Trigger OSM data import for a given bounding box.
     * Default: Kuala Lumpur metropolitan area.
     * 
     * This is an admin-only endpoint (requires authentication in production).
     */
    @PostMapping("/import")
    fun importPlaces(
        @RequestParam(defaultValue = "3.05") south: Double,
        @RequestParam(defaultValue = "101.60") west: Double,
        @RequestParam(defaultValue = "3.25") north: Double,
        @RequestParam(defaultValue = "101.80") east: Double
    ): ResponseEntity<ImportResult> {
        val result = osmImportService.importPlaces(south, west, north, east)
        return ResponseEntity.ok(result)
    }
}
