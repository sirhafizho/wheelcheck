# WheelCheck — Free AI Tools & Enhancements Research

> Generated 2026-05-17. Use this as a briefing doc when asking an AI agent to implement any of these features.

---

## App Context (for AI agents reading this)

WheelCheck is Malaysia's open-source crowdsourced wheelchair accessibility checker — think Waze for accessibility. Users search venues on a map, view accessibility verdicts (✅ Accessible / ⚠️ Partial / ❌ Not Accessible), and submit quick reports with photo evidence.

**Stack:**
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 (deployed on Vercel)
- Backend: Spring Boot 3.3 + Kotlin (deployed on HuggingFace Spaces)
- Database: PostgreSQL 16 + PostGIS 3.4
- Maps: Leaflet.js + OpenStreetMap
- Auth: JWT (HS512), anonymous reports allowed
- i18n: next-intl (English + Bahasa Malaysia)
- Deployment: Docker Compose + Vercel (frontend) + HuggingFace Spaces (backend)

**Key routes:**
- `/[locale]/` — Home map view
- `/[locale]/places/[id]` — Place detail (reviews, comments, photos)
- `/[locale]/report/[placeId]` — Submit accessibility report wizard
- `/[locale]/add-place` — Add new venue

**Existing free data adapters (adapter pattern in backend):**
- OpenStreetMap Overpass API
- Wikidata SPARQL
- accessibility.cloud
- Geoapify Places API
- OpenRouteService (wheelchair routing)
- Prasarana GTFS (Malaysia transit)
- data.gov.my (hospitals, clinics)

---

## Part 1 — Free AI Tools & APIs

---

### 1. pgvector Semantic Search
**Cost:** Free (PostgreSQL extension — already have Postgres)
**Integration effort:** Medium
**Impact:** High

**What it does:** Enables "semantic" place search — user can type "somewhere with wide doors near me" and find accessible venues even without exact keyword matches. Currently the app uses basic `?name=` text search.

**How to implement:**
1. Enable `pgvector` extension in PostgreSQL: `CREATE EXTENSION vector;`
2. Add a `embedding vector(384)` column to the `places` table via Flyway migration
3. Use Hugging Face `all-MiniLM-L6-v2` model (free) to generate 384-dim embeddings from place name + category + review summaries
4. On place creation/update, call HF Inference API to embed the text, store in Postgres
5. On search, embed the query string and use `<->` cosine distance operator alongside existing PostGIS spatial filter
6. New backend endpoint: `GET /api/places/semantic-search?q=&lat=&lng=&radius=`

**Files to touch:**
- `backend/src/main/resources/db/migration/` — new Flyway migration for vector column
- `backend/src/main/kotlin/com/wheelcheck/place/PlaceRepository.kt` — add vector search query
- `backend/src/main/kotlin/com/wheelcheck/place/PlaceService.kt` — embedding logic
- `frontend/src/components/SearchInput.tsx` — wire to new endpoint

