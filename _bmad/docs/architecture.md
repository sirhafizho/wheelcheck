---
title: "Architecture: WheelCheck"
status: final
created: 2026-05-11
---

# Architecture Document: WheelCheck

## System Overview

WheelCheck is a client-server application with a REST API backend and a Progressive Web App (PWA) frontend. The system uses PostgreSQL with PostGIS for geospatial data storage.

```
┌──────────────────────────────────────────────────────────────┐
│  Client Layer                                                 │
│  ┌─────────────────────────────────┐  ┌───────────────────┐ │
│  │  Next.js PWA (Vercel)           │  │  Future: Mobile   │ │
│  │  • Leaflet + OSM tiles          │  │  (React Native /  │ │
│  │  • Service Worker (offline)     │  │   Flutter)        │ │
│  │  • i18n (BM + EN)              │  │                   │ │
│  └──────────────┬──────────────────┘  └────────┬──────────┘ │
└─────────────────┼──────────────────────────────┼────────────┘
                  │ HTTPS REST (JSON)             │
┌─────────────────┼──────────────────────────────┼────────────┐
│  API Layer      ▼                              ▼             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Spring Boot 3.x + Kotlin (Render / Docker)             ││
│  │  • /api/v1/places       - CRUD + spatial search         ││
│  │  • /api/v1/reviews      - Accessibility reports         ││
│  │  • /api/v1/photos       - Image upload/serve            ││
│  │  • /api/v1/auth         - JWT authentication            ││
│  │  • Rate limiting (10 anon / 30 auth per hour)           ││
│  │  • OpenAPI / Swagger UI at /swagger-ui                  ││
│  └──────────────┬──────────────────────────────────────────┘│
└─────────────────┼───────────────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────────────┐
│  Data Layer     ▼                                            │
│  ┌────────────────────────┐  ┌────────────────────────────┐ │
│  │  PostgreSQL 16          │  │  File Storage              │ │
│  │  + PostGIS extension    │  │  • Local (dev)             │ │
│  │  • Spatial indexing     │  │  • Cloudflare R2 (prod)    │ │
│  │  • Flyway migrations    │  │  • Max 1200px, no EXIF    │ │
│  └────────────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Backend (Spring Boot Kotlin)

```
com.wheelcheck/
├── WheelcheckApplication.kt     # Entry point
├── config/                       # Cross-cutting configuration
│   ├── SecurityConfig.kt        # JWT filter chain, CORS
│   ├── WebConfig.kt             # Serialization, interceptors
│   ├── OpenApiConfig.kt         # Swagger/OpenAPI metadata
│   └── RateLimitConfig.kt      # Bucket4j rate limiting
├── place/                        # Places domain
│   ├── Place.kt                 # JPA entity with PostGIS Point
│   ├── PlaceRepository.kt      # Spring Data + native spatial queries
│   ├── PlaceService.kt         # Business logic
│   ├── PlaceController.kt      # REST endpoints
│   └── PlaceDto.kt             # Request/Response DTOs
├── review/                       # Reviews domain
│   ├── AccessibilityReview.kt   # JPA entity
│   ├── ReviewRepository.kt
│   ├── ReviewService.kt        # Scoring algorithm
│   ├── ReviewController.kt
│   └── ReviewDto.kt
├── photo/                        # Photo management
│   ├── Photo.kt                 # JPA entity (metadata)
│   ├── PhotoRepository.kt
│   ├── PhotoService.kt         # Upload, resize, EXIF strip
│   └── PhotoController.kt
├── user/                         # User management
│   ├── User.kt
│   ├── UserRepository.kt
│   └── UserService.kt
├── auth/                         # Authentication
│   ├── AuthController.kt       # Login, register endpoints
│   ├── AuthService.kt          # Credential validation
│   ├── JwtTokenProvider.kt     # Token generation/validation
│   └── JwtAuthFilter.kt        # Security filter
└── common/                       # Shared
    ├── AccessLevel.kt           # FULL, PARTIAL, NOT_ACCESSIBLE, UNKNOWN
    ├── Category.kt              # Venue categories
    └── ErrorResponse.kt         # Standardized error format
