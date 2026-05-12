# 🦽 WheelCheck

**Malaysia's open-source wheelchair accessibility checker.**

Crowd-sourced venue accessibility data with Waze-style reporting. Check if a place is wheelchair-accessible before you visit.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 🎯 What is WheelCheck?

WheelCheck helps people with mobility impairments find accessible venues in Malaysia. Users can:

- **Search** venues and see accessibility verdicts (✅ Accessible / ⚠️ Partial / ❌ Not Accessible)
- **Report** accessibility info in under 30 seconds (Waze-style quick reporting)
- **Upload photos** as evidence (ramps, doorways, toilets, parking)
- **Confirm or update** existing reports
- **Browse** via map or accessible list view

## 🤔 Why?

- Google Maps accessibility data is inconsistent and not granular enough
- No open-source, SEA-focused accessibility checker exists
- 15% of the world's population lives with a disability
- Malaysia's Persons with Disabilities Act 2008 requires accessible buildings, but compliance varies greatly

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Spring Boot 3.3 + Kotlin |
| **Frontend** | Next.js 16 (PWA) + TypeScript |
| **Database** | PostgreSQL 16 + PostGIS 3.4 |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Auth** | JWT (HS512) — optional, anonymous reports allowed |
| **i18n** | next-intl (English + Bahasa Malaysia) |
| **API Docs** | Swagger / OpenAPI 3.0 |

## 📋 Current Progress

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
| Settings (language switch, high contrast, large text) | ✅ Done |
| Floating Action Button for quick place adding | ✅ Done |

### ✅ Phase 3 — Admin & Access Control

| Feature | Status |
|---------|--------|
| Admin dashboard with stats overview | ✅ Done |
| Admin datatable for Places/Reviews/Users | ✅ Done |
| Role-based access control (USER / ADMIN) | ✅ Done |
| JWT role claims with Spring Security @PreAuthorize | ✅ Done |
| Admin-only import endpoints | ✅ Done |

### ✅ Phase 4 — Reviews, Comments & Social

| Feature | Status |
|---------|--------|
| Review display with emoji ratings + photo gallery | ✅ Done |
| Threaded comment system (Reddit-style) | ✅ Done |
| Comment upvote/downvote with spam prevention | ✅ Done |
| Vote toggle logic (per-user, one vote per comment) | ✅ Done |
| Favorites/bookmarks for places | ✅ Done |

### ✅ Phase 5 — Map UX & Accessibility

| Feature | Status |
|---------|--------|
| Bottom sheet place details (swipe up/down, mobile-friendly) | ✅ Done |
| Accessibility filter chips (wheelchair, toilet, parking, entrance) | ✅ Done |
| Wheelchair distance display (~X min roll at 4km/h) | ✅ Done |
| Marker clustering (10,000+ markers performant) | ✅ Done |
| Viewport-based place refetch on pan/zoom | ✅ Done |
| Search suggestions with fly-to on Enter | ✅ Done |
| Zoom controls repositioned (no overlap) | ✅ Done |
| High contrast mode with glass-morphism overrides | ✅ Done |

### ✅ Phase 6 — Malaysia-Wide Coverage

| Feature | Status |
|---------|--------|
| Malaysia-wide import (all 16 states/territories) | ✅ Done |
| MalaysiaGeoUtils (city/state lookup for entire country) | ✅ Done |
| DataGovMyFacilitiesAdapter (MOH hospitals + clinics) | ✅ Done |
| State field on places (city + state display) | ✅ Done |
| Data source provenance on place details | ✅ Done |
| Region-based import endpoints | ✅ Done |
| **10,832+ places imported from OpenStreetMap** | ✅ Done |

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
| Playwright E2E tests | 102 | ✅ All passing |
| CDP geolocation tests | 6 | ✅ All passing |
| Manual API verification | All endpoints | ✅ Verified |

### 🔜 Roadmap