**Reference:** [pgvector GitHub](https://github.com/pgvector/pgvector) | [HF all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

---

### 2. Gemini Vision — Photo Auto-Analysis on Review Upload
**Cost:** Free tier (15 req/min, 1M tokens/day)
**Integration effort:** Medium
**Impact:** High

**What it does:** When a user uploads a photo during a review, send it to Gemini Vision to auto-detect accessibility features (ramp, step, accessible toilet, entrance width, parking bay) and pre-fill or suggest answers in the review wizard. This improves data quality by reducing guesswork.

**How to implement:**
1. After photo upload to `POST /api/photos/upload`, pass the image bytes to Gemini Vision API
2. Prompt: `"Analyze this photo for wheelchair accessibility features. Identify any of: ramps, steps, curb cuts, accessible toilets, wide doorways, accessible parking bays, elevators, tactile paving. Return JSON with detected features and confidence scores."`
3. Return detected features alongside the photo URL in the upload response
4. Frontend report wizard reads detected features and pre-selects relevant answers
5. Store Gemini API key in backend env var `GEMINI_API_KEY`

**API details:**
```
Model: gemini-2.0-flash
Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Auth: ?key=GEMINI_API_KEY
Free tier: 15 req/min, 1M tokens/day, no credit card required
```

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/photo/PhotoService.kt` — call Gemini after upload
- `backend/src/main/kotlin/com/wheelcheck/photo/PhotoController.kt` — add `detectedFeatures` to response DTO
- `frontend/src/app/[locale]/report/[placeId]/` — consume detected features, pre-fill wizard

**Reference:** [Google AI Studio free key](https://aistudio.google.com/app/apikey) | [Gemini Vision docs](https://ai.google.dev/gemini-api/docs/vision)

---

### 3. Meilisearch — Typo-Tolerant Fast Search
**Cost:** Free (self-hosted Docker)
**Integration effort:** Medium
**Impact:** High

**What it does:** Replaces the current basic `?name=` text search with instant, typo-tolerant, faceted search. Users can search "wheelchar ramp KLCC" and still get results. Supports filtering by category + state + accessibility level simultaneously with rankings tuned by review count.

**How to implement:**
1. Add Meilisearch container to `docker-compose.yml` (port 7700)
2. On backend startup, index all places into Meilisearch (name, nameMs, category, state, accessibilityLevel, reviewCount)
3. Configure ranking: weight by `reviewCount` and `accessibilityLevel`
4. Replace `GET /api/places/search?name=` to proxy through Meilisearch
5. On place create/update/delete, sync to Meilisearch index

**Docker Compose addition:**
```yaml
meilisearch:
  image: getmeili/meilisearch:latest
  ports:
    - "7700:7700"
  environment:
    MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
  volumes:
    - meili_data:/meili_data
```

**Files to touch:**
- `docker-compose.yml` — add Meilisearch service
- `backend/build.gradle.kts` — add Meilisearch Java client dependency
- `backend/src/main/kotlin/com/wheelcheck/place/PlaceService.kt` — index sync on mutations
- `backend/src/main/kotlin/com/wheelcheck/place/PlaceController.kt` — update search endpoint

**Reference:** [Meilisearch docs](https://www.meilisearch.com/docs) | [Java client](https://github.com/meilisearch/meilisearch-java)

---

### 4. Groq API — Comment Moderation & Report Quality Scoring
**Cost:** Free tier (14,400 requests/day)
**Integration effort:** Low
**Impact:** Medium

**What it does:**
- **Comment moderation:** Before saving a comment, classify it as spam/offensive/helpful. Block or flag automatically.
- **Report quality scoring:** Given a review's notes text, score 1–5 confidence it's a genuine accessibility report. Flag low-quality submissions for admin review.

**How to implement:**
1. Add `GROQ_API_KEY` to backend env vars (free at console.groq.com)
2. Create `ModerationService.kt` with two methods: `moderateComment(text)` and `scoreReportQuality(notes)`
3. Call before persisting comments/reviews
4. Add `qualityScore` column to `AccessReport` table (Flyway migration)
5. Admin dashboard can filter/sort by quality score

**API details:**
```
Model: llama-3.3-70b-versatile (or mixtral-8x7b-32768)
Endpoint: https://api.groq.com/openai/v1/chat/completions
Free tier: 14,400 req/day, 6,000 req/min
```

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/moderation/ModerationService.kt` — new file
- `backend/src/main/kotlin/com/wheelcheck/comment/CommentService.kt` — call moderation before save
- `backend/src/main/kotlin/com/wheelcheck/review/ReviewService.kt` — call quality scorer before save
- `backend/src/main/resources/db/migration/` — add `quality_score` column

**Reference:** [Groq free API](https://console.groq.com) | [Groq docs](https://console.groq.com/docs/openai)

---

### 5. Wheelmap Adapter — Additional Free Accessibility Data
**Cost:** Free API (registration required)
**Integration effort:** Low (fits existing adapter pattern)
**Impact:** Medium

**What it does:** Wheelmap.org has ~450k crowdsourced POIs with wheelchair accessibility tags across 150+ countries. Adding a `WheelmapAdapter` brings in additional Malaysia data and could be used to cross-validate existing OSM data.

**How to implement:**
1. Register for free API key at wheelmap.org
2. Create `WheelmapAdapter.kt` implementing the existing `DataSourceAdapter` interface
3. Fetch from `https://wheelmap.org/api/nodes?bbox=&api_key=`
4. Map Wheelmap's `wheelchair` field (`yes/limited/no`) to `AccessibilityLevel` enum
5. Add `WHEELMAP` to `DataSource` enum
6. Register adapter in aggregation service

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/aggregation/adapters/WheelmapAdapter.kt` — new file
- `backend/src/main/kotlin/com/wheelcheck/place/DataSource.kt` — add `WHEELMAP` enum value
- `backend/src/main/resources/db/migration/` — update enum if needed
- `backend/src/main/resources/application.yml` — add `wheelmap.api-key` config

**Reference:** [Wheelmap API docs](https://wheelmap.org/api/docs) | [Wheelmap.org](https://wheelmap.org)

---

### 6. Mapillary — Street-Level Imagery at Venue Entrances
**Cost:** Free API (Meta-owned, API key required)
**Integration effort:** Low
**Impact:** Medium

**What it does:** Embed Mapillary street-level photos at a venue's entrance directly on the place detail page — a visual pre-visit check. Mapillary's computer vision also auto-detects accessibility features (kerb ramps, tactile paving, steps) from imagery, which can be used to enrich OSM tags.

**How to implement:**
1. Register for a free Mapillary API key (developers.mapillary.com)
2. On the place detail page, call `GET https://graph.mapillary.com/images?fields=id,thumb_1024_url&bbox=&sequence_filter=` with the place's bounding box
3. Show the nearest image in a "Street View" card above the reviews section
4. Optionally: pull detected features (`map_features` endpoint) near the venue and merge into OSM tags via the existing adapter

**Files to touch:**
- `frontend/src/components/places/PlaceDetail.tsx` — add Mapillary image card
- `frontend/src/lib/mapillary.ts` — new API client (fetch images near lat/lng)
- `backend/src/main/kotlin/com/wheelcheck/aggregation/adapters/MapillaryAdapter.kt` — optional, pull detected features

**Reference:** [Mapillary API v4 docs](https://www.mapillary.com/developer/api-documentation)

---

### 7. Web Push Notifications (PWA)
**Cost:** Free (browser Push API, no third-party)
**Integration effort:** Low
**Impact:** Medium

**What it does:** The app is already a PWA. Push notifications can alert users when:
- A favorited place gets a new accessibility report
- Their submitted report was verified by another user
- A nearby place gets a significant accessibility update

**How to implement:**
1. Generate VAPID keys (`npx web-push generate-vapid-keys`)
2. Add subscription endpoint: `POST /api/notifications/subscribe` — stores `PushSubscription` in DB
3. Add `NotificationService.kt` in backend — sends push via VAPID when events occur
4. Register service worker in Next.js (`public/sw.js`) to handle push events
5. Ask permission on first meaningful interaction (after first successful report submission)

**Files to touch:**
- `frontend/public/sw.js` — service worker push handler (currently under-implemented, see Part 2 section)
- `frontend/src/hooks/usePushNotifications.ts` — new hook
- `backend/src/main/kotlin/com/wheelcheck/notification/` — new package
- `backend/src/main/resources/db/migration/` — `push_subscriptions` table

**Reference:** [web-push npm](https://github.com/web-push-libs/web-push) | [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

### 8. Umami Analytics (Self-Hosted)
**Cost:** Free (self-hosted Docker)
**Integration effort:** Low
**Impact:** Medium

**What it does:** Privacy-friendly, GDPR-compliant analytics with no cookie banners. Reveals: which places are viewed most, which states have highest report activity, drop-off points in the report wizard, popular search terms.

**How to implement:**
1. Add Umami to `docker-compose.yml` (needs its own Postgres DB or share existing)
2. Create a website in Umami dashboard, get tracking script
3. Add tracking script to `frontend/src/app/layout.tsx`
4. Track custom events: report submitted, place added, search performed, filter used

**Docker Compose addition:**
```yaml
umami:
  image: ghcr.io/umami-software/umami:postgresql-latest
  ports:
    - "3001:3000"
  environment:
    DATABASE_URL: postgresql://umami:umami@umami-db:5432/umami
    APP_SECRET: ${UMAMI_SECRET}
```

**Reference:** [Umami docs](https://umami.is/docs)

---

### 9. Enhanced OSM Tags (Existing Adapter, Zero Cost)
**Cost:** Free (already using Overpass API)
**Integration effort:** Very Low
**Impact:** Low–Medium

**What it does:** The existing `OsmOverpassAdapter` can query additional OSM tags at no extra cost to provide richer accessibility data.

**Additional tags to query:**
- `kerb:tactile_paving=yes/no` — tactile paving at kerbs
- `surface=asphalt|cobblestone|gravel|grass` — surface difficulty for wheelchair users
- `entrance:wheelchair=yes/no` — per-entrance accessibility flag
- `amenity=charging_station + wheelchair=yes` — EV chair charging points
- `healthcare:wheelchair=*` — clinic/hospital wheelchair access
- `incline=up|down|%` — slope steepness for ramps

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/aggregation/adapters/OsmOverpassAdapter.kt` — extend Overpass query
- `backend/src/main/kotlin/com/wheelcheck/place/Place.kt` — add nullable fields for new tags
- `backend/src/main/resources/db/migration/` — migration for new columns

---

## Part 2 — Performance Fixes (Zero Cost)

These are bugs and gaps found by auditing the codebase. No external tools required — just code improvements.

---

### P0 — Service Worker Not Registered
**File:** `frontend/public/sw.js` + `frontend/src/app/layout.tsx`

The service worker file exists but is never registered — the offline/PWA functionality is silently broken for all users.

**Fix:** Add to `layout.tsx`:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

The `sw.js` itself is also minimal — only caches 3 URLs on install with no runtime caching, no API response caching, no offline fallback page. It needs a proper caching strategy:
- Cache-first for static assets
- Network-first with stale-while-revalidate for API responses
- Offline fallback page for navigation requests

---

### P0 — Report Wizard Has No Error Handling
**File:** `frontend/src/components/report/ReportWizard.tsx`

If the submission fails, there is no retry UI — the user loses their report with no feedback. Need to add an error state with a "Try again" button that resubmits without losing entered data.

---

### P1 — Photo Upload Is Sequential (Should Be Parallel)
**File:** `frontend/src/app/[locale]/add-place/page.tsx` lines 180–188

Photos are uploaded *after* place creation completes, adding unnecessary sequential latency. Uploading photos in parallel with the place creation request would reduce perceived submission time.

---

### P1 — Replace Manual Fetch Hooks with SWR or React Query
**File:** `frontend/src/hooks/usePlaces.ts`

All data fetching uses manual `useState`/`useEffect` with fragile race condition handling via refs (lines 14–19). This causes:
- No request deduplication when multiple components request the same data
- No automatic retry on failure
- No background revalidation when the tab regains focus
- Manual, error-prone cancellation logic

**Fix:** Replace with [SWR](https://swr.vercel.app/) (already a Vercel project — natural fit). Zero-cost, small bundle.

---

### P1 — BottomSheet Accessibility Bugs
**File:** `frontend/src/components/ui/BottomSheet.tsx`

Two issues:
1. `aria-modal="false"` (line ~250) should be `aria-modal="true"` — screen readers currently won't treat it as a modal
2. No focus trap — keyboard focus can escape the open sheet into the map behind it

**Fix:** Set `aria-modal="true"` and use the `focus-trap-react` library (free, ~2KB) or implement a manual focus trap on open.

---

### P1 — No HTTP Caching Headers on Backend Responses
**File:** `backend/src/main/kotlin/com/wheelcheck/place/PlaceController.kt`

API responses have no `Cache-Control` headers, so every map pan/zoom triggers a full fresh database query. High-read endpoints like `GET /api/places/{id}` and `GET /api/places/nearby` should have short-lived caching (`max-age=60, stale-while-revalidate=300`).

**Fix:** Add Spring `@ResponseHeader` or configure `CacheControl` in a `WebMvcConfigurer`. Also add `@Cacheable` with Caffeine cache (in-process, no Redis required) for place detail lookups.

---

### P2 — No Client-Side Image Compression Before Upload
**File:** `frontend/src/app/[locale]/add-place/page.tsx` + report wizard

Users uploading a 12MP phone photo send ~8MB to the server before the backend resizes it. Compressing client-side first reduces upload time significantly on mobile connections.

**Fix:** Use [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) (free, 30KB). Compress to max 1024px / 500KB before the `POST /api/photos/upload` call.

---

### P2 — No "Get Directions" Link on Place Detail
**File:** `frontend/src/components/places/PlaceDetail.tsx`

Users have no way to navigate to a venue from within the app. A simple deep-link to Google Maps or Apple Maps (auto-detected by OS) would be high-value with zero implementation cost.

**Fix:**
```tsx
const directionsUrl = isIOS
  ? `maps://maps.apple.com/?daddr=${lat},${lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
```

---

### P2 — Search History (localStorage)
**File:** `frontend/src/components/SearchInput.tsx` (or equivalent)

No recent searches are stored. Users who frequently check the same venues have to retype from scratch every visit.

**Fix:** Store last 5 searches in `localStorage`. Show them as suggestions when the search input is focused and empty. Zero backend cost.

---

### P3 — PWA Shortcuts Missing from manifest.json
**File:** `frontend/public/manifest.json`

The manifest has no `shortcuts` array. Adding shortcuts lets users long-press the app icon on Android to jump directly to "Add Place" or "My Reports" — free UX win.

**Fix:**
```json
"shortcuts": [
  {
    "name": "Add Place",
    "url": "/en/add-place",
    "icons": [{ "src": "/icons/add.png", "sizes": "96x96" }]
  },
  {
    "name": "My Reports",
    "url": "/en/profile",
    "icons": [{ "src": "/icons/profile.png", "sizes": "96x96" }]
  }
]
```

---

### P3 — Category Emoji Icons Have No Accessible Names
**File:** Various components rendering category chips/badges

Emoji like `🍽️` are announced as "fork and knife with plate" by screen readers, not as "restaurant". Every emoji category icon needs an `aria-label` with the category name.

---

## Part 3 — Competitor Feature Gaps

Research based on: Wheelmap, AXS Map, AccessNow, Google Maps, Yelp, Mapillary, AccessMap.

---

### HIGH IMPACT — Data Model Gaps

#### Sub-Verdicts per Accessibility Aspect
**Source:** AXS Map, Google Maps, Yelp

Currently WheelCheck produces one overall verdict. Competitors surface 4 specific boolean verdicts independently:
- Wheelchair accessible entrance
- Wheelchair accessible restroom
- Wheelchair accessible parking
- Wheelchair accessible seating/interior

These are already partially collected in the `AccessReport` entity (4 aspect ratings) but are averaged into a single verdict for display. Surface each aspect separately with its own icon badge on place cards and detail pages — users care about different aspects depending on their situation.

**Files to touch:**
- `frontend/src/components/places/PlaceDetail.tsx` — show 4 separate aspect badges instead of one
- `frontend/src/components/places/PlaceCard.tsx` — show compact aspect icons on cards

---

#### Structured Attribute Checklist (Beyond Verdicts)
**Source:** AXS Map, AccessNow, A11yJSON standard

WheelCheck collects: verdict + photo + free-text notes. Competitors collect structured checklists with specific yes/no/N/A fields that produce machine-readable, comparable data:
- Step at entrance? If yes, how many steps?
- Ramp present? Ramp gradient?
- Door width >80cm?
- Accessible toilet present? Grab bars? Roll-in shower?
- Elevator available?
- Accessible parking bays?
- Surface type (asphalt / cobblestone / gravel)?
- Hearing loop present?

**Recommendation:** Add an optional "Detailed Assessment" section in the report wizard after the 4 core questions. 6–8 boolean fields that users can optionally fill in. Store as a `JSONB` column in `AccessReport` initially — no schema churn, flexible.

**Files to touch:**
- `backend/src/main/resources/db/migration/` — add `detailed_attributes JSONB` to `access_reports`
- `frontend/src/components/report/ReportWizard.tsx` — add optional "Details" step at end
- `frontend/src/components/places/PlaceDetail.tsx` — render detailed attributes when present

---

#### Freeform Accessibility Note Field
**Source:** Wheelmap (`wheelchair:description` OSM tag)

A single freeform text field for nuanced context alongside structured fields — e.g., "ramp is available at the side entrance, ask staff". WheelCheck has a `notes` field on reports but it's not prominently surfaced on the place detail page.

**Fix:** Surface the most recent non-empty `notes` from reviews as an "Accessibility note" callout at the top of the place detail page.

---

#### Photo Categorisation
**Source:** Google Maps, Wheelmap

All uploaded photos currently go into one generic pile. Competitors tag photos by type:
- Entrance
- Interior
- Restroom
- Parking
- Other

Add a `photoType` enum field to the photo upload flow. Display photos in categorised tabs on the place detail page. Entrance photos should be shown first.

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/photo/Photo.kt` — add `photoType` enum field
- `backend/src/main/resources/db/migration/` — add column
- `frontend/src/app/[locale]/report/[placeId]/` — add photo type selector to upload step
- `frontend/src/components/places/PlaceDetail.tsx` — categorised photo tabs

---

### HIGH IMPACT — Discovery & UX Gaps

#### "Accessible Toilets Near Me" Quick Search
**Source:** Wheelmap — consistently cited as highest-value feature for wheelchair users

A dedicated button/shortcut on the home screen that instantly queries for venues tagged as having accessible toilets within 500m of the user's location. Not just a filter — a single-tap action that bypasses the full search flow.

**Files to touch:**
- `frontend/src/app/[locale]/page.tsx` — add FAB or chip for "Toilet near me"
- `backend/src/main/kotlin/com/wheelcheck/place/PlaceController.kt` — `GET /api/places/accessible-toilets-nearby?lat=&lng=`

---

#### Owner Self-Declaration Layer
**Source:** Yelp, Google My Business

Allow business owners to claim their venue and self-report accessibility features. Show these as "Owner reported" with a distinct badge, separate from community verdicts. The community can then confirm or dispute the owner's claims.

This creates a dual-trust model that Yelp and Google Maps use effectively. Owners have incentive to keep data accurate. No new data source needed — just a UI and `reportType: OWNER | COMMUNITY` flag.

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/review/AccessReport.kt` — add `reportType` enum
- `backend/src/main/kotlin/com/wheelcheck/place/` — add venue claim endpoint
- `frontend/src/components/places/PlaceDetail.tsx` — show owner-reported badge distinctly

---

### MEDIUM IMPACT — Routing Improvements

#### User-Configurable Routing Preferences
**Source:** AccessMap (University of Washington)

WheelCheck uses OpenRouteService with fixed defaults. AccessMap exposes ORS's wheelchair profile parameters as user-controlled sliders:
- Maximum incline tolerance: 3% / 6% / 10% / 15% (different chairs handle slopes differently)
- Maximum kerb height: 0cm / 3cm / 6cm / any
- Minimum path width: 0.9m / 1.2m / any
- Surface preference: paved only / all surfaces

This makes routing actually personalised per wheelchair type — a power wheelchair user vs. a manual wheelchair user have very different tolerances.

**Files to touch:**
- `frontend/src/app/[locale]/` — add routing preferences screen (or settings section)
- `frontend/src/hooks/useRouting.ts` (or equivalent) — pass params to ORS
- `backend/src/main/kotlin/com/wheelcheck/routing/RoutingController.kt` — accept and forward params to ORS

**Reference:** ORS wheelchair profile params: `maximum_incline`, `maximum_sloped_kerb`, `minimum_width`, `surface_type`

---

#### Route Surface & Steepness Overlay
**Source:** OpenRouteService `extra_info` parameter (already free, just not used)

ORS can return `steepness` and `surface` extra info alongside route geometry. Display these as a colour gradient on the route line — green (flat/smooth) to red (steep/rough) — so users can preview how challenging a route will be before committing.

**Files to touch:**
- Backend routing call — add `extra_info: ["steepness", "surface", "waycategory"]` to ORS request
- Frontend map — render route with colour gradient based on steepness values

---

### MEDIUM IMPACT — Gamification & Community

#### Contributor Leaderboard
**Source:** AXS Map — cited as a key driver of sustained community contributions

A weekly/monthly leaderboard showing top contributors by state and nationally. Simple to implement — the `users/{id}/stats` endpoint already returns contribution counts. Just needs a leaderboard page aggregating across users.

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/user/UserController.kt` — add `GET /api/leaderboard?state=&period=`
- `frontend/src/app/[locale]/leaderboard/page.tsx` — new page

---

#### Mapathon / Campaign Events
**Source:** AXS Map — drives large bursts of data collection for specific cities

Timed community mapping events: "Map Penang this weekend — top 10 contributors win badges." A simple admin-created campaign with:
- Target area (state/city)
- Start/end date
- Progress bar (venues reviewed / target)
- Live leaderboard for the campaign

**Files to touch:**
- `backend/src/main/kotlin/com/wheelcheck/campaign/` — new package
- `frontend/src/app/[locale]/campaigns/` — campaign listing + detail pages
- `frontend/src/app/[locale]/admin/` — admin UI to create campaigns

---

#### Contribution Badges / Achievements
**Source:** AXS Map, foursquare-style check-ins

Milestone badges shown on user profiles:
- "First Report" — submitted first accessibility review
- "Trailblazer" — first to review a venue
- "Local Expert" — 10+ reviews in one city
- "Verified Contributor" — 25+ verified reports
- "Mapathon Hero" — top 10 in a campaign

Zero-cost: just metadata stored against the user, shown as icons on profile.

---

## Priority Summary

### Free AI Tools
| # | Tool | Cost | Effort | Impact |
|---|------|------|--------|--------|
| 1 | pgvector semantic search | Free (Postgres ext) | Medium | High |
| 2 | Gemini Vision photo analysis | Free tier | Medium | High |
| 3 | Meilisearch typo-tolerant search | Free (self-host) | Medium | High |
| 4 | Groq comment moderation | Free tier | Low | Medium |
| 5 | Wheelmap adapter | Free API | Low | Medium |
| 6 | Mapillary street-level imagery | Free API | Low | Medium |
| 7 | Web Push notifications | Free (browser API) | Low | Medium |
| 8 | Umami analytics | Free (self-host) | Low | Medium |
| 9 | Extra OSM tags | Free | Very Low | Low–Medium |

### Performance & Bug Fixes
| # | Fix | Effort | Priority |
|---|-----|--------|----------|
| 1 | Register service worker | Very Low | P0 |
| 2 | Report wizard error handling | Low | P0 |
| 3 | Parallel photo upload | Low | P1 |
| 4 | Replace manual hooks with SWR | Medium | P1 |
| 5 | Fix BottomSheet aria-modal + focus trap | Low | P1 |
| 6 | HTTP caching headers + Caffeine cache | Low | P1 |
| 7 | Client-side image compression | Very Low | P2 |
| 8 | "Get Directions" deep link | Very Low | P2 |
| 9 | Search history (localStorage) | Very Low | P2 |
| 10 | PWA shortcuts in manifest | Very Low | P3 |
| 11 | Accessible names for emoji icons | Very Low | P3 |

### Competitor Feature Gaps
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Surface 4 sub-verdicts separately on UI | Low | High |
| 2 | "Accessible toilets near me" button | Low | High |
| 3 | Structured attribute checklist (JSONB) | Medium | High |
| 4 | Photo categorisation (entrance/restroom/etc.) | Medium | Medium |
| 5 | User-configurable routing preferences | Medium | Medium |
| 6 | Freeform accessibility note surfaced prominently | Very Low | Medium |
| 7 | Route surface/steepness colour overlay | Medium | Medium |
| 8 | Contributor leaderboard | Low | Medium |
| 9 | Owner self-declaration layer | Medium | Medium |
| 10 | Contribution badges/achievements | Medium | Low–Medium |
| 11 | Mapathon / campaign events | High | Low–Medium |

---

## Part 4 — Detailed Accessibility Data for Wheelchair Users

The current 4-aspect verdicts (entrance, toilet, parking, interior) answer *whether* a place is accessible. What users actually need is *how* accessible and *for whom* — because a manual chair user, a power chair user, and someone on a mobility scooter have completely different tolerances.

### Implementation strategy: progressive disclosure

**Do not extend the core report wizard.** Submission rates will drop. Instead:

1. **Core wizard stays identical** — 4 questions, ~30 seconds, unchanged
2. **Optional "Tell us more" step appears after submission** — "Got 2 more minutes? Help future visitors with specifics."
3. **Place detail page shows unknown fields as grey with a CTA** — "Be the first to add this info" drives contributors to fill gaps organically

**Storage:** All detailed fields go in a `detailed_attributes JSONB` column on `access_reports`. No schema churn when new fields are added later. Only render fields on the place detail page if at least one review has filled them in.

---

### Entrance fields

The entrance is the single most critical filter — it determines whether a user can get in at all.

| Field | Type | Options |
|-------|------|---------|
| `step_height` | enum | no_step / lip_under_2cm / step_3_to_10cm / multiple_steps |
| `ramp_gradient` | enum | gentle_under_5pct / moderate_5_to_8pct / steep_over_8pct / no_ramp |
| `door_type` | enum | automatic_sliding / automatic_swing / manual_push / heavy_manual |
| `door_width` | enum | narrow_under_75cm / standard_75_to_90cm / wide_over_90cm |
| `accessible_entrance_is_main` | boolean | Is the accessible entrance the same as the main entrance? |

The last field is a dignity issue — many Malaysian venues route wheelchair users through service corridors. Users want to know this upfront.

---

### Toilet fields

Accessible toilets are the trip-limiting factor — they constrain how long a user can stay and whether they can go at all.

| Field | Type | Options |
|-------|------|---------|
| `toilet_is_dedicated_cubicle` | boolean | Dedicated accessible cubicle, not just a larger stall |
| `toilet_lock_type` | enum | unlocked / radar_key / ask_staff / no_accessible_toilet |
| `toilet_grab_bars` | boolean | Grab bars present |
| `toilet_turning_space` | enum | spacious / tight_but_usable / insufficient |
| `changing_places_facility` | boolean | Full Changing Places facility available (hoist, adult changing bench) |

The `changing_places_facility` field is niche but critical for users who need personal care — it's a categorically different level of accessibility from a standard accessible toilet.

---

### Interior fields

| Field | Type | Options |
|-------|------|---------|
| `lift_available` | enum | yes / no / unreliable (frequently broken) |
| `aisle_width` | enum | spacious_power_chair / passable_manual / tight_manual_only |
| `floor_surface` | enum | smooth / carpet / uneven / cobblestone |
| `accessible_seating` | boolean | Wheelchair user can sit at a table (not just beside one) |

Lift reliability is a notorious pain point — the only accessible route in a multi-floor building depends on a lift that's frequently out of service. The `unreliable` option matters.

---

### Approach & parking fields

The journey from car or bus stop to the entrance is often where things fall apart.

| Field | Type | Options |
|-------|------|---------|
| `dropped_kerb_present` | boolean | Dropped kerb from parking/street to entrance |
| `accessible_parking_distance` | enum | close_under_30m / moderate / far / no_accessible_parking |
| `covered_accessible_route` | boolean | Is the route from parking/street to entrance covered/sheltered? |
| `pavement_quality` | enum | smooth / uneven / no_pavement |

`covered_accessible_route` is Malaysia-specific. Outdoor uncovered routes become unusable in heavy rain, which is a daily occurrence. This single field is disproportionately valuable locally.

---

### The "works for me" context field

One field competitors don't prominently feature but wheelchair users consistently say matters most: a freeform field for the reviewer's mobility context.

| Field | Type | Description |
|-------|------|-------------|
| `mobility_aid_type` | enum | manual_self_propelled / manual_attendant_pushed / power_chair / mobility_scooter / walking_aid / other |
| `reviewer_context` | text (255 chars) | e.g. "I use a lightweight folding manual chair. Aisles are tight — probably not suitable for power chairs." |

This transforms a partial verdict into actionable information. A place rated "partial" by a power chair user might be "fully accessible" for a manual chair user.

---

### What to show on the place detail page

When detailed attributes are present, surface them as an expandable "Detailed Accessibility Info" section below the main verdict. Layout suggestion:

```
[Entrance]
✅ No step at entrance
✅ Automatic sliding door
⚠️  Door width: standard (75–90cm)
❓ Ramp gradient: not yet reported  [Add this]

[Toilets]
✅ Dedicated accessible cubicle
⚠️  Must ask staff for key
❓ Grab bars: not yet reported  [Add this]

[Inside]
⚠️  Lift available but reported as unreliable
✅ Spacious — suitable for power chairs
```

Grey out unreported fields with an inline "Add this" link that deep-links into the "Tell us more" flow for that specific place. This creates a natural loop: detail page surfaces gaps → CTA sends users to fill them → detail page gets richer.

---

### Files to touch (implementation)

- `backend/src/main/resources/db/migration/` — add `detailed_attributes JSONB` and `mobility_aid_type` enum column to `access_reports`
- `backend/src/main/kotlin/com/wheelcheck/review/AccessReport.kt` — add `detailedAttributes: Map<String, Any>?` field
- `backend/src/main/kotlin/com/wheelcheck/review/ReviewService.kt` — accept and store detailed attributes
- `frontend/src/components/report/ReportWizard.tsx` — add optional "Tell us more" step after submission confirmation
- `frontend/src/components/places/PlaceDetail.tsx` — render detailed attributes section with grey unknowns + CTAs
- `frontend/src/types/accessibility.ts` — add TypeScript types for all detailed attribute fields

---

## Part 5 — Live UI Audit (Playwright, 2026-05-18)

Full walkthrough of every screen on the live demo at `https://wheelcheck-swart.vercel.app`. Tested desktop (1280px) and mobile (390×844, iPhone 14 viewport). Logged in as `user@wheelcheck.demo`.

---

### Home Map — Issues Found

**1. Filter chips cut off on mobile**
On 390px, only 2 of 4 filter chips are visible (♿ Wheelchair Accessible, 🚻 Accessible Toilet). The other two (🅿️ Accessible Parking, 🚪 Wide Entrance) are off-screen with no scroll affordance shown. Users don't know they exist.
- **Fix:** Either make the chip row horizontally scrollable with a fade-out gradient on the right edge as a scroll hint, or collapse chips into a "Filters" button that opens a sheet.

**2. No visual selected state difference between active/inactive filters**
When a filter chip is active (pressed), the visual difference is subtle — just a slightly different background. On mobile in bright sunlight this is likely invisible.
- **Fix:** Use a solid filled style for active chips vs. outlined for inactive. Consider adding a checkmark icon inside active chips.

**3. "Data is imported, not live" banner competes with the FAB**
The orange ⏱ banner at the bottom overlaps vertically with the "Add a place" FAB on smaller screens. On mobile the FAB is pushed above the nav bar but sits too close to the banner.
- **Fix:** Dismiss the banner after first view (persist in localStorage). Or move it to a one-time tooltip/onboarding modal so it doesn't permanently occupy map real estate.

**4. "50 places nearby" pill has no breakdown**
The pill shows a count but gives no sense of how many are accessible vs. unknown. A user's primary question is "how many of these 50 are actually accessible?" — the number alone doesn't answer that.
- **Fix:** Show a mini breakdown in the pill: "50 nearby · 12 ✅ · 8 ⚠️ · 30 ❓"

**5. No empty state when filters produce zero results**
If a user enables all 4 filters simultaneously with no matches, the map just shows no markers with no feedback. The pill still shows a count (or shows 0 with no explanation).
- **Fix:** When filtered count = 0, show a toast or empty state: "No fully accessible venues found nearby. Try removing some filters or zooming out."

**6. BM locale: filter chip labels are in English**
Navigating to `/ms` shows the map in Bahasa Malaysia (nav labels, banner text translated) but the filter chips still read "♿ Wheelchair Accessible" etc. in English.
- **Fix:** Translate chip labels via `next-intl` message keys.

---

### Search — Issues Found

**7. Search suggestions show "Address not available" for many entries**
Multiple results (Aquaria KLCC, KJ10 KLCC, Suria KLCC, etc.) show "Address not available" as the subtitle. This makes the suggestion list hard to distinguish between duplicates (two "Suria KLCC" entries both with no address).
- **Fix:** Fall back to city + state when address is missing (e.g. "Kuala Lumpur, KL"). Also de-duplicate results with same name + same city.

**8. No keyboard navigation announced for suggestions**
The suggestions list uses `role="listbox"` correctly but there's no `aria-activedescendant` update on arrow-key navigation, so screen readers don't announce which suggestion is focused.
- **Fix:** Implement proper `aria-activedescendant` on the search input referencing the focused `role="option"` id.

**9. Selecting a search result doesn't open the bottom sheet**
Clicking "Suria KLCC" from suggestions pans the map to that location but doesn't automatically open the place's bottom sheet. The user has to then find and click the marker manually — two steps when it should be one.
- **Fix:** After flying to the location, auto-select the place and open the bottom sheet directly.

---

### Bottom Sheet — Issues Found

**10. Bottom sheet on mobile shows very little content at default (half) state**
At the half-snap position, the bottom sheet shows: place name, category, address, review count, and two buttons. This is fine but the two buttons ("View Details" / "Report") take up ~40% of the visible area. On a small screen the buttons dominate over the information.
- **Fix:** Make the buttons smaller/more compact in the half-state. Full-width buttons only needed in the full-expanded state.

**11. No distance to venue shown in bottom sheet**
The codebase has a "wheelchair distance calculation (~X min roll at 4km/h)" feature, but it's not visible in the bottom sheet. This is exactly the information a wheelchair user wants before deciding to go somewhere.
- **Fix:** Show "~8 min roll · 520m" (using the existing calculation) below the address in the bottom sheet half-state.

**12. Bottom sheet "Report" link label is ambiguous**
The "Report" button reads as "report a problem" (flag content) in most app contexts. Here it means "submit an accessibility report", which is the primary positive action.
- **Fix:** Rename to "Rate Accessibility" or "Add Report" to make the intent clear.

**13. No swipe hint on first open**
The drag handle is present but there's no animation or hint that the sheet is swipeable upward to see more content. First-time users may not know they can expand it.
- **Fix:** On first open, run a brief "peek" animation that briefly expands the sheet to 70% then snaps back to half, hinting at the gesture. Show once, persist in localStorage.

---

### Place Detail Page — Issues Found

**14. No "Get Directions" button**
The page has "View on Map" (goes back to the home map) but no way to navigate to the venue. This is a critical missing action — a user who decides a place is accessible wants to navigate there immediately.
- **Fix:** Add a "Get Directions" button that deep-links to Google Maps on Android (`geo:` intent) and Apple Maps on iOS (`maps://`). Place it next to "Report Accessibility".

**15. Accessibility verdict badge has no explanation for new users**
The green "✅ Accessible" pill is clear once you know the system, but nowhere on the page is it explained how the verdict is calculated (score from community reports). A new user might not trust it.
- **Fix:** Add a small "ⓘ" icon next to the verdict that opens a tooltip/popover: "Based on 1 community report. Venues with ≥2.5/3 average score are marked Accessible."

**16. Reviews section has no category icons — just text labels**
The 4 aspect scores (Entrance ✅, Toilet ✅, Parking ✅, Internal ✅) are rendered as plain text with emoji. They're small and easy to miss on mobile.
- **Fix:** Use distinct icons per category (door icon for entrance, toilet icon for toilet, parking sign for parking, arrows for internal nav) with colour-coded backgrounds matching the verdict colour.

**17. "Discussion (0)" section sits below reviews with no visual separation**
The comments section is immediately below the reviews section with just a heading separating them. On a long page these blend together.
- **Fix:** Add a card/section divider with a different background tint, or move comments into a tab alongside reviews.

**18. Comment box "Post" button requires login but there's no indication until you type**
The Post button is visibly disabled (greyed out) when not logged in, but there's no label explaining why. A user types a comment, sees the disabled Post button, and has no idea they need to log in.
- **Fix:** Replace the disabled Post button with a "Log in to comment" link when not authenticated.

**19. No "favorite" confirmation feedback**
The heart/save button (top right) has no toast or visual animation on tap. The icon changes state but there's no feedback that the action succeeded.
- **Fix:** Show a brief toast "Saved to favourites" on success.

---

### Report Wizard — Issues Found

**20. Step counter says "Step 1 of 6" but the original spec said 4 questions**
The wizard has 6 steps: entrance, toilet, parking, internal navigation, photos, notes. The "30 second report" marketing claim is undermined by 6 steps. Steps 5 (photos) and 6 (notes) are optional but still count in the progress label.
- **Fix:** Either label optional steps differently ("Step 5: Photos (optional)") or show required steps as "4 questions + optional extras" so users know the core is fast.

**21. No "skip all optional steps" shortcut**
After step 4 (internal nav), two optional steps remain. There's no "Submit now" shortcut — users must click Next twice more to reach Submit.
- **Fix:** After completing the 4 required steps, show a "Submit now" secondary button alongside the regular "Next" button, letting users skip the optional steps entirely.

**22. Step 5 (photos) has no camera icon button for mobile**
The photo upload is a single large outlined button "📷 Add Photo (0/5)". On mobile, tapping this opens the file picker which works, but there's no dedicated "Take Photo" vs "Choose from Library" split — the OS handles it but it would feel more native to have two buttons on mobile.
- **Fix:** On mobile, show two buttons: "📷 Take Photo" and "🖼️ Choose from Library" using the `capture` attribute on the file input.

**23. Wizard has no exit/cancel button**
There is a "Back" button that steps backward through the wizard, but no "Cancel" or "×" to abandon the report entirely and return to the place page. If a user accidentally taps "Report" and wants out, they must tap Back 4 times.
- **Fix:** Add a subtle "✕ Cancel" or back-arrow link at the top of the wizard that returns to the place detail page.

**24. No autosave between steps**
If the user navigates away mid-wizard (e.g. browser back, switching app on mobile), all progress is lost. For a 6-step flow this is painful.
- **Fix:** Persist wizard state to `sessionStorage` keyed by `placeId`. Restore on re-entry with a banner "Continue your unfinished report?"

---

### Places List Page — Issues Found

**25. On desktop, places show in 3-column grid — on mobile, single column**
The layout shift is fine, but the desktop grid wastes a lot of horizontal space on cards that are mostly empty (0 reviews, no address). The cards look sparse.
- **Fix:** Add a category icon/emoji prominently in the card (top-left corner), and show the accessibility badge more prominently. Cards currently feel like unstructured text lists.

**26. No filters on the Places list page**
The map has 4 filter chips. The Places list has only a text search box — no way to filter by category or accessibility level. A user browsing the list for accessible restaurants in KL has no way to narrow down.
- **Fix:** Add the same filter chips from the map to the Places list page, and add a category dropdown.

**27. "Showing 20 places" — no location context**
The list shows 20 places but doesn't say from where (near me? nationwide?). The ordering appears random.
- **Fix:** Show "Showing 20 places near Kuala Lumpur" or "Showing 20 most recent places" with a sort control (Nearest / Most Reviewed / Recently Updated).

**28. "Add a Place" button position on mobile**
On mobile, the "+ Add a Place" button is a full-width green button at the very top of the list — above the search bar. It dominates the page and pushes the actual content down. Most users are browsing, not adding.
- **Fix:** Move "+ Add a Place" to a FAB (floating action button) at the bottom right, consistent with the home map view.

---

### Add Place Page — Issues Found

**29. Map picker loads at default KL location, not user's location**
The location picker map defaults to a fixed KL coordinate even if the user is elsewhere. A user adding a place in Penang must manually pan the map to find their location.
- **Fix:** On page load, request geolocation and centre the map picker on the user's current position.

**30. Category grid uses emoji only — no text on mobile for some**
On 390px the category grid (Restaurant, Cafe, Shop, Mall…) is 4 columns of emoji + text. The text is small but readable. However, there's no "Bank" or "Clinic" category — venues that are very common in Malaysia for wheelchair users. 
- **Fix:** Add "Clinic/Pharmacy" and "Bank/ATM" as categories. These are frequent destinations for OKU card holders (for medical and government transactions).

**31. Form validation error for missing place name isn't inline**
The "Add Place" button is disabled until a name is entered, with an error hint ("Enter a place name") shown below the button rather than inline next to the input field. The user has to scroll down to see why the button is disabled.
- **Fix:** Show validation feedback inline below the name input field, not below the submit button.

---

### Profile Page — Issues Found

**32. Profile shows reviews as raw checkmark lists with no place name**
In "Your Reviews", each review card shows 4 green checkmarks and a notes excerpt ("Tested via Playwright E2E - fully accessible venue") and a date — but no venue name. The user can't tell which place the review is for without clicking through.
- **Fix:** Add the venue name as the primary heading of each review card in the profile.

**33. No "My Saved Places" (Favourites) section on profile**
The app supports favouriting places, but the profile page only shows submitted reviews. There's no way to view your saved places from the profile.
- **Fix:** Add a "Saved Places" tab or section alongside "Your Reviews" on the profile page.

**34. Login form has no "Show password" toggle**
The password field has no visibility toggle. On mobile, typing a password blind into a small field is error-prone.
- **Fix:** Add a 👁 toggle button at the right of the password field.

**35. No "Forgot password" link on the login form**
Standard auth flow is missing this. Even if the backend doesn't support it yet, the link should exist and show "Password reset coming soon."

---

### Settings Page — Issues Found

**36. Language toggle is a full-width button that reloads the page**
"Switch to Bahasa Malaysia" triggers a full page reload to `/ms`. This is fine functionally but the reload is jarring — the map re-initialises from scratch.
- **Fix:** Persist language preference to localStorage and use `next-intl`'s client-side locale switching to avoid a full reload.

**37. High Contrast Mode and Large Text toggles have no preview**
The two accessibility toggles in Settings are toggle switches with no indication of what they do. A user enabling "Large Text" can't preview the effect without committing.
- **Fix:** Show a live preview text sample below the toggles that updates instantly as the user toggles each option.

**38. Settings page is nearly empty — missed opportunity**
Settings only has Language, High Contrast, Large Text, and About. There's no:
- Default map location (to open on their city, not always KL)
- Notification preferences (once push notifications are added)
- Accessibility profile (wheelchair type, mobility aid) for personalised routing

---

### Cross-Cutting Issues Found

**39. No loading skeletons on any page**
Every page that fetches data shows a blank white screen while loading. The Places list, Profile, and Place Detail all have a brief flash of empty white content before data loads.
- **Fix:** Add Tailwind-based skeleton loaders (animated grey placeholder blocks) for all data-dependent sections.

**40. No error states on any page**
If the API is down or slow, every page silently shows nothing. There's no "Something went wrong, try again" message anywhere.
- **Fix:** Add generic error boundary components with retry buttons for all API-dependent sections.

**41. Accessibility verdict badge colour relies on colour alone**
The ✅ Accessible (green), ⚠️ Partial (amber), and ❌ Not Accessible (red) badges use colour as the sole differentiator beyond the emoji. Emoji help, but the text "Accessible" / "Partial" / "Not Accessible" is not directly adjacent to the colour in all contexts.
- **Fix:** Ensure the text label is always co-located with the colour, and test with a colour-blindness simulator. Green/amber can be indistinguishable for deuteranopia users.

**42. No offline page**
The service worker exists but isn't registered (noted in Part 2). When offline, the app shows a browser default "no internet" error page. A proper PWA should show a branded offline page with cached places still browsable.

---

### Summary: Top 10 Highest-Impact UI Fixes

| # | Issue | Screen | Effort |
|---|-------|--------|--------|
| 1 | Filter chips cut off on mobile (only 2/4 visible) | Home map | Low |
| 2 | Selecting search result doesn't open bottom sheet | Search | Low |
| 3 | No "Get Directions" button | Place detail | Very low |
| 4 | No exit/cancel button on report wizard | Report wizard | Very low |
| 5 | No loading skeletons anywhere | All pages | Low |
| 6 | "Add a Place" button dominates Places list on mobile | Places list | Very low |
| 7 | Distance to venue missing from bottom sheet | Bottom sheet | Low |
| 8 | Profile reviews don't show venue name | Profile | Very low |
| 9 | No skip-optional-steps shortcut in wizard | Report wizard | Low |
| 10 | No inline validation feedback on Add Place form | Add Place | Very low |

---

## Notes for Implementing AI Agent

- The backend uses an **adapter pattern** for data sources — any new data source should implement the existing `DataSourceAdapter` interface in `backend/src/main/kotlin/com/wheelcheck/aggregation/adapters/`
- Database migrations use **Flyway** — all schema changes go in `backend/src/main/resources/db/migration/` as `V{n}__description.sql`
- Environment variables are loaded from `application.yml` — add new API keys there with env var substitution (`${VAR_NAME}`)
- The frontend is a **Next.js App Router** project — new API calls should use server actions or fetch in server components where possible
- **PostGIS** is already in use — leverage for any location-aware features; spatial indexes exist on the `location` column
- The app targets **WCAG 2.2 AA** — any new UI must maintain accessibility standards (48px touch targets, ARIA labels, focus management)
- Anonymous usage is a core feature — don't gate AI-powered features behind auth unless strictly necessary
- `AccessReport` already has 4 aspect ratings (entrance, toilet, parking, internalNav) — these are averaged into a single verdict for display but the granular data exists in the DB
- The ORS routing adapter already exists in `backend/src/main/kotlin/com/wheelcheck/aggregation/adapters/OrsRoutingAdapter.kt` — extend it for configurable params rather than replacing it
