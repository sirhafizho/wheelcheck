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

### ✅ Implemented (Phase 1 — Core)

| Feature | Status |
|---------|--------|
| REST API with full CRUD for places | ✅ Done |
| Spatial "nearby" search (PostGIS ST_DWithin) | ✅ Done |
| Text-based venue search | ✅ Done |
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
| OpenStreetMap data import service | ✅ Done |
| Database seeded with 5 KL venues | ✅ Done |

### ✅ Implemented (Phase 2 — Features)

| Feature | Status |
|---------|--------|
| Add Place with mandatory photo evidence | ✅ Done |
| Debounced search (home + places pages) | ✅ Done |
| User profile (register, login, stats, review history) | ✅ Done |
| Settings (language switch, high contrast, large text) | ✅ Done |
| Floating Action Button for quick place adding | ✅ Done |
| Map marker popup with place details link | ✅ Done |

### ✅ Implemented (Phase 3 — Admin & Polish)

| Feature | Status |
|---------|--------|
| Admin dashboard with stats overview | ✅ Done |
| Admin datatable for Places (inline edit, delete) | ✅ Done |
| Admin datatable for Reviews (view, delete) | ✅ Done |
| Admin datatable for Users (role toggle, delete) | ✅ Done |
| Role-based access control (USER / ADMIN) | ✅ Done |
| JWT role claims with Spring Security @PreAuthorize | ✅ Done |
| Map popup "View Details →" link + review count | ✅ Done |
| Admin link in Settings (admin-only visibility) | ✅ Done |
| Pagination on all admin tables | ✅ Done |

### ✅ Implemented (Phase 4 — Reviews, Comments & Aggregation)

| Feature | Status |
|---------|--------|
| Individual review display on place detail page | ✅ Done |
| Emoji ratings for entrance/toilet/parking/navigation | ✅ Done |
| Photo evidence gallery with lightbox viewer | ✅ Done |
| Photo upload endpoint for reviews | ✅ Done |
| Threaded comment system (Reddit-style) | ✅ Done |
| Comment upvote/downvote voting | ✅ Done |
| Reply-to-comment threading (1 level) | ✅ Done |
| Wikidata SPARQL adapter (P2846 accessibility data) | ✅ Done |
| Enhanced OSM adapter (kerb, ramp, surface, elevator tags) | ✅ Done |
| Search bar UI polish | ✅ Done |
| **10,832 KL/Selangor places imported from OpenStreetMap** | ✅ Done |

### ✅ Aggregation Service (Adapter Pattern)

WheelCheck's backend uses an **adapter pattern** to aggregate accessibility data from multiple free sources:

| Adapter | Source | Data |
|---------|--------|------|
| **OsmOverpassAdapter** | OpenStreetMap Overpass API | Wheelchair tags, ramps, kerbs, surfaces, elevators |
| **WikidataAdapter** | Wikidata SPARQL | P2846 accessibility property for landmarks |
| **AccessibilityCloudAdapter** | accessibility.cloud | GeoJSON accessibility data (ready to activate) |

Admin-only import endpoints: `/api/aggregation/import/kl`, `/selangor`, `/custom`

### ✅ Testing

| Type | Count | Status |
|------|-------|--------|
| Backend unit tests | 53+ | ✅ All passing |
| Frontend unit tests | 18 | ✅ All passing |
| Playwright E2E tests | 81 | ✅ All passing |
| Manual API verification | All endpoints | ✅ Verified |

### 🔜 Roadmap

- [ ] Offline access for saved venues (service worker caching)
- [ ] Gamification (badges, contributor levels)
- [ ] Venue owner self-certification
- [ ] Route planning between accessible venues (OpenRouteService wheelchair profile)
- [ ] Transitland GTFS integration (Malaysian transit wheelchair_boarding)
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
| POST | `/api/auth/register` | Register account | No |
| POST | `/api/auth/login` | Login (returns JWT) | No |
| GET | `/api/users/me` | Get current user profile | Yes |
| GET | `/api/users/{id}/stats` | Get user stats | No |
| POST | `/api/aggregation/import/kl` | Import KL places from OSM | Admin |
| POST | `/api/aggregation/import/selangor` | Import Selangor places from OSM | Admin |

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
│   │   ├── aggregation/       # Data aggregation (OSM, Wikidata adapters)
│   │   ├── auth/              # JWT authentication
│   │   ├── comment/           # Threaded comment system
│   │   ├── config/            # Security, rate limiting, exception handling
│   │   ├── place/             # Place CRUD + spatial queries
│   │   ├── review/            # Accessibility review + photo uploads
│   │   └── user/              # User management
│   └── src/test/              # 53+ unit tests
├── frontend/                   # Next.js 16 PWA
│   ├── src/
│   │   ├── app/[locale]/      # i18n routing (EN + BM)
│   │   ├── components/        # Map, places, reviews, comments, layout
│   │   ├── lib/               # API client, types, constants
│   │   └── messages/          # Translation files
│   └── tests/                 # 18 unit + 81 E2E tests
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

## 📊 Data

- **Code License:** Apache 2.0
- **Data License:** ODbL (Open Database License) — same as OpenStreetMap
- All crowd-sourced accessibility data is open and exportable

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
