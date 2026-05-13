#!/usr/bin/env python3
"""
WheelCheck CDP-level map tests using Playwright Python + raw CDP.

These test the same things as the Playwright TS tests but using:
  - Raw CDP Input.dispatchMouseEvent (compositor-level) for Leaflet canvas clicks
  - Direct JS evaluation for geometry checks
  - No 'force: true' hacks needed

This is the automated/CI-ready layer. For interactive browser-harness
exploration, see INTERACTIVE.md in this directory.

Run:
    source tools/venv/bin/activate
    python frontend/tests/browser-harness/test_cdp_map.py

Or via pytest:
    pytest frontend/tests/browser-harness/test_cdp_map.py -v
"""
import sys
import json
import time
from pathlib import Path

FRONTEND_URL = "http://localhost:3000"


def run_tests():
    from playwright.sync_api import sync_playwright, CDPSession

    passed = 0
    failed = 0
    errors = []

    def check(name: str, condition: bool, msg: str = ""):
        nonlocal passed, failed
        if condition:
            print(f"  ✅ {name}")
            passed += 1
        else:
            print(f"  ❌ {name}: {msg}")
            failed += 1
            errors.append((name, msg))

    print(f"\n🦽 WheelCheck CDP map tests\n{'='*55}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 390, "height": 844})  # iPhone 14 size
        page = ctx.new_page()

        # ── CDP session for raw dispatcher access ─────────────────────────
        cdp: CDPSession = ctx.new_cdp_session(page)

        print("\n[1] Page load and basic structure")
        page.goto(f"{FRONTEND_URL}/en", wait_until="domcontentloaded")
        page.wait_for_selector(".leaflet-container", timeout=15000)
        time.sleep(1.5)  # let markers load

        check("page loads", page.title() != "", f"title='{page.title()}'")
        check("leaflet container present",
              page.locator(".leaflet-container").count() > 0)
        check("search input present",
              page.locator('input[type="search"]').count() > 0)

        # ── Viewport locked (no outer scroll) ─────────────────────────────
        print("\n[2] Viewport — no outer scroll")
        dims = page.evaluate("""() => ({
            sh: document.body.scrollHeight,
            ih: window.innerHeight,
            sw: document.body.scrollWidth,
            iw: window.innerWidth
        })""")
        check("no vertical outer scroll",
              dims["sh"] <= dims["ih"] + 10,
              f"scrollHeight={dims['sh']} > innerHeight={dims['ih']}")
        check("no horizontal outer scroll",
              dims["sw"] <= dims["iw"] + 10,
              f"scrollWidth={dims['sw']} > innerWidth={dims['iw']}")

        # ── Map fills viewport ─────────────────────────────────────────────
        print("\n[3] Map geometry")
        map_rect = page.evaluate("""() => {
            const m = document.querySelector('[data-testid="map-view"]')
                   || document.querySelector('.leaflet-container');
            if (!m) return null;
            const r = m.getBoundingClientRect();
            return {top: r.top, left: r.left, width: r.width, height: r.height,
                    vpw: window.innerWidth, vph: window.innerHeight};
        }""")
        if map_rect:
            ratio = map_rect["height"] / map_rect["vph"]
            check("map fills ≥55% of viewport height",
                  ratio >= 0.55,
                  f"map is {ratio:.0%} of viewport")
            check("map starts near top (≤120px from top)",
                  map_rect["top"] <= 120,
                  f"map top={map_rect['top']}px")
        else:
            check("map rect found", False, "map element not found")

        # ── Filter chips don't overlap zoom controls ───────────────────────
        print("\n[4] UI element overlap check")
        overlap = page.evaluate("""() => {
            const chips = Array.from(document.querySelectorAll('button[aria-pressed]'));
            const zoomIn = document.querySelector('button[aria-label*="Zoom in"]');
            const myLoc  = document.querySelector('button[aria-label*="ocation"]');
            if (!chips.length) return {error: 'no chips'};
            const overlaps = [];
            const intersects = (a, b) =>
                a.right > b.left && a.left < b.right &&
                a.bottom > b.top && a.top < b.bottom;
            for (const chip of chips) {
                const cr = chip.getBoundingClientRect();
                if (zoomIn) {
                    const zr = zoomIn.getBoundingClientRect();
                    if (intersects(cr, zr)) overlaps.push('chip overlaps zoom-in');
                }
                if (myLoc) {
                    const lr = myLoc.getBoundingClientRect();
                    if (intersects(cr, lr)) overlaps.push('chip overlaps my-location');
                }
            }
            return {overlaps, chipCount: chips.length};
        }""")
        if overlap.get("error"):
            check("filter chips found", False, overlap["error"])
        else:
            check(f"filter chips present ({overlap['chipCount']})",
                  overlap["chipCount"] > 0)
            check("filter chips don't overlap controls",
                  len(overlap["overlaps"]) == 0,
                  str(overlap["overlaps"]))

        # ── Data freshness notice visible ──────────────────────────────────
        print("\n[5] Data freshness notice")
        notice = page.evaluate("""() => {
            for (const el of document.querySelectorAll('span, div, p')) {
                if (el.textContent?.includes('Data is imported')) return true;
            }
            return false;
        }""")
        check("data freshness notice visible", notice)

        # ── CDP compositor click on Leaflet marker ─────────────────────────
        print("\n[6] Leaflet marker click via CDP Input.dispatchMouseEvent")

        def cdp_click(x, y):
            cdp.send("Input.dispatchMouseEvent", {
                "type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1
            })
            cdp.send("Input.dispatchMouseEvent", {
                "type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1
            })

        def is_sheet_open():
            return page.evaluate('() => !!document.querySelector(\'[data-testid="bottom-sheet"]\')')

        # First try: find a single non-cluster marker
        marker_pos = page.evaluate("""() => {
            // Prefer individual markers over clusters
            const single = document.querySelector('.leaflet-marker-icon:not(.marker-cluster)');
            const any = document.querySelector('.leaflet-marker-icon, .marker-cluster');
            const m = single || any;
            if (!m) return null;
            const r = m.getBoundingClientRect();
            const isCluster = m.classList.contains('marker-cluster');
            return {x: r.left + r.width / 2, y: r.top + r.height / 2, isCluster};
        }""")

        sheet_found = False
        if marker_pos:
            print(f"  ℹ found {'cluster' if marker_pos.get('isCluster') else 'marker'} at ({marker_pos['x']:.0f}, {marker_pos['y']:.0f})")
            cdp_click(marker_pos["x"], marker_pos["y"])
            time.sleep(1.5)

            if is_sheet_open():
                sheet_found = True
            elif marker_pos.get("isCluster"):
                # Cluster click zooms in — wait for zoom then click a single marker
                time.sleep(1.5)
                single_pos = page.evaluate("""() => {
                    const m = document.querySelector('.leaflet-marker-icon:not(.marker-cluster)');
                    if (!m) return null;
                    const r = m.getBoundingClientRect();
                    return {x: r.left + r.width / 2, y: r.top + r.height / 2};
                }""")
                if single_pos:
                    print(f"  ℹ cluster zoomed — clicking single marker at ({single_pos['x']:.0f}, {single_pos['y']:.0f})")
                    cdp_click(single_pos["x"], single_pos["y"])
                    time.sleep(1.5)
                    sheet_found = is_sheet_open()

        if not sheet_found:
            # Final fallback: zoom into KL area and retry
            print("  ℹ zooming into KL centre to expose individual markers...")
            page.evaluate("""() => {
                const maps = Object.values(window).filter(
                    v => v && typeof v === 'object' && typeof v.setView === 'function'
                );
                if (maps.length) maps[0].setView([3.1478, 101.6953], 16);
            }""")
            time.sleep(2)
            zoomed_pos = page.evaluate("""() => {
                const m = document.querySelector('.leaflet-marker-icon:not(.marker-cluster)');
                if (!m) return null;
                const r = m.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height / 2};
            }""")
            if zoomed_pos:
                cdp_click(zoomed_pos["x"], zoomed_pos["y"])
                time.sleep(1.5)
                sheet_found = is_sheet_open()

        check("CDP marker click opens bottom sheet", sheet_found)

        # ── Map pan via CDP compositor drag ───────────────────────────────
        print("\n[7] Map pan via CDP drag")

        # Close any open bottom sheet first so it doesn't block the drag
        sheet_close = page.evaluate("""() => {
            const btn = document.querySelector('[data-testid="bottom-sheet"] button[aria-label*="lose"]')
                     || document.querySelector('[data-testid="bottom-sheet"] button[class*="close"]');
            if (btn) { btn.click(); return 'closed'; }
            return 'none';
        }""")
        if sheet_close == "closed":
            time.sleep(0.5)

        # Reload to get clean map state for pan test
        page.goto(f"{FRONTEND_URL}/en", wait_until="domcontentloaded")
        page.wait_for_selector(".leaflet-container", timeout=10000)
        time.sleep(1.5)
        # Access Leaflet map via its container's _leaflet property
        before_center = page.evaluate("""() => {
            // Try via leaflet container internal reference
            const containers = document.querySelectorAll('.leaflet-container');
            for (const c of containers) {
                const key = Object.keys(c).find(k => k.startsWith('_leaflet_'));
                if (key) {
                    const id = c[key];
                    const map = window['leaflet_map_' + id] || window['_leaflet_' + id];
                    if (map && map.getCenter) {
                        const center = map.getCenter();
                        return {lat: center.lat, lng: center.lng, found: 'keyed'};
                    }
                }
            }
            // Fallback: scan window for Leaflet Map instances
            for (const key of Object.keys(window)) {
                try {
                    const v = window[key];
                    if (v && typeof v.getCenter === 'function' && typeof v.setView === 'function') {
                        const c = v.getCenter();
                        return {lat: c.lat, lng: c.lng, found: key};
                    }
                } catch(e) {}
            }
            // Read viewport from data attribute set by our MapView component
            const vp = document.querySelector('[data-testid="map-viewport"]');
            if (vp) return {lat: parseFloat(vp.dataset.lat||0), lng: parseFloat(vp.dataset.lng||0), found: 'data-attr'};
            return null;
        }""")
        print(f"  ℹ before center: {before_center}")
        vp = page.viewport_size or {"width": 390, "height": 844}
        cx, cy = vp["width"] // 2, vp["height"] // 2

        cdp.send("Input.dispatchMouseEvent", {
            "type": "mousePressed", "x": cx, "y": cy, "button": "left", "clickCount": 1
        })
        for i in range(1, 8):
            cdp.send("Input.dispatchMouseEvent", {
                "type": "mouseMoved", "x": cx - i * 12, "y": cy, "button": "left"
            })
            time.sleep(0.03)
        cdp.send("Input.dispatchMouseEvent", {
            "type": "mouseReleased", "x": cx - 84, "y": cy, "button": "left"
        })
        time.sleep(0.8)

        after_center = page.evaluate("""() => {
            const containers = document.querySelectorAll('.leaflet-container');
            for (const c of containers) {
                const key = Object.keys(c).find(k => k.startsWith('_leaflet_'));
                if (key) {
                    const id = c[key];
                    const map = window['leaflet_map_' + id] || window['_leaflet_' + id];
                    if (map && map.getCenter) {
                        const center = map.getCenter();
                        return {lat: center.lat, lng: center.lng};
                    }
                }
            }
            for (const key of Object.keys(window)) {
                try {
                    const v = window[key];
                    if (v && typeof v.getCenter === 'function' && typeof v.setView === 'function') {
                        const c = v.getCenter();
                        return {lat: c.lat, lng: c.lng};
                    }
                } catch(e) {}
            }
            const vp = document.querySelector('[data-testid="map-viewport"]');
            if (vp) return {lat: parseFloat(vp.dataset.lat||0), lng: parseFloat(vp.dataset.lng||0)};
            return null;
        }""")

        if before_center and after_center:
            lng_diff = abs(after_center["lng"] - before_center["lng"])
            check("map panned after CDP drag",
                  lng_diff > 0.0005,
                  f"lng diff={lng_diff:.6f} (before={before_center['lng']:.4f} after={after_center['lng']:.4f})")
        else:
            print("  ℹ Leaflet map not accessible via window — skip pan check")

        # ── ARIA accessibility quick audit ─────────────────────────────────
        print("\n[8] ARIA accessibility audit")
        page.goto(f"{FRONTEND_URL}/en", wait_until="domcontentloaded")
        page.wait_for_selector(".leaflet-container", timeout=10000)

        aria_issues = page.evaluate("""() => {
            const issues = [];
            document.querySelectorAll('button').forEach(b => {
                const label = b.getAttribute('aria-label')
                           || b.textContent?.trim()
                           || b.getAttribute('title');
                if (!label || label.length < 2) {
                    issues.push('button missing label: ' + b.className.slice(0,40));
                }
            });
            document.querySelectorAll('input').forEach(i => {
                const label = i.getAttribute('aria-label')
                           || i.getAttribute('placeholder')
                           || i.getAttribute('title');
                if (!label) issues.push('input missing label: ' + i.type);
            });
            return issues;
        }""")
        check("all buttons have accessible labels",
              len(aria_issues) == 0,
              f"{len(aria_issues)} issues: {aria_issues[:3]}")

        # ── Kuala Terengganu nearby API ────────────────────────────────────
        print("\n[9] Malaysia coverage — Kuala Terengganu API")
        import urllib.request
        try:
            req = urllib.request.Request(
                "http://localhost:8080/api/places/nearby",
                data=json.dumps({"latitude": 5.31062, "longitude": 103.14308, "radius": 5000}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                places = json.loads(resp.read())
            check("Kuala Terengganu has ≥10 nearby places",
                  len(places) >= 10,
                  f"only {len(places)} places returned")
        except Exception as e:
            check("Kuala Terengganu API reachable", False, str(e))

        browser.close()

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print(f"Results: {passed} passed, {failed} failed / {passed+failed} total")
    if errors:
        print("\nFailures:")
        for name, msg in errors:
            print(f"  • {name}: {msg[:100]}")
    return failed


if __name__ == "__main__":
    sys.exit(run_tests())
