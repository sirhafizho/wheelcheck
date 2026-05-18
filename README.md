# 🦽 WheelCheck

**Malaysia's open-source wheelchair accessibility checker.**

Crowd-sourced venue accessibility data with Waze-style reporting. Check if a place is wheelchair-accessible before you visit — for the Malaysian OKU community.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 What is WheelCheck?

WheelCheck helps people with mobility impairments find accessible venues in Malaysia. Users can:

- **Search** venues with smart abbreviation support (KL, KB, KK, JB…) and semantic understanding
- **Check** accessibility with AI-researched summaries + confidence tiers per venue
- **Report** accessibility info in under 30 seconds (Waze-style 6-step wizard)
- **Upload photos** as evidence (ramps, doorways, toilets, parking)
- **Bookmark** favourites and review them from their profile
- **Browse** via map or accessible list view, with real-time shadow discovery from OSM

## 🤔 Why?

- Google Maps accessibility data is inconsistent and not granular enough for wheelchair users
- No open-source, SEA-focused accessibility checker exists
- Malaysia's Persons with Disabilities Act 2008 requires accessible buildings, but compliance varies
- 15% of the world's population lives with a disability

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Spring Boot 3.3 + Kotlin |
| **Frontend** | Next.js 16 (PWA) + TypeScript |
| **Database** | PostgreSQL 16 + PostGIS 3.4 + pgvector |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Auth** | JWT (HS512) — optional, anonymous reports allowed |
| **i18n** | next-intl (English + Bahasa Malaysia) |
| **AI Enrichment** | Gemini 2.5 Flash (knowledge-based, free tier) |
| **Semantic Search** | HuggingFace Embeddings + pgvector cosine similarity |

---

## 📋 Current Features

### ✅ Phase 1 — Core Platform

| Feature | Status |
|---------|--------|
| REST API with full CRUD for places | ✅ Done |
| Spatial "nearby" search (PostGIS ST_DWithin) | ✅ Done |
| Text-based venue search with suggestions | ✅ Done |
| Accessibility review submission | ✅ Done |
| Accessibility scoring algorithm | ✅ Done |
| Photo evidence upload (with validation) | ✅ Done |
| JWT authentication (register/login) | ✅ Done |
| Anonymous contributions (no sign-up required) | ✅ Done |
| Rate limiting (per IP + per user) | ✅ Done |
| Interactive map with Leaflet + OSM tiles | ✅ Done |
| Bilingual UI (EN + BM) | ✅ Done |
| Mobile-responsive PWA layout | ✅ Done |
| Swagger API documentation | ✅ Done |

### ✅ Phase 2 — Features & UX

| Feature | Status |
|---------|--------|
| Add Place with mandatory photo evidence | ✅ Done |
| Interactive map picker for location (no manual lat/lng) | ✅ Done |
| Debounced search with live suggestions | ✅ Done |
| User profile (register, login, stats, review history) | ✅ Done |
| Settings (language switch, high contrast, large text, dark mode) | ✅ Done |
| Floating Action Button for quick place adding | ✅ Done |
| Show/hide password toggle on login & register forms | ✅ Done |
| Chrome autofill-friendly form attributes (`name`, `autocomplete`) | ✅ Done |

### ✅ Phase 3 — Admin & Access Control

| Feature | Status |
|---------|--------|
| Admin dashboard with stats overview | ✅ Done |
| Admin datatable for Places/Reviews/Users | ✅ Done |
| Role-based access control (USER / ADMIN) | ✅ Done |
| JWT role claims with Spring Security @PreAuthorize | ✅ Done |
| Admin-only import endpoints | ✅ Done |
| Demo account protection (admin demo limited to read-only deletes, backup guard) | ✅ Done |
| Rate limiting + CORS hardening on all sensitive endpoints | ✅ Done |

### ✅ Phase 4 — Reviews, Comments & Social

