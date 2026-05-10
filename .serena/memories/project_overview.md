# WheelCheck - Project Overview

## Purpose
WheelCheck is Malaysia's open-source wheelchair accessibility checker. It provides crowd-sourced venue accessibility data with Waze-style reporting, allowing users to check if venues are wheelchair-accessible before visiting.

## Tech Stack
- **Backend:** Spring Boot 3.x + Kotlin (Java 21+)
- **Frontend:** Next.js PWA + TypeScript
- **Database:** PostgreSQL 16+ with PostGIS extension
- **Maps:** Leaflet.js + OpenStreetMap (free, no API key needed)
- **Geocoding:** Nominatim (OSM, free)
- **Auth:** JWT (optional) + anonymous submissions allowed

## Repository
- **URL:** https://github.com/sirhafizho/wheelcheck
- **License:** Apache 2.0 (code) + ODbL (data)
- **Structure:** Monorepo (backend/ + frontend/ + docs/)

## Key Design Decisions
- Malaysia-focused (BM + English bilingual)
- Anonymous contributions (lowest barrier for OKU users)
- Waze-style quick reporting (< 30 seconds)
- WCAG 2.2 Level AA compliance (app is FOR disabled users)
- Free-tier infrastructure only ($0 running cost)
- Open source from day one

## Target Users
- Wheelchair users
- Mobility-impaired individuals
- Elderly
- Parents with strollers
- Caregivers
- Venue owners wanting to signal inclusivity

## Agent Skills Installed
- BMAD methodology (full suite)
- Kotlin/Spring Boot
- Accessibility (WCAG)
- Next.js/React best practices
- Web design guidelines
- Open source strategy
