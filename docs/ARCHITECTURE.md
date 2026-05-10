# WheelCheck Architecture

## Overview

WheelCheck is a monorepo containing a Spring Boot Kotlin backend API and a Next.js PWA frontend.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                   USERS                               │
│   Wheelchair users, caregivers, venue owners          │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────┐
│              FRONTEND (Next.js PWA)                    │
│   • Map view (Leaflet + OSM)                          │
│   • List view (accessible alternative)                │
│   • Quick report flow                                 │
│   • Photo upload                                      │
│   • Offline support (Service Worker)                  │
│   • i18n (BM + EN)                                    │
└─────────────────────┬────────────────────────────────┘
                      │ REST API (JSON)
┌─────────────────────┴────────────────────────────────┐
│              BACKEND (Spring Boot Kotlin)              │
│   • REST API (OpenAPI 3.0 documented)                 │
│   • JWT auth (optional, for registered users)         │
│   • Anonymous submission support                      │
│   • Photo processing (EXIF strip, resize)             │
│   • Rate limiting                                     │
│   • Spatial queries (PostGIS)                         │
│   • OSM data import (Overpass API)                    │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────┐
│              DATA LAYER                               │
│   • PostgreSQL 16 + PostGIS                           │
│   • Spatial indexing for nearby queries               │
│   • Photo storage (local / S3-compatible)             │
└──────────────────────────────────────────────────────┘
```

## Data Model (Core Entities)

```
Place
├── id (UUID)
├── name / nameMs (bilingual)
├── location (PostGIS POINT)
├── address
├── category (MALL, HOSPITAL, MOSQUE, RESTAURANT, etc.)
├── accessibilityLevel (FULL, PARTIAL, NOT_ACCESSIBLE, UNKNOWN)
├── dataSource (CROWDSOURCED, OSM_IMPORT, OFFICIAL)
└── createdAt / updatedAt

AccessibilityReview
├── id (UUID)
├── placeId (FK → Place)
├── userId (nullable — anonymous allowed)
├── entrance (ACCESSIBLE, NOT_ACCESSIBLE, UNKNOWN)
├── toilet (ACCESSIBLE, NOT_ACCESSIBLE, UNKNOWN)
├── parking (ACCESSIBLE, NOT_ACCESSIBLE, UNKNOWN)
├── internalNav (ACCESSIBLE, NOT_ACCESSIBLE, UNKNOWN)
├── notes
├── verified (boolean)
└── createdAt

Photo
├── id (UUID)
├── reviewId (FK → AccessibilityReview)
├── url
├── category (ENTRANCE, TOILET, PARKING, RAMP, OTHER)
└── uploadedAt

User (optional registration)
├── id (UUID)
├── displayName
├── email (nullable)
├── contributionPoints
├── level (EXPLORER, MAPPER, GUARDIAN, EXPERT)
└── createdAt
```

## API Design Principles

- RESTful with meaningful resource URLs
- OpenAPI 3.0 documented (auto-generated Swagger UI)
- Cursor-based pagination for geospatial queries
- Anonymous access for read + write (rate-limited)
- JWT for registered user features (history, badges)
- All responses include bilingual fields where applicable

## Free Services Used

| Service | Purpose | Tier |
|---------|---------|------|
| OpenStreetMap / Overpass API | Venue data seeding | Free |
| Nominatim | Geocoding | Free (1 req/sec) |
| OpenFreeMap / MapTiler | Map tiles | Free tier |
| Vercel | Frontend hosting | Free tier |
| Render / Railway | Backend demo hosting | Free tier |
| Cloudflare R2 | Photo storage | Free tier (10GB) |
