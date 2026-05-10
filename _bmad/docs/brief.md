---
title: "Product Brief: WheelCheck"
status: draft
created: 2026-05-11
updated: 2026-05-11
---

# Product Brief: WheelCheck

## Executive Summary

WheelCheck is Malaysia's first open-source wheelchair accessibility checker — a crowd-sourced platform where anyone can check if a venue is wheelchair-accessible before visiting. Think Waze, but for accessibility: quick community reports, real-time data, simple verdicts.

The app addresses a critical information gap: people with mobility impairments in Malaysia have no reliable way to know if a restaurant, mall, hospital, or government office is truly accessible before making the trip. Google Maps offers basic boolean flags ("wheelchair accessible entrance") but lacks the granularity needed — information about toilets, parking bays, internal navigation, and ramps is absent or unreliable.

WheelCheck fills this gap with a mobile-first PWA backed by a Spring Boot Kotlin API, enabling the Malaysian OKU community and their caregivers to make informed decisions about where they can go safely and independently.

## The Problem

**Who feels it:** Malaysia's estimated 600,000+ registered OKU (persons with disabilities), their families, caregivers, elderly citizens with mobility challenges, and parents with strollers.

**The pain:**
- A wheelchair user plans to visit a new restaurant. Google Maps says "wheelchair accessible" but upon arrival, there are two steps at the entrance and no ramp. The accessible toilet is locked and requires staff who aren't available. The trip is wasted.
- A caregiver researching hospitals for an elderly parent in a wheelchair cannot find reliable accessibility information for clinics in their area. They call each venue individually — many don't know or give vague answers.
- A tourist in a wheelchair visiting KL has no way to know which MRT stations have working lifts, which malls have accessible toilets, or which restaurants they can actually enter.

**How they cope today:**
- Word of mouth in WhatsApp/Facebook disability groups
- Trial and error (physically visiting to check)
- Calling venues individually (unreliable answers)
- Google Maps (sparse, boolean, often wrong)
- Avoiding unfamiliar places entirely (social isolation)

**The cost:** Reduced independence, social isolation, wasted time and transport costs, missed medical appointments, dependence on others for basic decisions about where to go.

## The Solution

A mobile-first Progressive Web App where users can:

1. **Search** any venue in Malaysia and instantly see its accessibility verdict: ✅ Accessible / ⚠️ Partial / ❌ Not Accessible / ❓ Unknown
2. **View details** — granular breakdown by entrance, toilet, parking, internal navigation, with photo evidence
3. **Report** accessibility in under 30 seconds — Waze-style quick taps (not a long form)
4. **Confirm or deny** existing reports — community keeps data fresh
5. **Browse** nearby accessible places on a map OR an accessible list view (for screen reader users)

The experience is designed for the users it serves: large touch targets, screen reader support, single-finger operation, offline access for saved venues.

## What Makes This Different

| Factor | WheelCheck | Google Maps | Wheelmap | AccessNow |
|--------|-----------|-------------|----------|-----------|
| Malaysia/SEA focus | ✅ Primary | Global (sparse MY data) | Mostly Europe | Mostly North America |
| Bahasa Malaysia | ✅ Native | Limited | ❌ | ❌ |
| Granular data | ✅ (entrance, toilet, parking, internal, photos) | Boolean only | 3-tier (yes/limited/no) | Detailed but proprietary |
| Open source | ✅ Apache 2.0 + ODbL | ❌ | ✅ | ❌ |
| Quick reporting | ✅ < 30 seconds | Buried, slow | Moderate | Moderate |
| Open data | ✅ Exportable | ❌ | ✅ (via OSM) | ❌ |
| Offline support | ✅ | Partial | Limited | Limited |
| Anonymous contributions | ✅ | Requires Google account | Requires OSM account | Requires account |

**Unfair advantage:** First mover in SEA accessibility data. Open data means the community owns it forever. Zero cost to run (free-tier infrastructure). If someone builds a better app tomorrow, they can use our data.

## Who This Serves

**Primary users:**
- **Wheelchair users** — need reliable pre-visit information to plan outings independently
- **Elderly with mobility aids** — walkers, canes; need to know about steps, ramps, seating
- **Caregivers** — planning routes and venues for dependents; need comprehensive info
- **Parents with strollers** — same physical barriers as wheelchair users

**Secondary users:**
- **Venue owners** — want to signal inclusivity, attract OKU customers
- **Disability advocacy organizations** — OKU Sentral, JKM; need data for policy work
- **Urban planners/government** — need data on accessibility gaps

**Success for primary users looks like:** "I can confidently go to a new place knowing I won't face unexpected barriers."

## Success Criteria

**User success signals:**
- A user can find accessibility info for a venue in < 10 seconds
- A user can submit a report in < 30 seconds
- Data accuracy confirmed by community (>80% agreement ratio)
- At least 500 venues in KL with accessibility data within 6 months of launch
- At least 50 active contributors within 3 months

**Technical success:**
- PWA scores 90+ on Lighthouse accessibility audit
- API response time < 200ms for nearby search
- Zero critical accessibility failures in automated testing
- TalkBack + VoiceOver tested and working

**Open source success:**
- 50+ GitHub stars within 6 months
- At least 5 external contributors
- Data used by at least 1 other project/organization

## Scope

### In (Phase 1 MVP):
- Venue search (by name, by location on map)
- Accessibility verdict display with granular breakdown
- Quick report flow (Waze-style)
- Photo evidence upload
- Confirm/deny existing reports
- Map view + list view
- Anonymous contributions
- Bilingual (BM + English)
- Offline access for saved venues
- OSM data seeding for KL area
- Docker one-command setup

### In (Phase 2):
- User registration & profiles
- Contribution history & gamification (points, badges, levels)
- Community verification (upvote/downvote, trusted reviewers)
- Venue owner self-certification portal
- "Report outdated info" button

### Out (Future):
- Route planning between accessible venues
- Real-time reports (elevator broken today)
- Native mobile apps (iOS/Android)
- Payment/subscription features
- AI-powered photo analysis
- Multi-country expansion

## Vision

If WheelCheck succeeds, it becomes the **default source of truth for venue accessibility in Southeast Asia** — an open data commons that anyone can build upon.

In 2-3 years:
- Every mall, hospital, mosque, and MRT station in Malaysia has detailed accessibility data
- Disability organizations use WheelCheck data for policy advocacy
- Ride-hailing apps integrate our API for accessible route planning
- The model expands to Singapore, Indonesia, Thailand
- Government bodies reference WheelCheck data for UBBL compliance monitoring
- A community of hundreds of mappers keeps data fresh through organized mapping events

The data is open forever. Even if this specific app disappears, the accessibility data lives on — in OpenStreetMap, in accessibility.cloud, in any future app that needs it.
