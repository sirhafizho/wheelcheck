package com.wheelcheck.enrichment

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.wheelcheck.place.Place
import com.wheelcheck.place.PlaceRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

@Service
class AiEnrichmentService(
    private val geminiService: GeminiEnrichmentService,
    private val enrichmentRepository: AiEnrichmentRepository,
    private val placeRepository: PlaceRepository,
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.gemini.daily-cap:1400}") private val dailyCap: Int
) {
    private val logger = LoggerFactory.getLogger(AiEnrichmentService::class.java)

    // Gemini free tier: 15 req/min. We use 8/min to stay safe.
    private val delayBetweenCallsMs = 8_000L
    private val batchRunning = AtomicBoolean(false)
    private val batchProgress = AtomicInteger(0)
    private val batchTotal = AtomicInteger(0)
    private val batchState = StringBuilder()

    // Daily quota tracking — resets automatically when date changes
    private val quotaCallsToday = AtomicInteger(0)
    @Volatile private var quotaDate: LocalDate = LocalDate.now()

    data class EnrichmentProgress(
        val running: Boolean,
        val processed: Int,
        val total: Int,
        val currentState: String,
        val quotaUsedToday: Int,
        val quotaCap: Int,
        val quotaRemaining: Int
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
        if (!checkAndIncrementQuota()) {
            logger.warn("Daily Gemini quota cap ($dailyCap) reached — skipping single enrichment for $placeId")
            return null
        }
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
            val placeIds: List<UUID> = if (forceRe) {
                placeRepository.findByStateIgnoreCase(state).map { it.id }
            } else {
                enrichmentRepository.findUnenrichedPlaceIdsByState(state)
            }

            batchTotal.set(placeIds.size)
            logger.info("Starting AI enrichment for $state: ${placeIds.size} places to enrich")

            for (placeId in placeIds) {
                if (!checkAndIncrementQuota()) {
                    logger.warn("Daily Gemini quota cap ($dailyCap) reached after ${batchProgress.get()} places — stopping batch for $state")
                    break
                }
                try {
                    val place = placeRepository.findByIdOrNull(placeId) ?: continue
                    enrichAndSave(place)
                    batchProgress.incrementAndGet()
                    Thread.sleep(delayBetweenCallsMs)
                } catch (e: InterruptedException) {
                    Thread.currentThread().interrupt()
                    logger.warn("Enrichment batch interrupted for $state")
                    break
                } catch (e: Exception) {
                    logger.error("Failed to enrich place $placeId: ${e.message}")
                    batchProgress.incrementAndGet()
                }
            }

            logger.info("Enrichment complete for $state: ${batchProgress.get()}/${placeIds.size} processed")
        } finally {
            batchRunning.set(false)
        }
    }

    fun getBatchProgress(): EnrichmentProgress = EnrichmentProgress(
        running = batchRunning.get(),
        processed = batchProgress.get(),
        total = batchTotal.get(),
        currentState = batchState.toString(),
        quotaUsedToday = currentDayQuota(),
        quotaCap = dailyCap,
        quotaRemaining = (dailyCap - currentDayQuota()).coerceAtLeast(0)
    )

    /**
     * Returns true and increments the counter if we are within today's cap.
     * Resets the counter if the date has changed (new day).
     */
    private fun checkAndIncrementQuota(): Boolean {
        val today = LocalDate.now()
        if (today != quotaDate) {
            synchronized(this) {
                if (today != quotaDate) {
                    logger.info("New day — resetting Gemini daily quota counter")
                    quotaCallsToday.set(0)
                    quotaDate = today
                }
            }
        }
        val current = quotaCallsToday.incrementAndGet()
        if (current > dailyCap) {
            quotaCallsToday.decrementAndGet()
            return false
        }
        return true
    }

    private fun currentDayQuota(): Int {
        val today = LocalDate.now()
        if (today != quotaDate) return 0
        return quotaCallsToday.get()
    }

    fun getStateStats(state: String): StateStats {
        val total = enrichmentRepository.countTotalByState(state)
        val enriched = enrichmentRepository.countEnrichedByState(state)
        return StateStats(
            state = state,
            total = total,
            enriched = enriched,
            unenriched = total - enriched,
            verifiedCount = enrichmentRepository.countByStateAndTier(state, "VERIFIED"),
            inferredCount = enrichmentRepository.countByStateAndTier(state, "INFERRED"),
            assumptionCount = enrichmentRepository.countByStateAndTier(state, "ASSUMPTION")
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
