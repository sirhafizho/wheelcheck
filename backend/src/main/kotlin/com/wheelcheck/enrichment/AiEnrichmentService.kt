package com.wheelcheck.enrichment

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceRepository
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

@Service
class AiEnrichmentService(
    private val geminiService: GeminiEnrichmentService,
    private val enrichmentRepository: AiEnrichmentRepository,
    private val placeRepository: PlaceRepository,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(AiEnrichmentService::class.java)

    // Gemini free tier: 15 req/min. We use 8/min to stay safe.
    private val delayBetweenCallsMs = 8_000L
    private val batchRunning = AtomicBoolean(false)
    private val batchProgress = AtomicInteger(0)
    private val batchTotal = AtomicInteger(0)
    private val batchState = StringBuilder()

    data class EnrichmentProgress(
        val running: Boolean,
        val processed: Int,
        val total: Int,
        val currentState: String
    )

    data class StateStats(
        val state: String,
        val total: Long,
        val enriched: Long,
        val unenriched: Long,
        val verifiedCount: Long,
        val inferredCount: Long,
        val assumptionCount: Long
    )

    /** Enrich a single place by ID. Returns the saved enrichment DTO. */
    @Transactional
    fun enrichPlace(placeId: UUID): AiEnrichmentDto? {
        val place = placeRepository.findByIdOrNull(placeId) ?: run {
            logger.warn("Place not found: $placeId")
            return null
        }
        return enrichAndSave(place)
    }

    /** Get current enrichment for a place (public-facing). */
    @Transactional(readOnly = true)
    fun getEnrichment(placeId: UUID): AiEnrichmentDto? {
        return enrichmentRepository.findByPlaceId(placeId)?.toDto()
    }

    /**
     * Enrich all places in a Malaysian state, one at a time with rate limiting.
     * Skips already-enriched places unless forceRe = true.
     * Runs async so the HTTP response returns immediately.
     */
    @Async
    fun enrichStateAsync(state: String, forceRe: Boolean = false) {
        if (!batchRunning.compareAndSet(false, true)) {
            logger.warn("Batch enrichment already running for ${batchState}, ignoring request for $state")
            return
        }

        batchState.clear()
        batchState.append(state)
        batchProgress.set(0)

        try {
            val places = placeRepository.findByStateIgnoreCase(state)
            val toEnrich = if (forceRe) places else {
                val enrichedIds = enrichmentRepository.findAll()
                    .filter { e -> places.any { p -> p.id == e.placeId } }
                    .map { it.placeId }.toSet()
                places.filter { it.id !in enrichedIds }
            }

            batchTotal.set(toEnrich.size)
            logger.info("Starting AI enrichment for $state: ${toEnrich.size} places to enrich")

            for (place in toEnrich) {
                try {
                    enrichAndSave(place)
                    batchProgress.incrementAndGet()
                    Thread.sleep(delayBetweenCallsMs)
                } catch (e: InterruptedException) {
                    Thread.currentThread().interrupt()
                    logger.warn("Enrichment batch interrupted for $state")
                    break
                } catch (e: Exception) {
                    logger.error("Failed to enrich ${place.name} (${place.id}): ${e.message}")
                    batchProgress.incrementAndGet()
                }
            }

            logger.info("Enrichment complete for $state: ${batchProgress.get()}/${toEnrich.size} processed")
        } finally {
            batchRunning.set(false)
        }
    }

    fun getBatchProgress(): EnrichmentProgress = EnrichmentProgress(
        running = batchRunning.get(),
        processed = batchProgress.get(),
        total = batchTotal.get(),
        currentState = batchState.toString()
    )

    fun getStateStats(state: String): StateStats {
        val total = enrichmentRepository.countTotalByState(state)
        val enriched = enrichmentRepository.countEnrichedByState(state)
        return StateStats(
            state = state,
            total = total,
            enriched = enriched,
            unenriched = total - enriched,
            verifiedCount = enrichmentRepository.countByTier("VERIFIED"),
            inferredCount = enrichmentRepository.countByTier("INFERRED"),
            assumptionCount = enrichmentRepository.countByTier("ASSUMPTION")
        )
    }

    @Transactional
    private fun enrichAndSave(place: Place): AiEnrichmentDto? {
        val result = geminiService.enrich(place) ?: return null

        val sourcesJson = objectMapper.writeValueAsString(result.sources)

        // Upsert: update existing row or insert new one
        val existing = enrichmentRepository.findByPlaceId(place.id)
        val entity = if (existing != null) {
            existing.copy(
                confidenceTier = result.confidenceTier,
                aiSummary = result.summary,
                aiReasoning = result.reasoning,
                isAccessible = result.isAccessible,
                disclaimer = result.disclaimer,
                photoUrl = result.photoUrl,
                sources = sourcesJson,
                modelUsed = result.modelUsed,
                enrichedAt = Instant.now()
            )
        } else {
            AiEnrichment(
                placeId = place.id,
                confidenceTier = result.confidenceTier,
                aiSummary = result.summary,
                aiReasoning = result.reasoning,
                isAccessible = result.isAccessible,
                disclaimer = result.disclaimer,
                photoUrl = result.photoUrl,
                sources = sourcesJson,
                modelUsed = result.modelUsed
            )
        }

        val saved = enrichmentRepository.save(entity)
        logger.debug("Enriched ${place.name}: tier=${result.confidenceTier}")
        return saved.toDto()
    }

    private fun AiEnrichment.toDto(): AiEnrichmentDto {
        val sourceList: List<AiSource> = try {
            objectMapper.readValue(sources)
        } catch (_: Exception) { emptyList() }

        return AiEnrichmentDto(
            placeId = placeId,
            confidenceTier = confidenceTier,
            aiSummary = aiSummary,
            aiReasoning = aiReasoning,
            isAccessible = isAccessible,
            disclaimer = disclaimer,
            photoUrl = photoUrl,
            sources = sourceList,
            modelUsed = modelUsed,
            enrichedAt = enrichedAt
        )
    }
}
