# browser-harness Interactive Guide for WheelCheck

`browser-harness` is a **developer tool** for interactive exploration and
debugging in your running Chrome. It's not for CI — use `test_cdp_map.py`
(Playwright Python) for automated runs.

## Quick start

1. Open Chrome and go to `chrome://inspect/#remote-debugging`
2. Tick **"Allow remote debugging for this browser instance"** → click **Allow** on the popup
3. Open a new tab to `http://localhost:3000/en`
4. Run any harness command:

```bash
source tools/venv/bin/activate

# Inspect the map page
browser-harness <<'PY'
print(page_info())
result = js("document.querySelector('.leaflet-container') ? 'MAP_FOUND' : 'MAP_MISSING'")
print(result)
PY
```

## Useful snippets for WheelCheck

### Check viewport scroll
```bash
browser-harness <<'PY'
dims = js("JSON.stringify({sh: document.body.scrollHeight, ih: window.innerHeight})")
import json
d = json.loads(dims)
print(f"scrollHeight={d['sh']} innerHeight={d['ih']} diff={d['sh']-d['ih']}")
PY
```

### Check element overlaps
```bash
browser-harness <<'PY'
rects = js("""
    const chip = document.querySelector('button[aria-pressed]');
    const zoom = document.querySelector('button[aria-label*="Zoom in"]');
    if (!chip || !zoom) return 'elements not found';
    const cr = chip.getBoundingClientRect();
    const zr = zoom.getBoundingClientRect();
    JSON.stringify({chipBottom: cr.bottom, zoomTop: zr.top, overlap: cr.bottom > zr.top && cr.right > zr.left})
""")
print(rects)
PY
```

### CDP compositor click on a Leaflet marker
```bash
browser-harness <<'PY'
import time, json
marker = js("""
    const m = document.querySelector('.leaflet-marker-icon');
    if (!m) return JSON.stringify({found: false});
    const r = m.getBoundingClientRect();
    JSON.stringify({found: true, x: r.left + r.width/2, y: r.top + r.height/2})
""")
pos = json.loads(marker)
if pos['found']:
    click_at_xy(pos['x'], pos['y'])
    time.sleep(1)
    sheet = js("document.querySelector('[data-testid=\"bottom-sheet\"]') ? 'OPEN' : 'CLOSED'")
    print("Bottom sheet:", sheet)
else:
    print("No markers visible")
PY
```

### Full AX accessibility tree
```bash
browser-harness <<'PY'
tree = cdp("Accessibility.getFullAXTree")
nodes = tree.get("nodes", [])
missing_labels = [n for n in nodes if n.get("role", {}).get("value") == "button" and not n.get("name", {}).get("value")]
print(f"Buttons missing accessible names: {len(missing_labels)}")
for n in missing_labels[:5]:
    print(" -", n.get("backendDOMNodeId"), n.get("description", {}).get("value", ""))
PY
```

### Navigate to Kuala Terengganu and check markers
```bash
browser-harness <<'PY'
import time, json
new_tab("http://localhost:3000/en")
wait_for_load()
fill_input('input[type="search"]', "Kuala Terengganu")
time.sleep(2)
cdp("Input.dispatchKeyEvent", type="keyDown", key="Enter", code="Enter")
time.sleep(3)
markers = js("document.querySelectorAll('.leaflet-marker-icon, .marker-cluster').length")
print(f"Markers visible: {markers}")
capture_screenshot("/tmp/wheelcheck-terengganu.png")
print("Screenshot saved to /tmp/wheelcheck-terengganu.png")
PY
```
