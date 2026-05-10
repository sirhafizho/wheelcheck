---
title: "PRD: WheelCheck MVP"
status: draft
created: 2026-05-11
updated: 2026-05-11
version: "1.0"
---

# Product Requirements Document: WheelCheck MVP

## 1. Overview

WheelCheck is a crowd-sourced wheelchair accessibility checker for Malaysia. This PRD covers Phase 1 (MVP) and Phase 2 features.

## 2. User Personas

### P1: Wheelchair User ("Azman")
- 32, works in KL, uses powered wheelchair
- Needs: know before visiting if he can enter, use the toilet, park nearby
- Device: Samsung Galaxy A25 (Android 14), uses TalkBack occasionally
- Frustration: "I've been stuck at entrances too many times"

### P2: Elderly User ("Datin Rosmah")
- 68, uses walker, moderate tech literacy
- Needs: find accessible clinics and restaurants near her home
- Device: iPhone 12 (hand-me-down from child), large text enabled
- Frustration: "My children have to call every place for me"

### P3: Caregiver ("Nurul")
- 35, mother of child with cerebral palsy, also pushes stroller
- Needs: plan family outings to accessible venues
- Device: Xiaomi Redmi (Android), mainly uses WhatsApp
- Frustration: "I spend hours researching if a mall is actually accessible"

### P4: Contributor ("Ahmad")
- 28, disability rights advocate, active on social media
- Needs: efficient way to report accessibility info en masse
- Device: iPhone 15, tech-savvy
- Motivation: "I want to make KL more accessible for everyone"

## 3. Functional Requirements

### 3.1 Venue Search (FR-001)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001.1 | User can search venues by name (text input) | P1 |
| FR-001.2 | User can browse venues on a map (Leaflet + OSM) | P1 |
| FR-001.3 | User can view venues in a list (accessible alternative to map) | P1 |
| FR-001.4 | Search results show accessibility verdict badge | P1 |
| FR-001.5 | User can filter by category (mall, hospital, restaurant, etc.) | P1 |
| FR-001.6 | User can filter by accessibility level (full, partial, unknown) | P1 |
| FR-001.7 | Nearby search based on user GPS location | P1 |
| FR-001.8 | Search works offline for previously viewed venues | P2 |

### 3.2 Venue Detail (FR-002)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-002.1 | Display venue name (BM + EN where available) | P1 |
| FR-002.2 | Display overall accessibility verdict prominently | P1 |
| FR-002.3 | Display granular breakdown: entrance, toilet, parking, internal | P1 |
| FR-002.4 | Display photo evidence (carousel/gallery) | P1 |
| FR-002.5 | Display number of reviews and last updated date | P1 |
| FR-002.6 | Display venue address and show on map | P1 |
| FR-002.7 | "Report accessibility" CTA button (prominent) | P1 |
| FR-002.8 | "Confirm this info" / "Report outdated" buttons | P1 |
| FR-002.9 | Display contributor attribution (anonymous or username) | P2 |

### 3.3 Quick Report Flow (FR-003)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-003.1 | Report flow completes in < 30 seconds (4-5 taps) | P1 |
| FR-003.2 | Entrance question: Ramp / Steps only / Level entry / Not sure | P1 |
| FR-003.3 | Toilet question: Accessible / Not accessible / Not sure | P1 |
| FR-003.4 | Parking question: OKU bay available / No OKU bay / Not sure | P1 |
| FR-003.5 | Internal navigation: Wide aisles / Tight spaces / Elevator / Not sure | P1 |
| FR-003.6 | Optional: add text notes | P1 |
| FR-003.7 | Optional: upload photo evidence (camera or gallery) | P1 |
| FR-003.8 | Works without account (anonymous submission) | P1 |
| FR-003.9 | Rate limiting: max 10 reports per hour per device | P1 |
| FR-003.10 | Confirmation screen: "Thanks! Your report helps the community" | P1 |

### 3.4 Photo Evidence (FR-004)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-004.1 | Upload photos from camera or gallery | P1 |
| FR-004.2 | Strip EXIF metadata (privacy) | P1 |
| FR-004.3 | Resize to max 1200px wide (bandwidth) | P1 |
| FR-004.4 | Categorize photo: entrance, toilet, parking, ramp, other | P1 |
| FR-004.5 | Max 5 photos per report | P1 |
| FR-004.6 | Photos displayed in venue detail page | P1 |

### 3.5 User Accounts (FR-005) — Phase 2

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-005.1 | Optional registration (email + password) | P2 |
| FR-005.2 | View contribution history | P2 |
| FR-005.3 | Earn points for contributions | P2 |
| FR-005.4 | Contributor levels: Explorer → Mapper → Guardian → Expert | P2 |
| FR-005.5 | Badges for milestones (first report, 10 photos, etc.) | P2 |