| Feature | Status |
|---------|--------|
| Review display with emoji ratings + photo gallery | ✅ Done |
| Threaded comment system (Reddit-style) | ✅ Done |
| Comment upvote/downvote with spam prevention | ✅ Done |
| Vote toggle logic (per-user, one vote per comment) | ✅ Done |
| Favourites / bookmarks for places (toggle heart, favourites page) | ✅ Done |
| Favourite auth gate — prompts login instead of silently failing | ✅ Done |
| Comment login gate — shows login link for unauthenticated users | ✅ Done |
| Show on Map — button on place detail jumps map to that venue | ✅ Done |
| Places pagination (Load More, shows count) | ✅ Done |

### ✅ Phase 5 — Map UX & Accessibility

| Feature | Status |
|---------|--------|
| Bottom sheet place details (swipe up/down, mobile-friendly) | ✅ Done |
| Accessibility filter chips with i18n labels + scroll fade gradient | ✅ Done |
| Wheelchair distance display (~X min roll at 4km/h) | ✅ Done |
| Marker clustering (10,000+ markers performant) | ✅ Done |
| Real-time OSM shadow discovery — new places appear as you pan the map | ✅ Done |
| Search suggestions with fly-to on Enter | ✅ Done |
| Malaysian abbreviation search (KL, KB, KK, JB, PG, PJ…) | ✅ Done |
| Semantic search via HuggingFace embeddings + pgvector | ✅ Done |
| Dark mode (toggle in header, full coverage, anti-FOUC) | ✅ Done |
| High contrast mode with glass-morphism overrides | ✅ Done |
| Large text mode | ✅ Done |
| Get Directions button on place detail (opens Google Maps) | ✅ Done |
| Mobile FAB for adding places on small screens | ✅ Done |
| Toast notifications for save/remove favourites, auth prompts | ✅ Done |
| Report wizard — cancel button, optional steps (5–6), Submit Now shortcut | ✅ Done |

### ✅ Phase 6 — Malaysia-Wide Coverage

| Feature | Status |
|---------|--------|
| Malaysia-wide import (all 16 states/territories) | ✅ Done |
| MalaysiaGeoUtils (city/state lookup for entire country) | ✅ Done |
| DataGovMyFacilitiesAdapter (MOH hospitals + clinics) | ✅ Done |
| State field on places (city + state display) | ✅ Done |
| Data source provenance on place details | ✅ Done |
| Region-based import endpoints | ✅ Done |
| ~71,354 places imported from OpenStreetMap | ✅ Done |
| Enhanced OSM tags — surface, incline, entrance:wheelchair, tactile paving | ✅ Done |

### ✅ Phase 7 — AI Accessibility Enrichment

| Feature | Status |
|---------|--------|
| Gemini 2.5 Flash — researches each venue based on training knowledge | ✅ Done |
| Confidence tiers — VERIFIED 🟢 / INFERRED 🟡 / ASSUMPTION ⚪ | ✅ Done |
| Fallback chain — Gemini → OSM rule-based → UBBL assumption | ✅ Done |
| AI Reasoning panel on place cards (collapsed by default, expand to read) | ✅ Done |
| Admin batch enrichment — enrich one state at a time (rate-limited 8 req/min) | ✅ Done |
| Batch progress endpoint — poll live progress during enrichment runs | ✅ Done |
| Quota meter in admin UI; hard-capped 1,400/day | ✅ Done |

See [`docs/AI_ENRICHMENT_SETUP.md`](docs/AI_ENRICHMENT_SETUP.md) for setup guide and recommended enrichment order.

---

### ✅ Aggregation Service (Adapter Pattern)

WheelCheck's backend uses an **adapter pattern** to aggregate accessibility data from multiple free sources:

| Adapter | Source | Data | API Key |
|---------|--------|------|---------|
| **OsmOverpassAdapter** | OpenStreetMap Overpass API | Wheelchair tags, ramps, kerbs, surfaces, elevators | Free |
| **WikidataAdapter** | Wikidata SPARQL | P2846 accessibility property for landmarks | Free |
| **AccessibilityCloudAdapter** | accessibility.cloud | GeoJSON accessibility data | Free (optional) |
| **GeoapifyAdapter** | Geoapify Places API | Points of interest with accessibility | Free tier |
| **OrsRoutingAdapter** | OpenRouteService | Wheelchair-friendly route planning | Free tier |
| **PrasaranaGtfsAdapter** | Prasarana GTFS (Malaysia) | KL rail/bus transit wheelchair boarding | Free |
| **DataGovMyFacilitiesAdapter** | data.gov.my | MOH hospitals & clinics nationwide | Free |