- [ ] Offline access for saved venues (service worker caching with smart invalidation)
- [ ] "I'm Here" quick report (long-press FAB → auto-fill GPS)
- [ ] Gamification (badges, contributor levels)
- [ ] Venue owner self-certification
- [ ] Additional languages (Mandarin, Tamil)

## 🚀 Quick Start

### 🧪 Test Account

For testing, use these credentials:

| Field | Value |
|-------|-------|
| Email | `admin@wheelcheck.my` |
| Password | `WheelCheck2026!` |

Or register a new account from the Profile page.

### Prerequisites
- Java 21+ (tested with Java 24)
- Node.js 20+ (tested with Node 22)
- Docker & Docker Compose

### Run with Docker

```bash
git clone https://github.com/sirhafizho/wheelcheck.git
cd wheelcheck
docker compose up -d
```

This starts PostGIS on port 5432 with the database pre-configured.

### Run Backend

```bash
cd backend
./gradlew bootRun
```

Backend: http://localhost:8080
API Docs: http://localhost:8080/swagger-ui.html

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

### Run Tests

```bash
# Backend tests
cd backend && ./gradlew test

# Frontend unit tests
cd frontend && npm test

# E2E tests (requires backend + frontend running)
cd frontend && npx playwright test
```

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/places` | List all places | No |
| GET | `/api/places/{id}` | Get place details | No |
| POST | `/api/places/nearby` | Find places within radius | No |
| GET | `/api/places/search?name=` | Search by name | No |
| POST | `/api/places` | Create a place | No |
| GET | `/api/places/{id}/reports` | Get reviews for a place | No |
| POST | `/api/reviews` | Submit accessibility review | No |
| POST | `/api/reviews/{id}/photos` | Upload review photos | Yes |
| POST | `/api/photos/upload` | Upload photo evidence | No |
| GET | `/api/comments/place/{id}` | Get comments for a place | No |
| POST | `/api/comments` | Post a comment | Yes |
| POST | `/api/comments/{id}/vote?type=` | Upvote/downvote a comment | Yes |
| GET | `/api/favorites` | Get user's favorite places | Yes |
| POST | `/api/favorites/{placeId}` | Toggle favorite (add/remove) | Yes |
| GET | `/api/favorites/{placeId}/status` | Check favorite status + count | No |
| POST | `/api/routing/wheelchair` | Wheelchair route planning (ORS) | Yes |
| POST | `/api/auth/register` | Register account | No |
| POST | `/api/auth/login` | Login (returns JWT) | No |
| GET | `/api/users/me` | Get current user profile | Yes |
| GET | `/api/users/{id}/stats` | Get user stats | No |
| GET | `/api/aggregation/adapters` | List active adapters | Admin |
| POST | `/api/aggregation/import/kl` | Import KL places | Admin |
| POST | `/api/aggregation/import/selangor` | Import Selangor places | Admin |
| POST | `/api/aggregation/import/malaysia` | Import all Malaysia | Admin |
| POST | `/api/aggregation/import/peninsular` | Import Peninsular MY | Admin |
| POST | `/api/aggregation/import/{state}` | Import by state (e.g. `penang`) | Admin |

## ♿ Accessibility

This app is built **for** people with disabilities, so accessibility of the app itself is non-negotiable:

- WCAG 2.2 Level AA compliance target
- 48x48dp minimum touch targets
- List view alternative to map (for screen reader users)
- Single-finger operation for all interactions
- Large text support (200% font scale)
- High contrast mode support
- No time limits on any interaction
- Bilingual support (EN / BM)

## 🧮 Scoring Algorithm

Reviews rate venues across categories (entrance, toilet, parking, internal navigation):

| Rating | Score |
|--------|-------|
| FULL (fully accessible) | 3 |
| PARTIAL (partially accessible) | 2 |
| NOT_ACCESSIBLE | 1 |
| UNKNOWN | Excluded from calculation |

**Verdict:**
- Average ≥ 2.5 → ✅ FULL
- Average ≥ 1.5 → ⚠️ PARTIAL
- Average < 1.5 → ❌ NOT_ACCESSIBLE

## 🗂️ Project Structure

```
wheelcheck/
├── backend/                    # Spring Boot Kotlin API
│   ├── src/main/kotlin/com/wheelcheck/
│   │   ├── admin/             # Admin dashboard controller
│   │   ├── aggregation/       # Data aggregation adapters
│   │   │   ├── OsmOverpassAdapter       # OpenStreetMap wheelchair data
│   │   │   ├── WikidataAdapter          # Wikidata SPARQL P2846
│   │   │   ├── GeoapifyAdapter          # Geoapify POI data
│   │   │   ├── OrsRoutingAdapter        # Wheelchair route planning
│   │   │   ├── PrasaranaGtfsAdapter     # Malaysian transit GTFS
│   │   │   ├── DataGovMyFacilitiesAdapter # MOH hospitals/clinics
│   │   │   ├── AccessibilityCloudAdapter  # accessibility.cloud
│   │   │   ├── MalaysiaGeoUtils         # State/city lookup (16 states)
│   │   │   └── AggregationService       # Coordinator + deduplication
│   │   ├── auth/              # JWT authentication
│   │   ├── comment/           # Threaded comments + voting
│   │   ├── config/            # Security, rate limiting, CORS
│   │   ├── favorite/          # Bookmark/favorite places
│   │   ├── place/             # Place CRUD + spatial queries
│   │   ├── review/            # Accessibility reviews + photos
│   │   └── user/              # User management
│   └── src/test/              # 53+ unit tests
├── frontend/                   # Next.js 16 PWA
│   ├── src/
│   │   ├── app/[locale]/      # i18n routing (EN + BM)
│   │   ├── components/
│   │   │   ├── map/           # MapView, LocationPicker
│   │   │   ├── places/        # PlaceCard, AccessBadge, Reviews, Comments
│   │   │   ├── ui/            # BottomSheet, LoadingSpinner, Button
│   │   │   └── layout/        # BottomNav, Header
│   │   ├── hooks/             # usePlaces, useGeolocation, useDebounce
│   │   ├── lib/               # API client, types, constants, utils
│   │   └── messages/          # Translation files (EN + BM)
│   └── tests/                 # 40 unit + 102 E2E tests
├── docker-compose.yml          # PostGIS (ARM64-native)
├── docs/                       # Architecture, PRD, development guide
└── .github/                    # Issue templates, CI workflows
```

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

## 📊 Data Sources & Licensing

| Source | License | What we use |
|--------|---------|-------------|
| [OpenStreetMap](https://www.openstreetmap.org/) | ODbL | Wheelchair tags, ramps, kerbs, surfaces, elevators |
| [Wikidata](https://www.wikidata.org/) | CC0 | P2846 accessibility property for landmarks |
| [data.gov.my](https://data.gov.my/) | Open Data | MOH hospitals & government clinics nationwide |
| [Prasarana GTFS](https://developer.data.gov.my/) | Open Data | KL Rapid Rail/Bus wheelchair boarding info |
| [Geoapify](https://www.geoapify.com/) | Free tier | Points of interest with accessibility metadata |
| [OpenRouteService](https://openrouteservice.org/) | Free tier | Wheelchair-friendly route planning |
| [accessibility.cloud](https://www.accessibility.cloud/) | CC-BY | Global accessibility GeoJSON (optional) |

- **Code License:** Apache 2.0
- **Crowd-sourced Data:** ODbL (Open Database License)
- All accessibility data contributed by users is open and exportable

## 🇲🇾 Malaysia Focus

- Bilingual: Bahasa Malaysia + English
- Key venues: Malls, hospitals, mosques, MRT/LRT stations, government offices
- Aligned with Persons with Disabilities Act 2008 (Act 685)
- Partnership-ready for OKU organizations
- Seeded with real KL venues (Pavilion, KLCC, KL Sentral, Mid Valley, Nu Sentral)

## 📬 Contact

- **Issues:** [GitHub Issues](https://github.com/sirhafizho/wheelcheck/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sirhafizho/wheelcheck/discussions)

---

Built with ❤️ for the Malaysian OKU community.
