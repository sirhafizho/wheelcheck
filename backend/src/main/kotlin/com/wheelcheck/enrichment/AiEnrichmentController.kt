package com.wheelcheck.enrichment

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

/**
 * Admin endpoints to trigger and monitor AI enrichment.
 *
 * POST /api/admin/enrich/place/{id}     — enrich one place immediately
 * POST /api/admin/enrich/state/{state}  — batch enrich all in a state (async, rate-limited)
 * GET  /api/admin/enrich/progress       — check running batch progress
 * GET  /api/admin/enrich/stats/{state}  — enrichment stats for a state
 */
@RestController
@RequestMapping("/api/admin/enrich")
@PreAuthorize("hasRole('ADMIN')")
class AiEnrichmentController(
    private val enrichmentService: AiEnrichmentService
) {

    @PostMapping("/place/{id}")
    fun enrichPlace(@PathVariable id: UUID): ResponseEntity<Any> {
        val result = enrichmentService.enrichPlace(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(result)
    }

    /**
     * Kick off background enrichment for all unenriched places in a state.
     * Returns immediately — poll /progress to track.
     *
     * Supported states (case-insensitive): Terengganu, Kelantan, Sabah, Sarawak,
     * Kedah, Perlis, Perak, Selangor, Johor, Pahang, Negeri Sembilan, Melaka,
     * Penang, Putrajaya, Labuan, Kuala Lumpur
     *
     * Optional: forceRe=true to re-enrich already-processed places.
     */
    @PostMapping("/state/{state}")
    fun enrichState(
        @PathVariable state: String,
        @RequestParam(defaultValue = "false") forceRe: Boolean
    ): ResponseEntity<Map<String, String>> {
        enrichmentService.enrichStateAsync(state, forceRe)
        return ResponseEntity.accepted().body(
            mapOf(
                "message" to "Enrichment started for $state",
                "note" to "Rate-limited to ~8 calls/min (Gemini free tier). Poll /api/admin/enrich/progress."
            )
        )
    }

    @GetMapping("/progress")
    fun getProgress(): ResponseEntity<AiEnrichmentService.EnrichmentProgress> {
        return ResponseEntity.ok(enrichmentService.getBatchProgress())
    }

    @GetMapping("/stats/{state}")
    fun getStats(@PathVariable state: String): ResponseEntity<AiEnrichmentService.StateStats> {
        return ResponseEntity.ok(enrichmentService.getStateStats(state))
    }

    /** Returns enrichment stats for all Malaysian states in one call. */
    @GetMapping("/stats")
    fun getAllStats(): ResponseEntity<List<AiEnrichmentService.StateStats>> {
        val states = listOf(
            "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
            "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah",
            "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur",
            "Labuan", "Putrajaya"
        )
        return ResponseEntity.ok(states.map { enrichmentService.getStateStats(it) })
    }
}
