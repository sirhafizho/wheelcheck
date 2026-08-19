# Story: UI Consistency - Standardize Page Content Widths

**Status:** Done
**Date:** 2026-08-19

## Problem Statement

Page content widths are inconsistent across the WheelCheck frontend, creating a jarring experience when navigating between pages. The Places listing page uses `max-w-7xl` (1280px) while the Place detail page uses `max-w-4xl` (896px), and other pages use various widths (`max-w-2xl`, `max-w-md`, etc.). Error states often use different widths than their normal states on the same page.

## Current State Audit

| Page | Route | Current Max-Width | Notes |
|------|-------|-------------------|-------|
| Home | `/` | Full width | OK - Map view, no container needed |
| Places listing | `/places` | `max-w-7xl` | Too wide vs detail page |
| Place detail | `/places/[id]` | `max-w-4xl` (normal), `max-w-7xl` (error) | Error state mismatch |
| Add place | `/add-place` | `max-w-lg` (form), `max-w-md` (auth/success) | Form page - keep narrow |
| Edit place | `/edit-place/[id]` | `max-w-lg` | Form page - keep narrow |
| Favorites | `/favorites` | `max-w-2xl` | Narrower than content pages |
| Profile (logged in) | `/profile` | `max-w-2xl` | Narrower than content pages |
| Profile (logged out) | `/profile` | `max-w-md` | Different from logged-in state |
| Settings | `/settings` | `max-w-2xl` | Narrower than content pages |
| Report (wizard) | `/report/[placeId]` | `max-w-4xl` | OK |
| Report (success) | `/report/[placeId]` | `max-w-2xl` | Mismatch with wizard state |
| Report (error) | `/report/[placeId]` | `max-w-7xl` | Mismatch with wizard state |
| Admin | `/admin` | `max-w-7xl` | OK - Data tables need width |

## Target State

Standardize into clear width tiers:

| Tier | Width | Pages |
|------|-------|-------|
| Full-width | none | Home (map page) |
| Standard content | `max-w-4xl` | Places listing, Place detail, Favorites, Profile, Settings, Report |
| Narrow form | `max-w-lg` | Add place, Edit place |
| Data-heavy | `max-w-7xl` | Admin dashboard |

## Changes Required

### Places listing (`/places`)
- Container: `max-w-7xl` -> `max-w-4xl`

### Place detail (`/places/[id]`)
- Error state: `max-w-7xl` -> `max-w-4xl` (match normal state)
- Normal/loading states already use `max-w-4xl` - no change

### Favorites (`/favorites`)
- Container: `max-w-2xl` -> `max-w-4xl`

### Profile (`/profile`)
- Logged-in state: `max-w-2xl` -> `max-w-4xl`
- Logged-out state: `max-w-md` -> `max-w-4xl`

### Settings (`/settings`)
- Container: `max-w-2xl` -> `max-w-4xl`

### Report (`/report/[placeId]`)
- Error state: `max-w-7xl` -> `max-w-4xl`
- Success state: `max-w-2xl` -> `max-w-4xl`
- Wizard state already uses `max-w-4xl` - no change

## Acceptance Criteria

- [x] All content pages use `max-w-4xl` consistently
- [x] Error states match their parent page width
- [x] Form pages (add/edit) remain at `max-w-lg`
- [x] Admin dashboard remains at `max-w-7xl`
- [x] Home (map) remains full-width
- [x] No layout breakage on mobile or desktop
- [x] Playwright tests verify consistent widths across pages (7/7 passing)

## Test Plan

Use Playwright to:
1. Navigate to each page and capture the computed max-width of the main container
2. Verify all content pages match `max-w-4xl` (56rem / 896px)
3. Verify visual appearance on desktop and mobile viewports