Admin import endpoints:
- `/api/aggregation/import/kl` — KL area
- `/api/aggregation/import/selangor` — Selangor state
- `/api/aggregation/import/malaysia` — All 16 states
- `/api/aggregation/import/peninsular` — Peninsular Malaysia
- `/api/aggregation/import/{state}` — Any specific state (e.g., `penang`, `johor`)

### ✅ Testing

| Type | Count | Status |
|------|-------|--------|
| Backend unit tests | 53+ | ✅ All passing |
| Frontend unit tests | 40 | ✅ All passing |
| Playwright E2E tests (TypeScript) | 261+ | ✅ All passing |
| CDP map tests (Python) | 14 | ✅ All passing |
| browser-use AI visual tests | 9 | ✅ Ready (needs LLM API key) |

**Three test layers** provide complementary coverage:
- **Playwright TypeScript** — functional E2E: routes, filters, search, reports, i18n, dark mode, favourites, AI panel, Malaysia coverage
- **CDP Python** (`tools/` + `frontend/tests/browser-harness/`) — low-level map interaction via raw `Input.dispatchMouseEvent`: marker clicks through Leaflet clusters, map pan, ARIA audit, viewport scroll, UI overlap detection
- **browser-use AI visual** (`frontend/tests/visual/`) — LLM vision tests for layout overlap, WCAG contrast, accessibility, and exploratory UX; requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

### 🔜 Roadmap

