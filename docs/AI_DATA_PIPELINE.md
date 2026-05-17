# AI-Powered Accessibility Data Pipeline

## Goal
Auto-populate wheelcheck place listings with accessibility data using AI + free web data sources, with clear confidence tiers so users know what's verified vs. AI-inferred.

Wrong data is dangerous for wheelchair users — confidence transparency is non-negotiable.

---

## Data Sources (Free / Low Cost, Best First)

### Tier 1 — Verified (Highest Confidence)
- **Google Places API** — structured fields: `wheelchairAccessibleEntrance`, `wheelchairAccessibleParking`, `wheelchairAccessibleRestroom`, `wheelchairAccessibleSeating`. Also returns real user photos. Free within quota (generous for small-medium scale).
- **OSM (OpenStreetMap)** — `wheelchair=yes/no/limited` tags on many places. Free, no API key needed via Overpass API.

### Tier 2 — Inferred from Web (Medium Confidence)
- **Serper.dev / Brave Search API** — search `"[place name] wheelchair accessible"` and feed top results + snippets to LLM. Serper.dev has a free tier (2,500 queries/month).
- **Claude / Gemini API** — synthesize search snippets into structured output with sources cited. Assign confidence score.
- **Building certification databases** — LEED, GreenMark, Malaysian UBBL compliance (post-1991 buildings legally required to be accessible). Infer from known certifications.

### Tier 3 — AI Assumption (Lowest Confidence, Must Be Labeled)
- LLM inference based on: building age, type, size, country regulations, architectural standards.
- Must always show disclaimer + source list.

---

## Pipeline Architecture

```
[Place added to wheelcheck]
        ↓
[Google Places API] → structured accessibility fields + photos
        ↓
[Overpass API / OSM] → wheelchair tags
        ↓
[Serper/Brave Search] → top web results for "[place] wheelchair accessible"
        ↓
[Claude/Gemini API] → synthesize all above into:
  - accessibility_summary (string)
  - confidence_tier (verified/inferred/assumption)
  - sources (array of {url, title, excerpt})
  - photo_evidence (array of image URLs)
  - reasoning_narrative (string, shown in popout)
        ↓
[Store in DB with confidence metadata]
        ↓
[Display on place card with AI Reasoning indicator]
```

---

## UI Design — AI Reasoning Component

### On the Place Card
- Small indicator below the main accessibility info:
  `"AI Reasoning — [short summary e.g. inferred from LEED Gold certification and Malaysian UBBL]"`
- Visually distinct from user reviews and verified data — different color/icon (e.g. sparkle icon)

### Expand Interaction
- Tap/click the indicator → opens a **sidebar or popout panel**
- Panel contains:
  - Full AI reasoning explanation
  - Sources list with links (news articles, Google Maps data, certification records)
  - Photo evidence where available (Google Places Photos API or scraped images)
  - Confidence tier label: `Verified` / `Inferred` / `AI Assumption`
  - Disclaimer for Inferred/AI Assumption: "This was not directly confirmed. Based on [X]. We recommend calling ahead."

### Key Design Principle
AI Reasoning is a **separate content layer** from:
- User reviews/discussion
- Admin-entered data
- Verified source data

Users must never confuse AI inference with ground-truth confirmation.

---

## Implementation Steps
1. Set up Google Places API key and test structured accessibility fields
2. Set up Serper.dev free tier for web search
3. Write LLM prompt that takes search results + Places data → structured JSON with sources
4. Design the AI Reasoning popout/sidebar component
5. Add confidence tier badge system to place cards
