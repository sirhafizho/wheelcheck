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
import java.time.Instant

/**
 * Calls Gemini 1.5 Flash with Google Search Grounding to research wheelchair
 * accessibility for a specific Malaysian place.
 *
 * Search grounding means Gemini actually Googles the place in real-time and
 * returns cited source URLs alongside its assessment. This is free tier
 * (1,500 req/day, 15 req/min for Flash).
 *
 * API key is optional: if not configured, the service returns an OSM-based
 * rule-derived result instead (no external call).
 */
@Service
class GeminiEnrichmentService(
    private val objectMapper: ObjectMapper,
    @Value("\${wheelcheck.gemini.api-key:}") private val apiKey: String,
    @Value("\${wheelcheck.gemini.model:gemini-1.5-flash}") private val model: String,
    @Value("\${wheelcheck.gemini.enabled:true}") private val enabled: Boolean
) {
    private val logger = LoggerFactory.getLogger(GeminiEnrichmentService::class.java)
    private val restTemplate = RestTemplate()
    private val baseUrl = "https://generativelanguage.googleapis.com/v1beta/models"

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

    /**
     * Main enrichment call. Returns null if Gemini is disabled or API key missing.
     * Falls back to OSM-based result if Gemini fails.
     */
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
        val requestBody = buildRequestBody(prompt)

        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }
        val entity = HttpEntity(requestBody, headers)
        val url = "$baseUrl/$model:generateContent?key=$apiKey"

        val response = restTemplate.postForObject(url, entity, Map::class.java)
            ?: throw RuntimeException("Empty response from Gemini")

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
Research the wheelchair accessibility of this specific place using Google Search and provide your assessment.

Place Details:
- Name: ${place.name}
- Category: ${place.category.name.lowercase().replace('_', ' ')}
- City: ${place.city}
- State: ${place.state ?: "Malaysia"}
- Address: ${place.address ?: "not specified"}
- OSM Data: $osmInfo

Search for this specific venue online. Look for:
1. Official accessibility statements on the venue's website
2. Reviews mentioning wheelchair access, ramps, lifts, accessible toilets
3. News articles or disability advocacy reports about this venue
4. Malaysian UBBL compliance (post-1991 buildings legally required to be accessible)

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "1-2 sentence summary of wheelchair accessibility",
  "confidence_tier": "VERIFIED or INFERRED or ASSUMPTION",
  "is_accessible": true or false or null,
  "reasoning": "Full explanation of how you determined accessibility, including specific evidence found",
  "disclaimer": "Required if tier is INFERRED or ASSUMPTION — e.g. 'This was not directly confirmed. We recommend calling ahead.'",
  "photo_url": "URL to a relevant photo if found online, or null"
}

confidence_tier rules:
- VERIFIED: You found direct, specific confirmation (official source, accessibility audit, recent user review mentioning wheelchair access)
- INFERRED: Indirect evidence (building type suggests compliance, similar nearby venues are accessible, partial info)
- ASSUMPTION: No specific info found; assessment based on general Malaysian building standards only

