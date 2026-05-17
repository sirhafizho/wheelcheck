package com.wheelcheck.search

import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * Background scheduler that gradually embeds all places that don't have embeddings yet.
 * Runs every 10 minutes and embeds up to 50 places per run to respect HF API rate limits.
 * Only active when wheelcheck.huggingface.embedding-scheduler.enabled=true
 */
@Component
@ConditionalOnProperty(name = ["wheelcheck.huggingface.embedding-scheduler.enabled"], havingValue = "true", matchIfMissing = false)
class PlaceEmbeddingScheduler(
    private val embeddingService: EmbeddingService,
    private val embeddingRepository: PlaceEmbeddingRepository
) {
    private val logger = LoggerFactory.getLogger(PlaceEmbeddingScheduler::class.java)

    @Scheduled(fixedDelay = 600_000)
    fun embedPendingPlaces() {
        val unembedded = embeddingRepository.findUnembeddedIds(50)
        if (unembedded.isEmpty()) {
            logger.debug("All places have embeddings")
            return
        }

        logger.info("Embedding ${unembedded.size} places (${embeddingRepository.countWithEmbeddings()}/${embeddingRepository.countTotal()} done)")
        var success = 0
        for ((id, text) in unembedded) {
            try {
                val vector = embeddingService.embed(text) ?: continue
                embeddingRepository.saveEmbedding(id, embeddingService.toVectorString(vector))
                success++
                Thread.sleep(300)
            } catch (e: Exception) {
                logger.warn("Failed to embed place $id: ${e.message}")
            }
        }
        logger.info("Embedded $success/${unembedded.size} places this run")
    }
}
