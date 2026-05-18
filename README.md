# 🦽 WheelCheck

**Malaysia's open-source wheelchair accessibility checker.**

Crowd-sourced venue accessibility data with Waze-style reporting. Check if a place is wheelchair-accessible before you visit — for the Malaysian OKU community.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 Why WheelCheck?

- Google Maps accessibility data is inconsistent and not granular enough for wheelchair users
- No open-source, SEA-focused accessibility checker exists
- Malaysia's Persons with Disabilities Act 2008 requires accessible buildings, but compliance varies
- 15% of the world's population lives with a disability

Users can **search** venues with smart abbreviation support (KL, KB, JB…), **check** AI-researched accessibility summaries, **report** in under 30 seconds (Waze-style wizard), **upload photos** as evidence, and **bookmark** favourites — all in English or Bahasa Malaysia.

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

## 📋 Features

### Core Platform
- REST API with full CRUD, spatial "nearby" search (PostGIS `ST_DWithin`), fuzzy + semantic search
- Accessibility review wizard (6-step, optional steps, photo evidence), scoring algorithm
- JWT auth with anonymous contributions, rate limiting, CORS hardening
- Interactive Leaflet/OSM map with marker clustering (10,000+ markers performant)

### UX & Map
- Bottom sheet place details, filter chips, wheelchair roll-time estimate (~4 km/h)
- Real-time OSM shadow discovery — new places appear as you pan the map
- Malaysian abbreviation search (KL, KB, KK, JB, PG, PJ…) + semantic pgvector search
- Dark mode, high contrast, large text, mobile-responsive PWA, bilingual UI

### Community & Social
- Threaded comments with upvote/downvote spam prevention
- Favourites/bookmarks with auth gate, user profile + contribution stats
- **Own place management** — edit location/details, delete your submission, edit your own review
- **Admin approval workflow** — new community places go PENDING → admin approves/rejects with nearby duplicate warning

### AI Accessibility Enrichment
- **Gemini 2.5 Flash** researches each venue based on its training knowledge
- **Confidence tiers** — VERIFIED 🟢 / INFERRED 🟡 / ASSUMPTION ⚪
- **Fallback chain** — Gemini → OSM tag rules → UBBL assumption
- **Admin batch enrichment** — enrich one state at a time, rate-limited 8 req/min, hard-capped 1,400/day
- AI reasoning panel on place cards; quota meter in admin UI

### Data Coverage
- ~80,000+ places across all 16 Malaysian states + territories (OSM + data.gov.my)
- Enhanced OSM tags: surface, incline, entrance:wheelchair, tactile paving
- Multiple data adapters: OSM Overpass, Wikidata, data.gov.my MOH, Prasarana GTFS, Geoapify, OpenRouteService, accessibility.cloud

### Testing
| Type | Count |
|------|-------|
| Backend unit tests | 53+ ✅ |
| Frontend unit tests | 40 ✅ |
| Playwright E2E (TypeScript) | 261+ ✅ |
| CDP map tests (Python) | 14 ✅ |
| browser-use AI visual tests | 9 ✅ (needs LLM API key) |

### Roadmap
- [ ] Offline access for saved venues (service worker caching)
- [ ] "I'm Here" quick report (long-press FAB → auto-fill GPS)
- [ ] Gamification (badges, contributor levels)
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
- Java 21+, Node.js 20+, Docker & Docker Compose

### Run locally

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up -d          # starts PostGIS + pgvector on :5432

cd backend && ./gradlew bootRun     # http://localhost:8080
cd frontend && npm install && npm run dev  # http://localhost:3000
```

### Load Seed Data

```bash
# ~71,000 places from the included compressed dump:
gunzip -c data/places-seed.sql.gz | docker exec -i wheelcheck-db psql -U wheelcheck -d wheelcheck

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
# Then use the admin UI → AI Enrichment tab for full state runs
```

See [`docs/AI_ENRICHMENT_SETUP.md`](docs/AI_ENRICHMENT_SETUP.md) for setup guide.

### Run Tests

```bash
cd backend && ./gradlew test

cd frontend && npm test                         # unit tests
cd frontend && npx playwright test              # E2E (needs backend + frontend running)

source tools/venv/bin/activate
python frontend/tests/browser-harness/test_cdp_map.py   # CDP map tests
cd frontend && pytest tests/visual/ -v                  # AI visual (needs LLM key)
```

See [`tools/README.md`](tools/README.md) for Python venv setup.

---

## 🔌 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/places` | List places (paginated) | No |
| GET | `/api/places/{id}` | Place details | No |
| POST | `/api/places/nearby` | Find within radius (triggers OSM shadow discovery) | No |
| GET | `/api/places/search?name=` | Fuzzy search (abbrev. aware) | No |
| GET | `/api/places/semantic-search` | Vector search (pgvector) | No |
| POST | `/api/places` | Create place | No |
| GET | `/api/places/{id}/enrichment` | AI enrichment for a place | No |
| POST | `/api/reviews` | Submit accessibility review | No |
| POST | `/api/reviews/{id}` | Update own review | Yes |
| POST | `/api/reviews/{id}/photos` | Upload review photos | Yes |
| GET | `/api/comments/place/{id}` | Get comments | No |
| POST | `/api/comments` | Post comment | Yes |
| POST | `/api/comments/{id}/vote?type=` | Upvote/downvote | Yes |
| GET/POST | `/api/favorites` / `/api/favorites/{placeId}` | Bookmarks | Yes |
| POST | `/api/routing/wheelchair` | Wheelchair route (ORS) | Yes |
| POST | `/api/auth/register` / `/api/auth/login` | Auth | No |
| GET | `/api/users/me` | Current user profile | Yes |
| POST | `/api/aggregation/import/{state}` | Import by state (e.g. `penang`, `malaysia`) | Admin |
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

## 📬 Contact

- **Issues:** [GitHub Issues](https://github.com/sirhafizho/wheelcheck/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sirhafizho/wheelcheck/discussions)

---

Built with ❤️ for the Malaysian OKU community.
