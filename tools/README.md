# WheelCheck Visual & AI-Powered Tests

Two supplementary test layers on top of the existing Playwright suite:

| Layer | Tool | Language | Needs LLM? | What it catches |
|-------|------|----------|------------|-----------------|
| `tests/visual/` | browser-use | Python | ✅ Yes | Visual overlaps, contrast, accessibility audits, exploratory UX |
| `tests/browser-harness/` | browser-harness | Python | ❌ No | Leaflet canvas clicks, CDP-level map interactions, viewport geometry |

These are **supplementary** — keep running the Playwright suite for CI. Use these locally during development for richer feedback.

---

## Setup

```bash
# From project root:
python3 -m venv tools/venv
source tools/venv/bin/activate
pip install -r tools/requirements.txt
pip install -e tools/browser-harness   # CDP harness (already cloned)
python -m playwright install chromium  # for browser-use
```

---

## Running browser-use visual tests (LLM required)

```bash
# Set your API key (or add to .env at project root)
export ANTHROPIC_API_KEY=sk-ant-...
# OR
export OPENAI_API_KEY=sk-...

source tools/venv/bin/activate

# All visual tests
cd frontend && pytest tests/visual/ -v

# Just layout tests
pytest tests/visual/test_visual_layout.py -v

# Just accessibility audit
pytest tests/visual/test_accessibility.py -v

# The exploratory "wheelchair user" test (runs headed so you can watch)
pytest tests/visual/test_accessibility.py::test_exploratory_wheelchair_user_experience -v -s
```

**Cost estimate:** ~$0.05–0.20 per test run with Claude Sonnet. Full suite ≈ $0.50.

---

## Running browser-harness tests (no LLM, CDP only)

Requires Chrome running with remote debugging on port 9222:

```bash
# macOS:
open -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/wheelcheck-harness

# Linux:
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/wheelcheck-harness &
```

Then run:

```bash
source tools/venv/bin/activate

# Full browser-harness test suite
python frontend/tests/browser-harness/test_leaflet_map.py

# Or pipe individual scripts through browser-harness directly:
browser-harness <<'PY'
new_tab("http://localhost:3000/en")
wait_for_load()
print(page_info())
PY
```

---

## Test overview

### browser-use visual tests (`tests/visual/`)

| Test | What it checks |
|------|---------------|
| `test_no_overlapping_ui_elements` | LLM visually verifies no controls overlap on map page |
| `test_no_outer_scroll` | Body scrollHeight ≤ innerHeight (viewport locked) |
| `test_map_fills_viewport` | Map covers ≥ 55% of viewport height |
| `test_bottom_sheet_renders_correctly` | Click marker → sheet slides up with place name + badge |
| `test_search_suggestions_visible` | Search dropdown appears and isn't clipped |
| `test_map_page_aria_labels` | All buttons/inputs have accessible labels |
| `test_report_form_accessibility` | Report wizard form has labels, required markers, tab order |
| `test_color_contrast_filter_chips` | Filter chips meet WCAG AA contrast (visual perception) |
| `test_exploratory_wheelchair_user_experience` | Full UX test as a wheelchair user — finds friction points |

### browser-harness tests (`tests/browser-harness/`)

| Test | What it checks |
|------|---------------|
| `test_map_page_loads` | Page title + leaflet-container present |
| `test_no_outer_scroll` | scrollHeight ≤ innerHeight via CDP |
| `test_map_fills_viewport` | Map BoundingRect ≥ 55% of viewport |
| `test_filter_chips_not_overlapping_controls` | CDP pixel rect overlap detection |
| `test_leaflet_marker_click_opens_bottom_sheet` | CDP compositor click → bottom sheet |
| `test_map_pan_via_drag` | CDP mousedown/move/up → map center changes |
| `test_navigate_to_kuala_terengganu` | Search + navigate → markers appear |
| `test_data_freshness_notice_visible` | Amber data notice in DOM |

---

## Why not just Playwright?

| Issue | Playwright | browser-harness / browser-use |
|-------|------------|-------------------------------|
| Leaflet canvas marker clicks | `force: true` hack needed | CDP compositor events — no hack |
| Visual overlap detection | Manual `boundingBox()` math | LLM literally *sees* overlaps |
| Accessibility audits | `getByRole` only | Full AX tree + LLM vision |
| "Does this look broken?" | Can't answer | browser-use can |

Keep Playwright for CI (deterministic, fast, cross-browser). Use these for development-time richer feedback.
