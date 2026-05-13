# Malaysia-Wide Coverage Analysis

## Summary

The implementation is **architecturally complete** for Malaysia-wide coverage. All 13 states + 3
federal territories have bounding boxes, named endpoints, and geo-lookup support. However, several
gaps exist in *data availability* per adapter, and one coordinate bug was silently breaking Miri.

---

## What Was Already Done (and Works)

### 1. `AggregationController` — all states have endpoints

Every state has a named `POST /api/aggregation/import/<state>` endpoint, plus:
- `/import/peninsular` — all West Malaysia in one call
- `/import/malaysia` — full Malaysia (Peninsular + Sabah + Sarawak)
- `/import/region/{region}` — generic enum-driven endpoint
- `/import/custom` — arbitrary bounding box

### 2. `AggregationService.MalaysiaRegion` — 16 regions defined

All 13 states + WP KL/Putrajaya/Labuan are covered with accurate bounding boxes.

### 3. `MalaysiaGeoUtils` — city + state lookup for 50+ cities

Covers city-level boxes for KL, Selangor, Negeri Sembilan, Johor, Melaka, Pahang, Terengganu,
Kelantan, Kedah, Penang, Perak, Perlis, Sabah, and Sarawak, with state-level fallbacks.

---

## Bug Fixed in This Branch

### Miri (Sarawak) — inverted bounding box in `MalaysiaGeoUtils`

**File:** `backend/src/main/kotlin/com/wheelcheck/aggregation/MalaysiaGeoUtils.kt:86`

```
// Before (broken — south > north, so lat in south..north is always empty)
bbox(3.31, 113.02, 3.21, 113.12) to GeoRegion("Miri", "Sarawak")

// After (fixed)
bbox(3.21, 113.02, 3.31, 113.12) to GeoRegion("Miri", "Sarawak")
```

Effect: Any place in Miri previously fell through to the Sarawak state-level fallback, getting
`city = "Sarawak"` instead of `city = "Miri"`. Now resolved correctly.
A regression test was added to `MalaysiaGeoUtilsTest`.

---

## Per-Adapter Coverage Assessment

### OSM Overpass (`OsmOverpassAdapter`) — ✅ Fully Malaysia-wide

- Accepts any `BoundingBox`, no hardcoded regions.
- Queries wheelchair tags + major amenity types globally.
- **Limitation:** OSM data density varies. East Malaysia (Sabah/Sarawak) has fewer tagged places
  than KL/Selangor, but that's a data contribution problem, not a code problem.
- **Action needed:** None for code. Community OSM contributions in East Malaysia help.

### data.gov.my (`DataGovMyFacilitiesAdapter`) — ✅ Fully Malaysia-wide

- Downloads nationwide hospital/clinic datasets and filters by bbox in-memory.
- Datasets (`hospital_list`, `clinic_kesihatan`, `clinic_1malaysia`) are nationally complete.
- `enabled: true` by default in `application.yml` — already active.
- **Limitation:** No wheelchair accessibility tags in the datasets. All records start as `UNKNOWN`.
- **Action needed:** None for code.

### Prasarana GTFS (`PrasaranaGtfsAdapter`) — ⚠️ Partial — Klang Valley + Penang only

- `application.yml` categories configured: `rapid-rail-kl, rapid-bus-kl, rapid-bus-mrtfeeder, rapid-bus-sbk, rapid-bus-penang`
- **Missing feeds** (other states that Prasarana/data.gov.my publishes or may publish):
  - `rapid-bus-johor` — Rapid Bus Johor Bahru (if available on data.gov.my)
  - `rapid-bus-kuching` / Sarawak transit feeds
  - KTM Intercity (`ktmb`) — covers West Malaysia rural stations
  - Express Rail Link (ERL) — KLIA/KLIA2 (already in KL bbox but worth explicit inclusion)
- **Action needed:** Research which additional GTFS feeds exist on `api.data.gov.my/gtfs-static/`
  and add them to `categories` config. No code change required — config-only.
- **Note:** Prasarana is `enabled: false` by default. Must be turned on.

### accessibility.cloud (`AccessibilityCloudAdapter`) — ✅ Fully Malaysia-wide (when enabled)

- Radius-based query, works for any bbox center.
- **Limitation:** Uses a circle (radius from center), so very large bboxes (e.g. Pahang, Sarawak)
  will be clipped to 10km radius. For large states, consider splitting into sub-regions or
  calling with a custom smaller bbox per city.
- `enabled: false` — requires `ACCESSIBILITY_CLOUD_TOKEN`.

### Geoapify (`GeoapifyAdapter`) — ✅ Fully Malaysia-wide (when enabled)

- Passes bbox directly as `rect:west,south,east,north` filter — no geographic restriction.
- `enabled: false` — requires `GEOAPIFY_API_KEY`.
- **Limitation:** Free tier = 3,000 credits/day. Large bbox (full Malaysia) may require batching
  by state to stay under daily quota.