Important: Be honest about confidence. Do not claim VERIFIED unless you actually found specific evidence for THIS place.
        """.trimIndent()
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildRequestBody(prompt: String): Map<String, Any> {
        return mapOf(
            "contents" to listOf(
                mapOf(
                    "role" to "user",
                    "parts" to listOf(mapOf("text" to prompt))
                )
            ),
            "tools" to listOf(
                mapOf(
                    "google_search_retrieval" to mapOf(
                        "dynamic_retrieval_config" to mapOf(
                            "mode" to "MODE_DYNAMIC",
                            "dynamic_threshold" to 0.3
                        )
                    )
                )
            ),
            "generationConfig" to mapOf(
                "temperature" to 0.1,
                "maxOutputTokens" to 1024
            )
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseGeminiResponse(response: Map<*, *>, place: Place): GeminiResult {
        val candidates = response["candidates"] as? List<*> ?: emptyList<Any>()
        val candidate = candidates.firstOrNull() as? Map<*, *>
            ?: throw RuntimeException("No candidates in Gemini response")

        val content = candidate["content"] as? Map<*, *>
            ?: throw RuntimeException("No content in Gemini candidate")
        val parts = content["parts"] as? List<*> ?: emptyList<Any>()
        val text = (parts.firstOrNull() as? Map<*, *>)?.get("text") as? String
            ?: throw RuntimeException("No text in Gemini response parts")

        // Extract grounding sources
        val sources = extractSources(candidate)

        // Parse JSON from text (strip markdown fences if present)
        val jsonText = text
            .replace(Regex("^```json\\s*", RegexOption.MULTILINE), "")
            .replace(Regex("^```\\s*", RegexOption.MULTILINE), "")
            .trim()

        val parsed = try {
            objectMapper.readValue<Map<String, Any?>>(jsonText)
        } catch (e: Exception) {
            logger.warn("Failed to parse Gemini JSON for ${place.name}: ${e.message}")
            // Return ASSUMPTION fallback
            return buildOsmFallback(place) ?: buildDefaultAssumption(place)
        }

        val tier = (parsed["confidence_tier"] as? String)?.uppercase()
            ?.takeIf { it in setOf("VERIFIED", "INFERRED", "ASSUMPTION") } ?: "ASSUMPTION"

        return GeminiResult(
            summary = (parsed["summary"] as? String) ?: "Accessibility information unavailable.",
            confidenceTier = tier,
            isAccessible = parsed["is_accessible"] as? Boolean,
            reasoning = (parsed["reasoning"] as? String) ?: "No detailed reasoning available.",
            disclaimer = parsed["disclaimer"] as? String,
            sources = sources,
            photoUrl = parsed["photo_url"] as? String,
            modelUsed = "$model (search grounded)"
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun extractSources(candidate: Map<*, *>): List<AiSource> {
        return try {
            val grounding = candidate["groundingMetadata"] as? Map<*, *> ?: return emptyList()
            val attributions = grounding["groundingAttributions"] as? List<*> ?: emptyList<Any>()
            attributions.mapNotNull { attr ->
                val a = attr as? Map<*, *> ?: return@mapNotNull null
                val web = a["web"] as? Map<*, *> ?: return@mapNotNull null
                val uri = web["uri"] as? String ?: return@mapNotNull null
                val title = web["title"] as? String ?: uri
                val segment = a["segment"] as? Map<*, *>
                val snippet = segment?.get("text") as? String
                AiSource(url = uri, title = title, snippet = snippet?.take(200))
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Rule-based fallback when Gemini is unavailable.
     * Uses OSM wheelchair tag if present, otherwise returns a category-based assumption.
     */
    private fun buildOsmFallback(place: Place): GeminiResult? {
        val tag = place.osmWheelchairTag
        return when (tag?.lowercase()) {
            "yes" -> GeminiResult(
                summary = "${place.name} is marked as wheelchair accessible in OpenStreetMap.",
                confidenceTier = "VERIFIED",
                isAccessible = true,
                reasoning = "OpenStreetMap contributors have tagged this place with wheelchair=yes, indicating it has been assessed as accessible.",
                disclaimer = null,
                sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=yes")),
                photoUrl = null,
                modelUsed = "osm-rule-based"
            )
            "limited" -> GeminiResult(
                summary = "${place.name} has limited wheelchair accessibility according to OpenStreetMap.",
                confidenceTier = "INFERRED",
                isAccessible = null,
                reasoning = "OpenStreetMap contributors have tagged this place with wheelchair=limited. This typically means the venue is partially accessible but may have barriers such as steps at the entrance or narrow passages.",
                disclaimer = "Limited accessibility — some areas or features may not be reachable by wheelchair. We recommend calling ahead to confirm.",
                sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=limited")),
                photoUrl = null,
                modelUsed = "osm-rule-based"
            )
            "no" -> GeminiResult(
                summary = "${place.name} is marked as not wheelchair accessible in OpenStreetMap.",
                confidenceTier = "VERIFIED",
                isAccessible = false,
                reasoning = "OpenStreetMap contributors have tagged this place with wheelchair=no, indicating significant barriers to wheelchair access.",
                disclaimer = "This place has been identified as not wheelchair accessible. Conditions may have changed — please confirm before visiting.",
                sources = listOf(AiSource("https://www.openstreetmap.org/", "OpenStreetMap", "wheelchair=no")),
                photoUrl = null,
                modelUsed = "osm-rule-based"
            )
            else -> buildDefaultAssumption(place)
        }
    }

    private fun buildDefaultAssumption(place: Place): GeminiResult {
        val category = place.category.name.lowercase().replace('_', ' ')
        return GeminiResult(
            summary = "Wheelchair accessibility for ${place.name} has not been directly verified.",
            confidenceTier = "ASSUMPTION",
            isAccessible = null,
            reasoning = "No specific accessibility data was found for this $category. Malaysian buildings constructed after 1991 are legally required to meet accessibility standards under UBBL, but enforcement varies. We recommend contacting the venue directly.",
            disclaimer = "This assessment is based on general Malaysian building standards only, not direct verification. Please call ahead to confirm accessibility before visiting.",
            sources = emptyList(),
            photoUrl = null,
            modelUsed = "rule-based"
        )
    }
}
