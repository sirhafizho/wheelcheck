# AI Accessibility Enrichment Pipeline

Wheelcheck uses Gemini 1.5 Flash with **Google Search Grounding** to research wheelchair accessibility for each place. This means Gemini actually Googles the venue in real-time and cites its sources — not just trained knowledge.

## How It Works

```
Place in DB (name, city, state, category)
    ↓
Gemini 1.5 Flash + Google Search Grounding
    → Searches for "[place name] wheelchair accessible Malaysia"
    → Synthesizes findings into structured JSON
    → Returns cited source URLs
    ↓
Stored in ai_enrichment table
    ↓
Shown on place detail card with sparkle (✨) badge
```

## Confidence Tiers

| Tier | Meaning | Badge |
|---|---|---|
| **VERIFIED** | Direct confirmation found (official source, accessibility audit, user review) | 🟢 Green |
| **INFERRED** | Indirect evidence (building type, UBBL compliance, similar venues nearby) | 🟡 Amber |
| **ASSUMPTION** | No specific info found; based on general Malaysian building standards | ⚪ Gray |

> **Important**: Wrong accessibility data can be dangerous for wheelchair users. The confidence tier is always shown prominently and a disclaimer is displayed for INFERRED/ASSUMPTION results.

## Setup

### 1. Get a free Gemini API key

Visit [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier includes:
- 1,500 requests/day
- 15 requests/minute

### 2. Configure

Add to your backend `.env` or environment:

```env
GEMINI_API_KEY=your_key_here
```

Or in `application.yml`:
```yaml
wheelcheck:
  gemini:
    api-key: your_key_here
    model: gemini-1.5-flash  # default
    enabled: true             # set false to disable
```

If `GEMINI_API_KEY` is not set, the pipeline falls back to **OSM rule-based enrichment** (free, no API key needed) using the existing wheelchair tags.

## Running Enrichment

### Enrich a single place

```bash
curl -X POST http://localhost:8080/api/admin/enrich/place/{placeId} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Enrich all places in a state (batch, rate-limited)

```bash
# Start Terengganu (smallest state — good starting point)
curl -X POST "http://localhost:8080/api/admin/enrich/state/Terengganu" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check progress
curl http://localhost:8080/api/admin/enrich/progress \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# View stats for a state
curl http://localhost:8080/api/admin/enrich/stats/Terengganu \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Rate limiting**: The batch runner pauses 8 seconds between calls (~7.5 req/min) to stay safely within the 15 req/min free tier limit. Terengganu has ~few hundred places.

### Recommended enrichment order

Start small and verify quality before scaling:

1. `Terengganu` — smallest, verify quality
2. `Kelantan`
3. `Perlis`
4. `Negeri Sembilan`
5. `Melaka`
6. Scale up to larger states (Selangor, KL) after validation

### Re-enriching places

Add `?forceRe=true` to re-process already-enriched places:

```bash
curl -X POST "http://localhost:8080/api/admin/enrich/state/Terengganu?forceRe=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Frontend Display

The AI enrichment panel appears automatically on place detail cards when enrichment data exists. It shows:

- A sparkle (✨) badge with the confidence tier color
- Summary text visible immediately
- Click to expand: full reasoning, cited sources with links, disclaimer
- "Powered by gemini-1.5-flash (search grounded)" attribution

## Fallback Behavior

| Scenario | Behavior |
|---|---|
| `GEMINI_API_KEY` not set | OSM rule-based enrichment (wheelchair=yes/limited/no) |
| Gemini API error | OSM rule-based fallback |
| No OSM tags either | Generic ASSUMPTION with UBBL disclaimer |
| Place not enriched yet | No badge shown (panel hidden) |
