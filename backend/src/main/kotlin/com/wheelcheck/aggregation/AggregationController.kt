package com.wheelcheck.aggregation

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/aggregation")
@PreAuthorize("hasRole('ADMIN')")
class AggregationController(
    private val aggregationService: AggregationService
) {

    /**
     * Import from all enabled adapters for KL area.
     * Admin only — triggers OSM + any configured adapters.
     */
    @PostMapping("/import/kl")
    fun importKL(): List<ImportStats> {
        return aggregationService.importFromAllSources(AggregationService.KL_BBOX)
    }

    /**
     * Import from all enabled adapters for Selangor area (includes KL).
     * Admin only — larger area, more data.
     */
    @PostMapping("/import/selangor")
    fun importSelangor(): List<ImportStats> {
        return aggregationService.importFromAllSources(AggregationService.SELANGOR_BBOX)
    }

    /**
     * Import from all enabled adapters for a custom bounding box.
     */
    @PostMapping("/import/custom")
    fun importCustom(@RequestBody bbox: BoundingBox): List<ImportStats> {
        return aggregationService.importFromAllSources(bbox)
    }

    /**
     * List all registered adapters and their status.
     */
    @GetMapping("/adapters")
    fun listAdapters(): List<AdapterInfo> {
        return aggregationService.getAdapterInfo()
    }
}

data class AdapterInfo(
    val source: String,
    val displayName: String,
    val enabled: Boolean,
    val priority: Int
)
