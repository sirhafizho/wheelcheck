package com.wheelcheck.search

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

/**
 * Generates 384-dim text embeddings using HuggingFace Inference API.
 * Model: sentence-transformers/all-MiniLM-L6-v2 (free tier, no billing required)
 *
 * Rate limits (free, no token): ~300 req/hr
 * Rate limits (free token):     ~1000 req/hr
 */
@Service
class EmbeddingService(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.huggingface.api-token:}") private val apiToken: String
) {
    private val logger = LoggerFactory.getLogger(EmbeddingService::class.java)
    private val restTemplate = RestTemplate()
    private val hfUrl = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

    fun embed(text: String): FloatArray? {
        return try {
            val headers = HttpHeaders()
            headers.contentType = MediaType.APPLICATION_JSON
            if (apiToken.isNotBlank()) {
                headers.setBearerAuth(apiToken)
            }
            val body = objectMapper.writeValueAsString(mapOf("inputs" to text, "options" to mapOf("wait_for_model" to true)))
            val response = restTemplate.postForObject(hfUrl, HttpEntity(body, headers), String::class.java)
                ?: return null

            val parsed = objectMapper.readTree(response)
            when {
                parsed.isArray && parsed.size() > 0 && parsed[0].isArray -> {
                    val inner = parsed[0]
                    FloatArray(inner.size()) { inner[it].floatValue() }
                }
                parsed.isArray && parsed.size() > 0 && parsed[0].isNumber -> {
                    FloatArray(parsed.size()) { parsed[it].floatValue() }
                }
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Embedding failed for text '${text.take(50)}': ${e.message}")
            null
        }
    }

    fun toVectorString(embedding: FloatArray): String =
        embedding.joinToString(",", "[", "]")
}