```

### Frontend (Next.js PWA)

```
src/
├── app/[locale]/                # i18n routing
│   ├── page.tsx                 # Map view (home)
│   ├── places/page.tsx          # List view (a11y alternative)
│   ├── places/[id]/page.tsx     # Place detail
│   └── report/[placeId]/page.tsx # Report wizard
├── components/
│   ├── map/                     # Leaflet integration
│   ├── places/                  # Place cards, badges
│   ├── report/                  # Multi-step wizard
│   ├── layout/                  # Header, nav, footer
│   └── ui/                      # Reusable accessible components
├── lib/
│   ├── api.ts                   # Backend API client
│   ├── types.ts                 # TypeScript types
│   └── constants.ts             # Config values
├── hooks/                       # Custom React hooks
└── messages/                    # i18n strings (en.json, ms.json)
```

## Data Model

### Entity Relationship

```
┌───────────┐       ┌─────────────────────┐       ┌──────────┐
│   User    │       │ AccessibilityReview  │       │  Place   │
├───────────┤       ├─────────────────────┤       ├──────────┤
│ id (UUID) │◄──┐   │ id (UUID)           │   ┌──►│ id (UUID)│
│ email     │   └───│ userId (nullable)   │   │   │ name     │
│ password  │       │ placeId             │───┘   │ nameMs   │
│ displayNm │       │ entrance            │       │ location │
│ role      │       │ toilet              │       │ address  │
│ points    │       │ parking             │       │ city     │
│ createdAt │       │ internalNav         │       │ category │
└───────────┘       │ notes               │       │ accLevel │
                    │ isVerified           │       │ revCount │
                    │ createdAt           │       │ createdAt│
                    └─────────────────────┘       └──────────┘
                              │
                              │ 1:N
                              ▼
                    ┌─────────────────────┐
                    │       Photo         │
                    ├─────────────────────┤
                    │ id (UUID)           │
                    │ reviewId            │
                    │ url                 │
                    │ category            │
                    │ createdAt           │
                    └─────────────────────┘
```

### Database Schema (PostgreSQL + PostGIS)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_ms VARCHAR(255),
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Kuala Lumpur',
    category VARCHAR(50) NOT NULL,
    accessibility_level VARCHAR(20) DEFAULT 'UNKNOWN',
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_city ON places(city);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'USER',
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE accessibility_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id),
    user_id UUID REFERENCES users(id),
    entrance VARCHAR(20) NOT NULL,
    toilet VARCHAR(20) NOT NULL,
    parking VARCHAR(20) NOT NULL,
    internal_nav VARCHAR(20) NOT NULL,
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_place ON accessibility_reviews(place_id);

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES accessibility_reviews(id),
    url TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Design

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/places | None | Search/list places |
| GET | /api/v1/places/nearby?lat=&lng=&radius= | None | Spatial search |
| GET | /api/v1/places/{id} | None | Place detail with reviews |
| POST | /api/v1/places | Authenticated | Create place |
| POST | /api/v1/places/{id}/reviews | None* | Submit review |
| GET | /api/v1/places/{id}/reviews | None | List reviews |
| POST | /api/v1/photos/upload | None* | Upload photo |
| POST | /api/v1/auth/register | None | Register |
| POST | /api/v1/auth/login | None | Login |
| GET | /api/v1/users/me | Authenticated | Profile |

*Rate-limited: 10/hour anonymous, 30/hour authenticated

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "field": "entrance", "message": "must not be null" }
    ]
  }
}
```

## Accessibility Scoring Algorithm

```
For each review dimension (entrance, toilet, parking, internal):
  FULL = 3 points
  PARTIAL = 2 points
  NOT_ACCESSIBLE = 1 point
  UNKNOWN = excluded from calculation

Overall score = average of all dimensions across all reviews

Verdict:
  score >= 2.5 → FULL (Accessible)
  score >= 1.5 → PARTIAL (Partially Accessible)
  score < 1.5  → NOT_ACCESSIBLE
  no reviews   → UNKNOWN
```

## Security Architecture

- **Authentication:** JWT tokens (HS256, 24h expiry)
- **Authorization:** Anonymous users can read all data and submit reviews (rate-limited)
- **Photo privacy:** EXIF stripped server-side before storage
- **Rate limiting:** Per-IP bucket (anonymous) or per-user (authenticated)
- **Input validation:** Jakarta Bean Validation on all DTOs
- **CORS:** Configurable origins (frontend URL)

## Deployment Architecture (Free Tier)

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Frontend | Vercel | 100GB bandwidth/mo |
| Backend | Render | 750 hours/mo (spins down on idle) |
| Database | Supabase / Render PostgreSQL | 500MB storage |
| Photos | Cloudflare R2 | 10GB, 10M reads/mo |
| Maps | OpenStreetMap tiles | Unlimited (fair use) |
| Geocoding | Nominatim | 1 req/sec |

## Development Environment

```yaml
# docker-compose.yml provides:
- PostgreSQL 16 + PostGIS 3.4
- Backend (Spring Boot, hot reload)
- Frontend (Next.js dev server)
- Adminer (DB admin UI)
```

One command to run everything: `docker compose up`