- [ ] Offline access for saved venues (service worker caching)
- [ ] "I'm Here" quick report (long-press FAB → auto-fill GPS)
- [ ] Gamification (badges, contributor levels)
- [ ] Venue owner self-certification
- [ ] Additional languages (Mandarin, Tamil)

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | [wheelcheck-swart.vercel.app](https://wheelcheck-swart.vercel.app) |
| **Backend API** | [sirhafizho-wheelcheck-api.hf.space/api](https://sirhafizho-wheelcheck-api.hf.space/api/places?page=0&size=5) |
| **API Docs** | [Swagger UI](https://sirhafizho-wheelcheck-api.hf.space/swagger-ui.html) |

> First request may take ~10s if the HuggingFace container is cold-starting.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@wheelcheck.demo` | `demo1234` |
| User | `user@wheelcheck.demo` | `demo1234` |

---

## 🚀 Quick Start

### Prerequisites
- Java 21+ (tested with Java 24), Node.js 20+ (tested with Node 22), Docker & Docker Compose

### Run locally

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up -d          # starts PostGIS + pgvector on :5432

cd backend && ./gradlew bootRun     # http://localhost:8080  |  http://localhost:8080/swagger-ui.html
cd frontend && npm install && npm run dev  # http://localhost:3000
```

### Load Seed Data

The repo includes a compressed seed dump of **~71,000 accessibility places** across all 16 Malaysian states:

```bash
# After docker compose up -d and backend has run migrations once:
gunzip -c data/places-seed.sql.gz | docker exec -i $(docker ps -qf "name=postgis\|name=wheelcheck-db") psql -U wheelcheck -d wheelcheck

# Or sync from the live demo Supabase (80k+ places):
cp .env.supabase.example .env.supabase   # fill in SUPABASE_DB_PASSWORD
./scripts/db-pull-demo.sh

# Or re-import fresh from OSM (takes ~30 min):
curl -X POST http://localhost:8080/api/aggregation/import/malaysia \
  -H "Authorization: Bearer <admin-token>"
```

See [`data/README.md`](data/README.md) for coverage breakdown.

### AI Enrichment (Optional)

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — add to `backend/.env` (auto-loaded by `./gradlew bootRun`):

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_DAILY_CAP=1400
```

```bash
./scripts/enrich-test.sh 5    # test with 5 Penang places first

# Or enrich a full state via curl:
curl -X POST http://localhost:8080/api/admin/enrich/state/Terengganu \
  -H "Authorization: Bearer <admin-token>"

# Monitor progress:
curl http://localhost:8080/api/admin/enrich/progress \
  -H "Authorization: Bearer <admin-token>"

# Then use the admin UI → AI Enrichment tab for full state runs
```

See [`docs/AI_ENRICHMENT_SETUP.md`](docs/AI_ENRICHMENT_SETUP.md) for setup guide.

### Run Tests

```bash
cd backend && ./gradlew test

cd frontend && npm test                         # unit tests
cd frontend && npx playwright test              # E2E (needs backend + frontend running)

# CDP map tests — raw CDP events, no LLM needed
source tools/venv/bin/activate
python frontend/tests/browser-harness/test_cdp_map.py

# AI visual tests — browser-use (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
source tools/venv/bin/activate
cd frontend && pytest tests/visual/ -v
```

See [`tools/README.md`](tools/README.md) for Python venv setup.

---

## 🔌 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/places` | List places (paginated) | No |
| GET | `/api/places/{id}` | Place details | No |
| POST | `/api/places/nearby` | Find within radius (triggers OSM shadow discovery) | No |
| GET | `/api/places/search?name=` | Fuzzy search (abbrev. aware: KL, KB…) | No |
| GET | `/api/places/semantic-search` | Vector search (pgvector) | No |
| POST | `/api/places` | Create place | No |
| GET | `/api/places/{id}/reports` | Get reviews for a place | No |
| GET | `/api/places/{id}/enrichment` | AI enrichment for a place | No |
| POST | `/api/reviews` | Submit accessibility review | No |
| POST | `/api/reviews/{id}` | Update own review | Yes |
| POST | `/api/reviews/{id}/photos` | Upload review photos | Yes |
| POST | `/api/photos/upload` | Upload photo evidence | No |
| GET | `/api/comments/place/{id}` | Get comments | No |
| POST | `/api/comments` | Post comment | Yes |
| POST | `/api/comments/{id}/vote?type=` | Upvote/downvote | Yes |
| GET | `/api/favorites` | Get user's favourite places | Yes |
| POST | `/api/favorites/{placeId}` | Toggle favourite (add/remove) | Yes |
| GET | `/api/favorites/{placeId}/status` | Check favourite status + count | No |
| POST | `/api/routing/wheelchair` | Wheelchair route (ORS) | Yes |
| POST | `/api/auth/register` / `/api/auth/login` | Auth | No |
| GET | `/api/users/me` | Current user profile | Yes |
| GET | `/api/users/{id}/stats` | User contribution stats | No |
| GET | `/api/aggregation/adapters` | List active adapters | Admin |
| POST | `/api/aggregation/import/kl` | Import KL places | Admin |
| POST | `/api/aggregation/import/selangor` | Import Selangor places | Admin |
| POST | `/api/aggregation/import/malaysia` | Import all Malaysia (~30 min) | Admin |
| POST | `/api/aggregation/import/peninsular` | Import Peninsular MY | Admin |
| POST | `/api/aggregation/import/{state}` | Import by state (e.g. `penang`, `johor`) | Admin |
| POST | `/api/admin/enrich/place/{id}` | AI-enrich one place | Admin |
| POST | `/api/admin/enrich/state/{state}?limit=N` | Batch AI-enrich a state | Admin |
| GET | `/api/admin/enrich/progress` | Live batch enrichment progress | Admin |
| GET | `/api/admin/enrich/stats/{state}` | Enrichment stats | Admin |
| GET/POST | `/api/admin/places/pending` | Pending place approvals | Admin |

Full Swagger docs: `/swagger-ui.html`

---

## ♿ Accessibility

Built **for** people with disabilities, so the app itself must be accessible:

- WCAG 2.2 Level AA target, 48×48dp minimum touch targets
- List view alternative to map (screen reader friendly)
- Dark mode, high contrast, large text (200%), no time limits
- Single-finger operation, bilingual (EN / BM)

---

## 🧮 Scoring Algorithm

Reviews rate venues across entrance, toilet, parking, and internal navigation:

| Rating | Score |
|--------|-------|
| FULL | 3 |
| PARTIAL | 2 |
| NOT_ACCESSIBLE | 1 |
| UNKNOWN | Excluded |

Average ≥ 2.5 → ✅ FULL · ≥ 1.5 → ⚠️ PARTIAL · < 1.5 → ❌ NOT_ACCESSIBLE

---

## 🗂️ Project Structure

```
wheelcheck/
├── backend/src/main/kotlin/com/wheelcheck/
│   ├── admin/          # Admin dashboard + approval workflow
│   ├── aggregation/    # OSM, Wikidata, Geoapify, Prasarana, data.gov.my adapters
│   ├── auth/           # JWT auth
│   ├── comment/        # Threaded comments + voting
│   ├── enrichment/     # Gemini AI pipeline + OSM fallback
│   ├── favorite/       # Bookmarks
│   ├── place/          # Place CRUD + spatial queries
│   ├── review/         # Accessibility reviews + photos
│   ├── search/         # pgvector semantic search
│   └── user/           # User management
├── frontend/src/
│   ├── app/[locale]/   # i18n routing (EN + BM) — map, places, admin, profile, settings
│   ├── components/     # map/, places/, report/, ui/, layout/
│   ├── hooks/          # usePlaces, useGeolocation, useFavorite…
│   └── messages/       # en.json, ms.json
├── scripts/            # db-backup-demo.sh, db-pull-demo.sh, enrich-test.sh
├── docker/db/          # Custom PostGIS + pgvector image
├── docker-compose.yml
└── docs/               # AI_ENRICHMENT_SETUP.md, AI_DATA_PIPELINE.md
```

---

## 📊 Data Sources & Licensing

| Source | License | What we use |
|--------|---------|-------------|
| [OpenStreetMap](https://www.openstreetmap.org/) | ODbL | Wheelchair tags, ramps, surfaces, tactile paving |
| [Wikidata](https://www.wikidata.org/) | CC0 | P2846 accessibility property |
| [data.gov.my](https://data.gov.my/) | Open Data | MOH hospitals & clinics |
| [Prasarana GTFS](https://developer.data.gov.my/) | Open Data | KL transit wheelchair boarding |
| [Geoapify](https://www.geoapify.com/) | Free tier | POI + accessibility metadata |
| [OpenRouteService](https://openrouteservice.org/) | Free tier | Wheelchair routing |
| [accessibility.cloud](https://www.accessibility.cloud/) | CC-BY | Global accessibility GeoJSON |
| [Gemini 2.5 Flash](https://aistudio.google.com/) | Free tier | AI accessibility research |

**Code:** Apache 2.0 · **Crowd-sourced data:** ODbL

---

## 🏛️ Demo Infrastructure & Architecture

```
Users
  ├─▶  Vercel (Frontend — Next.js 16)
  └─▶  HuggingFace Spaces (Backend — Spring Boot / Docker)
              ↕
           Supabase (PostgreSQL 16 + PostGIS + pgvector)
```

| Service | Role | Why |
|---------|------|-----|
| **Vercel** | Frontend | Zero-config Next.js, free hobby tier, global CDN |
| **HuggingFace Spaces** | Backend API | Free Docker hosting, no credit card, persistent storage |
| **Supabase** | Database | Managed Postgres with PostGIS + pgvector, 500MB free |

### Why these choices?

**Spring Boot + Kotlin** — type-safe, PostGIS/JPA first-class, familiar to Malaysian Java/Kotlin devs, lower contribution barrier than exotic stacks.

**Next.js** — SSR for SEO (venues should be Google-indexable), PWA support built-in, `next-intl` + App Router for BM/EN switching.

**HuggingFace Spaces over Railway/Render** — free Docker with no sleep penalty after warm-up, persistent storage, ML-native if we add local embedding models later.

**Supabase over Neon/PlanetScale** — PostGIS + pgvector both available (Neon has pgvector but PostGIS is limited), 500MB free handles 80k+ places comfortably, great dashboard for solo dev.

---

## 📈 Scaling Roadmap

### Tier 1 — Community (~100–1,000 DAU) · *Zero cost*
- Backend: upgrade HF Spaces to persistent, or Fly.io (3 VMs free)
- Database: Supabase Pro ($25/mo) for 8GB + daily backups
- Media: Cloudflare R2 (free 10GB) for photo uploads

### Tier 2 — Real Adoption (~1,000–10,000 DAU) · *~$50–100/mo*
- Backend: Railway/Render auto-scaling or DigitalOcean VPS
- Rate limiting: Redis via Upstash (free tier)
- CDN: Cloudflare in front of everything for SEA performance
- Monitoring: Sentry + PostHog (both free tiers)

### Tier 3 — Serious Scale (~10,000+ DAU) · *Partner/NGO investment*
- Backend: Google Cloud Run or Kubernetes (GKE)
- Database: Supabase Enterprise or AlloyDB with read replicas
- Search: Meilisearch for full-text + faceted search at scale
- Auth: Keycloak/Auth0 for enterprise SSO + OKU organisation accounts
- PDPA compliance review (Malaysia Personal Data Protection Act)

---

## 📱 Mobile App — Future Plans

**Not being built now** — the PWA covers mobile well enough for the community stage.

When the time comes, wheelchair users need native for: offline saved venues, native camera for photo evidence, and push notifications for nearby new reports.

- **React Native (preferred)** — reuse ~60% of existing TypeScript/component logic, Expo simplifies open-source distribution, single iOS + Android codebase
- **Flutter** — better map performance, strong Malaysian dev community, but no code reuse
- **Capacitor** — fastest path (wrap the PWA), limited native capability

The Spring Boot backend is already mobile-ready — same REST API, same auth, no changes needed.

---

## 🔄 Data Freshness — How It Works

WheelCheck uses a **three-layer data model**:

| Layer | Source | Freshness | Notes |
|-------|--------|-----------|-------|
| **Seed import** | OSM + data.gov.my snapshot | Updated on demand (admin) | ~71,354 places loaded |
| **Live shadow discovery** | OSM Overpass API | Real-time, triggered on map pan | New places auto-saved to DB, rate-limited per grid cell |
| **User crowd-sourcing** | Community reports | Instant | Always takes priority over imported data |

**Shadow discovery** means when you pan/zoom the map, the backend silently queries the OSM Overpass API for that viewport and saves any newly discovered places. These appear on your next refresh. No API key needed — OSM is free.

| What this means | Detail |
|-----------------|--------|
| 🗺️ **Growing database** | Places accumulate as users browse new areas |
| ⏱️ **Rate-limited** | 10-min cooldown per ~2km grid cell to avoid hammering OSM |
| 🙋 **User reports** | Community accessibility reports always override imported data |
| 🔄 **Manual refresh** | Re-run imports any time to pull the latest OSM snapshot |

> **Important:** WheelCheck data is **not** live-fetched. Places are imported from upstream sources and stored in local PostgreSQL. Once imported, data does not auto-update — refreshes are maintainer-driven. Crowd-sourced user reports are always live and override imported data.

**To refresh all of Malaysia** (takes ~30 min):
```bash
curl -X POST http://localhost:8080/api/aggregation/import/malaysia \
  -H "Authorization: Bearer <admin-token>"

# Or per-state:
curl -X POST http://localhost:8080/api/aggregation/import/selangor \
  -H "Authorization: Bearer <admin-token>"
```

A pre-built seed dump of ~71,000 places is available at [`data/places-seed.sql.gz`](data/places-seed.sql.gz). See [`data/README.md`](data/README.md).

---

## 🇲🇾 Malaysia Focus

- Bilingual: Bahasa Malaysia + English
- Key venues: Malls, hospitals, mosques, MRT/LRT stations, government offices
- Aligned with Persons with Disabilities Act 2008 (Act 685)
- Smart abbreviation search: KL, KB, KK, JB, PG, PJ, SA, KT and more
- Partnership-ready for OKU organizations
- Seeded with real KL venues (Pavilion, KLCC, KL Sentral, Mid Valley, Nu Sentral)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues** are tagged and waiting for you.

### Ways to contribute:
- 🐛 Report bugs
- 💡 Suggest features
- 🗺️ Submit accessibility data for venues
- 🌐 Help with translations (BM, Mandarin, Tamil)
- 💻 Submit code (backend, frontend, or both)
- 📖 Improve documentation
- ♿ Test with assistive technologies

---

## 📬 Contact

- **Issues:** [GitHub Issues](https://github.com/sirhafizho/wheelcheck/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sirhafizho/wheelcheck/discussions)

---

Built with ❤️ for the Malaysian OKU community.