### 3.6 Community Verification (FR-006) — Phase 2

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-006.1 | Users can upvote/downvote existing reviews | P2 |
| FR-006.2 | Reviews with 3+ confirmations marked as "verified" | P2 |
| FR-006.3 | Conflicting reports flagged for community review | P2 |
| FR-006.4 | Trusted reviewer program (OKU orgs get auto-verified status) | P2 |

### 3.7 Internationalization (FR-007)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-007.1 | All UI text available in Bahasa Malaysia | P1 |
| FR-007.2 | All UI text available in English | P1 |
| FR-007.3 | Language toggle in header/settings | P1 |
| FR-007.4 | Venue names stored in both BM and EN where available | P1 |

## 4. Non-Functional Requirements

### 4.1 Accessibility (NFR-001) — CRITICAL

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-001.1 | WCAG 2.2 Level AA compliance | Mandatory |
| NFR-001.2 | All touch targets ≥ 48x48dp | WCAG 2.5.8 |
| NFR-001.3 | Color contrast ≥ 4.5:1 for all text | WCAG 1.4.3 |
| NFR-001.4 | Screen reader compatible (TalkBack + VoiceOver) | WCAG 4.1.2 |
| NFR-001.5 | Single-finger operation for all features | WCAG 2.5.1 |
| NFR-001.6 | Layout stable at 200% font scale | WCAG 1.4.4 |
| NFR-001.7 | No time-limited interactions | WCAG 2.2.1 |
| NFR-001.8 | Map has list view alternative | WCAG 1.1.1 |
| NFR-001.9 | Viewport zoom not disabled | WCAG 1.4.4 |
| NFR-001.10 | Focus order logical in all screens | WCAG 2.4.3 |

### 4.2 Performance (NFR-002)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-002.1 | API response for nearby search | < 200ms |
| NFR-002.2 | Initial page load (LCP) | < 2.5s on 4G |
| NFR-002.3 | Time to interactive | < 3.5s on mid-range Android |
| NFR-002.4 | Offline-capable for saved venues | Service Worker |
| NFR-002.5 | Photo upload with progress indicator | Max 5MB per photo |

### 4.3 Security (NFR-003)

| ID | Requirement |
|----|-------------|
| NFR-003.1 | EXIF data stripped from all uploaded photos |
| NFR-003.2 | Rate limiting on all write endpoints |
| NFR-003.3 | Input validation and sanitization |
| NFR-003.4 | No user location history stored server-side |
| NFR-003.5 | JWT tokens expire in 24 hours |
| NFR-003.6 | Passwords hashed with bcrypt |

### 4.4 Scalability (NFR-004)

| ID | Requirement |
|----|-------------|
| NFR-004.1 | Handle 1000 concurrent users (Phase 1 target) |
| NFR-004.2 | PostgreSQL with PostGIS spatial indexing |
| NFR-004.3 | Stateless backend (horizontally scalable) |
| NFR-004.4 | CDN for static assets and photos |

## 5. API Endpoints (Summary)

```
GET    /api/v1/places                    # Search/list places
GET    /api/v1/places/nearby             # Geospatial nearby search
GET    /api/v1/places/{id}               # Place details
POST   /api/v1/places                    # Add new place
PUT    /api/v1/places/{id}               # Update place

POST   /api/v1/places/{id}/reviews       # Submit accessibility review
GET    /api/v1/places/{id}/reviews       # List reviews for a place
POST   /api/v1/places/{id}/reviews/{id}/confirm  # Confirm a review

POST   /api/v1/photos/upload             # Upload photo
GET    /api/v1/photos/{id}               # Get photo

POST   /api/v1/auth/register             # Register (optional)
POST   /api/v1/auth/login                # Login
GET    /api/v1/users/me                  # Current user profile
GET    /api/v1/users/me/contributions    # Contribution history

GET    /api/v1/categories                # List venue categories
```

## 6. Data Model

See [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for full data model.

## 7. Technical Constraints

- Backend: Spring Boot 3.x + Kotlin (JDK 21)
- Frontend: Next.js 14+ PWA + TypeScript
- Database: PostgreSQL 16 + PostGIS
- Maps: Leaflet.js + OpenStreetMap tiles (free)
- Hosting: Free tiers only (Vercel, Render, Cloudflare R2)
- No paid APIs required for core functionality
- Must work on Samsung Galaxy A-series (mid-range Android)

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Venues with data (KL) | 500+ | Database count |
| Report submission time | < 30s | UX testing |
| Lighthouse a11y score | 90+ | Automated CI |
| API latency (p95) | < 200ms | Monitoring |
| Test coverage (backend) | > 80% | JaCoCo |
| Test coverage (frontend) | > 70% | Jest |
| E2E tests passing | 100% | Playwright CI |
