package com.wheelcheck.enrichment

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.wheelcheck.place.Place
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

/**
 * Calls the Gemini API to assess wheelchair accessibility for a Malaysian place.
 *
 * Uses standard text generation (no search grounding) which works reliably on
 * the free tier without requiring billing. Gemini's training data contains
 * sufficient knowledge about Malaysian venues for INFERRED/ASSUMPTION tier results.
 *
 * Free tier limits: 1,500 req/day, 15 req/min (gemini-2.5-flash).
 * API key: https://aistudio.google.com → Get API key
 *
 * If no API key is configured, falls back to OSM rule-based enrichment.
 */
@Service
class GeminiEnrichmentService(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.gemini.api-key:}") private val apiKey: String,
    @Value("\${wheelcheck.gemini.model:gemini-2.5-flash}") private val model: String,
    @Value("\${wheelcheck.gemini.enabled:true}") private val enabled: Boolean
) {
    private val logger = LoggerFactory.getLogger(GeminiEnrichmentService::class.java)
    private val restTemplate = RestTemplate()
    private val baseUrl = "https://generativelanguage.googleapis.com/v1/models"

    data class GeminiResult(
        val summary: String,
        val confidenceTier: String,
        val isAccessible: Boolean?,
        val reasoning: String,
        val disclaimer: String?,
        val sources: List<AiSource>,
        val photoUrl: String?,
        val modelUsed: String
    )

    fun enrich(place: Place): GeminiResult? {
        if (!enabled || apiKey.isBlank()) {
            logger.debug("Gemini disabled or no API key — using OSM rule-based enrichment for ${place.name}")
            return buildOsmFallback(place)
        }
        return try {
            callGemini(place)
        } catch (e: Exception) {
            logger.warn("Gemini call failed for ${place.name}: ${e.message} — falling back to OSM")
            buildOsmFallback(place)
        }
    }

    private fun callGemini(place: Place): GeminiResult {
        val prompt = buildPrompt(place)
        val requestBody = mapOf(
            "contents" to listOf(
                mapOf("role" to "user", "parts" to listOf(mapOf("text" to prompt)))
            ),
            "generationConfig" to mapOf(
                "temperature" to 0.1,
                "maxOutputTokens" to 1024
            )
        )

        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }
        val response = restTemplate.postForObject(
            "$baseUrl/$model:generateContent?key=$apiKey",
            HttpEntity(requestBody, headers),
            Map::class.java
        ) ?: throw RuntimeException("Empty response from Gemini")

        return parseGeminiResponse(response, place)
    }

    private fun buildPrompt(place: Place): String {
        val osmInfo = buildList<String> {
            place.osmWheelchairTag?.let { add("OSM wheelchair tag: $it") }
            place.osmToiletAccessible?.let { add("Accessible toilet: $it") }
            place.osmTactilePaving?.let { add("Tactile paving: $it") }
            place.osmSurface?.let { add("Surface: $it") }
            place.osmIncline?.let { add("Incline: $it") }
            place.osmEntranceWheelchair?.let { add("Entrance wheelchair: $it") }
        }.joinToString(", ").ifBlank { "No OSM data available" }

        return """
You are a wheelchair accessibility research assistant for Malaysia.
Assess the wheelchair accessibility of this place based on your knowledge.

Place Details:
- Name: ${place.name}
- Category: ${place.category.name.lowercase().replace('_', ' ')}
- City: ${place.city}
- State: ${place.state ?: "Malaysia"}
- Address: ${place.address ?: "not specified"}
- OSM Data: $osmInfo

Consider:
1. Any known accessibility features for this specific venue
2. Malaysian UBBL compliance (post-1991 buildings legally required to be accessible)
3. Building type and typical accessibility for this category in Malaysia

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "1-2 sentence summary of wheelchair accessibility",
  "confidence_tier": "VERIFIED or INFERRED or ASSUMPTION",
  "is_accessible": true or false or null,
  "reasoning": "Full explanation of your assessment including any specific evidence",
  "disclaimer": "Required if tier is INFERRED or ASSUMPTION",
  "photo_url": null
}

confidence_tier rules:
- VERIFIED: Direct confirmation from OSM data or well-known official source
- INFERRED: Indirect evidence (building type, UBBL compliance, partial info)
- ASSUMPTION: No specific info; based on general Malaysian building standards only

Be honest about confidence. Most results will be INFERRED or ASSUMPTION.
        """.trimIndent()
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseGeminiResponse(response: Map<*, *>, place: Place): GeminiResult {
        val candidates = response["candidates"] as? List<*> ?: emptyList<Any>()
        val candidate = candidates.firstOrNull() as? Map<*, *>
            ?: throw RuntimeException("No candidates in Gemini response")

        val content = candidate["content"] as? Map<*, *>
            ?: throw RuntimeException("No content in Gemini candidate")
        val parts = content["parts"] as? List<*> ?: emptyList<Any>()

        // Pick first part with non-blank text (skip thought/signature parts)
        val text = parts.mapNotNull { (it as? Map<*, *>)?.get("text") as? String }
            .firstOrNull { it.isNotBlank() }
            ?: throw RuntimeException("No text in Gemini response parts")

        val jsonText = text
            .replace(Regex("^```json\\s*", RegexOption.MULTILINE), "")
            .replace(Regex("^```\\s*", RegexOption.MULTILINE), "")
            .trim()

        val parsed = try {
            objectMapper.readValue<Map<String, Any?>>(jsonText)
        } catch (e: Exception) {
            logger.warn("Failed to parse Gemini JSON for ${place.name}: ${e.message}")
            return buildOsmFallback(place) ?: buildDefaultAssumption(place)
        }

        val tier = (parsed["confidence_tier"] as? String)?.uppercase()
            ?.takeIf { it in setOf("VERIFIED", "INFERRED", "ASSUMPTION") } ?: "ASSUMPTION"
        val actualModel = (response["modelVersion"] as? String) ?: model

        return GeminiResult(
            summary = (parsed["summary"] as? String) ?: "Accessibility information unavailable.",
            confidenceTier = tier,
            isAccessible = parsed["is_accessible"] as? Boolean,
            reasoning = (parsed["reasoning"] as? String) ?: "No detailed reasoning available.",
            disclaimer = parsed["disclaimer"] as? String,
            sources = emptyList(),
            photoUrl = null,
            modelUsed = actualModel
        )
    }

    private fun buildOsmFallback(place: Place): GeminiResult? = when (place.osmWheelchairTag?.lowercase()) {
        "yes" -> GeminiResult(
            summary = "${place.name} is marked as wheelchair accessible in OpenStreetMap.",
            confidenceTier = "VERIFIED", isAccessible = true,
            reasoning = "OpenStreetMap contributors have tagged this place wheelchair=yes.",
            disclaimer = null,
            sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=yes")),
            photoUrl = null, modelUsed = "osm-rule-based"
        )
        "limited" -> GeminiResult(
            summary = "${place.name} has limited wheelchair accessibility according to OpenStreetMap.",
            confidenceTier = "INFERRED", isAccessible = null,
            reasoning = "OpenStreetMap wheelchair=limited: partially accessible but may have barriers such as steps or narrow passages.",
            disclaimer = "Limited accessibility — we recommend calling ahead to confirm.",
            sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=limited")),
            photoUrl = null, modelUsed = "osm-rule-based"
        )
        "no" -> GeminiResult(
            summary = "${place.name} is marked as not wheelchair accessible in OpenStreetMap.",
            confidenceTier = "VERIFIED", isAccessible = false,
            reasoning = "OpenStreetMap wheelchair=no: significant barriers to wheelchair access reported.",
            disclaimer = "Conditions may have changed — please confirm before visiting.",
            sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=no")),
            photoUrl = null, modelUsed = "osm-rule-based"
        )
        else -> buildDefaultAssumption(place)
    }

    private fun buildDefaultAssumption(place: Place) = GeminiResult(
        summary = "Wheelchair accessibility for ${place.name} has not been directly verified.",
        confidenceTier = "ASSUMPTION", isAccessible = null,
        reasoning = "No specific accessibility data found. Malaysian buildings post-1991 are legally required to be accessible under UBBL, but enforcement varies. We recommend contacting the venue directly.",
        disclaimer = "This assessment is based on general Malaysian building standards only. Please call ahead before visiting.",
        sources = emptyList(), photoUrl = null, modelUsed = "rule-based"
    )
}