### Wikidata (`WikidataAdapter`) — ✅ Fully Malaysia-wide (when enabled)

- Uses SPARQL bounding box filter (`wikibase:box`) — fully parametric.
- Filters for `wdt:P17 wd:Q833` (country = Malaysia), so results are always Malaysian.
- `enabled: false` by default.

### ORS Routing (`OrsRoutingAdapter`) — ⚠️ Coverage unknown for East Malaysia

- ORS wheelchair routing relies on OSM road network quality.
- Peninsular Malaysia coverage should be reasonable.
- Sabah/Sarawak OSM road data is sparser — routing may fail or produce poor results.
- **Action needed:** Test ORS routing for East Malaysia cities explicitly.

---

## Dead Code / Technical Debt

### `KL_BBOX` and `SELANGOR_BBOX` constants in `AggregationService`

```kotlin
companion object {
    val KL_BBOX = MalaysiaRegion.KL.bbox       // referenced nowhere
    val SELANGOR_BBOX = MalaysiaRegion.SELANGOR.bbox  // referenced nowhere
}
```

These legacy constants are not referenced anywhere else in the codebase. They can be removed.
They are harmless but suggest the original KL-only phase was never fully cleaned up.

---

## Testing Gaps

### What is tested

- `MalaysiaGeoUtilsTest` — covers KL, PJ, Shah Alam, Georgetown, Ipoh, JB, Kota Bharu, Kuching,
  KK, Alor Setar, and now Miri (fixed).
- `PrasaranaGtfsAdapterTest` — tests Penang and JB coords via in-memory bbox.
- `DataGovMyFacilitiesAdapterTest` — unit tests for field extraction logic.

### What is NOT tested (unit/integration)

| Gap | Risk |
|-----|------|
| No test for Sabah state-level fallback | Coordinates that miss city boxes would get `city = "Sabah"` — acceptable, but untested |
| No test for Sarawak rural coords (non-city) | Same as above |
| No ORS routing test for non-KL bbox | Unknown whether ORS returns routes for Kota Kinabalu |
| No test that `importMalaysia()` calls adapters with correct FULL_MALAYSIA bbox | Integration gap |
| Prasarana categories config for non-KV feeds | No test validates which feeds produce results |

### Recommended test additions

1. `MalaysiaGeoUtilsTest` — add Sandakan (Sabah), Sibu (Sarawak), Seremban, Kuala Terengganu.
2. `AggregationControllerTest` — verify all 13-state endpoints map to the correct `MalaysiaRegion`.
3. `OrsRoutingAdapterTest` — add a test with Kota Kinabalu coords (mock the HTTP response).

---

## Recommended Next Steps (prioritised)

### P0 — Already done in this branch
- [x] Fix Miri inverted bbox in `MalaysiaGeoUtils`
- [x] Add Miri regression test

### P1 — Quick wins (no new code needed)
- [ ] Enable `prasarana.enabled: true` in dev/staging config and test all configured categories
- [ ] Research additional Prasarana/data.gov.my GTFS feeds for Johor, Sarawak transit
- [ ] Add config documentation comment listing all available GTFS categories

### P2 — Code cleanup
- [ ] Remove unused `KL_BBOX` and `SELANGOR_BBOX` constants from `AggregationService`
- [ ] Add missing city entries to `MalaysiaGeoUtils` for state coverage completeness:
  - Sabah: Keningau, Semporna, Beaufort
  - Sarawak: Bintulu, Kapit, Sri Aman

### P3 — Testing
- [ ] Add unit tests for all remaining states in `MalaysiaGeoUtilsTest`
- [ ] Add integration smoke tests that POST to each state import endpoint and verify
  non-zero results from at least OSM and data.gov.my adapters

### P4 — Large-bbox handling for paid adapters
- [ ] Consider splitting Geoapify calls by city when operating on state-level bbox to stay
  within daily quota (3,000 credits/day)
- [ ] Consider splitting accessibility.cloud calls when radius would exceed 10km cap
  (current code already caps at 10km, so large bboxes silently lose coverage)

---

## Conclusion

**The backend is Malaysia-wide ready at the API/routing layer.** Every state has working import
endpoints and correct bounding boxes (after the Miri fix). The data availability is asymmetric:

- **Strong coverage everywhere:** OSM, data.gov.my (hospitals/clinics)
- **Strong coverage KL/Selangor + Penang:** Prasarana GTFS (transit)
- **Weak/untested in East Malaysia:** Prasarana (no feeds), ORS routing quality
- **Coverage proportional to OSM community effort:** all other adapters

The most impactful near-term action is enabling Prasarana and verifying which additional GTFS
feeds exist for Johor, Sarawak, and Sabah transit networks on data.gov.my.
