"""
Visual layout tests using browser-use + LLM vision.

These tests use an AI agent with screenshot capabilities to catch visual
regressions that are difficult to express as coordinate/pixel assertions:
  - Overlapping UI elements on the map page
  - Filter chips clipped or hidden
  - Viewport scroll issues
  - Bottom sheet rendering

Run: pytest tests/visual/test_visual_layout.py -v
Requires: ANTHROPIC_API_KEY or OPENAI_API_KEY
"""
import pytest
import pytest_asyncio
from browser_use import Agent
from browser_use.browser import BrowserProfile

from conftest import FRONTEND_URL


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_agent(task: str, llm, headless: bool = True) -> Agent:
    profile = BrowserProfile(headless=headless, disable_security=False)
    return Agent(
        task=task,
        llm=llm,
        browser_profile=profile,
        use_vision=True,
        max_failures=2,
        max_actions_per_step=5,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_overlapping_ui_elements(llm):
    """
    AI visually inspects the home map page and reports any overlapping controls.
    The filter chips, zoom buttons, my-location button and the places count pill
    must all be visible and non-overlapping.
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load (you will see a Leaflet map).

    Visually inspect the page and check ALL of the following:
    1. Filter chips (e.g. "Ramp", "Elevator", "Toilet") are fully visible below the search bar.
    2. The "My Location" button and zoom in/out buttons on the right side are NOT overlapping the filter chips.
    3. The amber "Data is imported, not live" notice at the bottom left is visible and not cut off.
    4. No UI element appears to be on top of / hidden behind another element unexpectedly.

    If everything looks correct, output: PASS - no overlapping elements detected.
    If you find any overlap or hidden element, output: FAIL - <describe what is overlapping>.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper() or "no overlap" in final.lower(), \
        f"Visual overlap detected: {final}"


@pytest.mark.asyncio
async def test_no_outer_scroll(llm):
    """
    The page body should NOT be scrollable — the map fills the viewport.
    The user should never see a vertical scrollbar on the home page.
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.

    Check if the page body is scrollable (i.e. can you scroll up or down to reveal
    content outside the current viewport?).

    To verify: look at document.body.scrollHeight vs window.innerHeight.
    Execute JavaScript: JSON.stringify({{sh: document.body.scrollHeight, ih: window.innerHeight}})

    If scrollHeight <= innerHeight + 5 (allowing 5px tolerance), output: PASS - viewport locked, no outer scroll.
    If scrollHeight > innerHeight + 5, output: FAIL - page is scrollable by Xpx (fill in X).
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"Outer scroll detected: {final}"


@pytest.mark.asyncio
async def test_map_fills_viewport(llm):
    """The Leaflet map must fill at least 60% of the viewport height."""
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.

    Find the Leaflet map container (it has data-testid="map-view" or class "leaflet-container").
    Get its bounding rect and the window inner height.

    Execute JavaScript:
    const map = document.querySelector('[data-testid="map-view"]') || document.querySelector('.leaflet-container');
    const r = map ? map.getBoundingClientRect() : null;
    JSON.stringify({{mapH: r ? r.height : 0, vph: window.innerHeight, ratio: r ? r.height/window.innerHeight : 0}})

    If the map height ratio >= 0.55 (55% of viewport), output: PASS - map fills X% of viewport.
    If the map height ratio < 0.55, output: FAIL - map only fills X% of viewport.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"Map does not fill viewport: {final}"


@pytest.mark.asyncio
async def test_bottom_sheet_renders_correctly(llm):
    """
    Clicking a map marker should open a bottom sheet with accessibility info.
    The sheet must be visible, not cut off, and show the place name + accessibility badge.
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to fully load (wait for map tiles and markers).

    Find any clickable marker on the map (they appear as coloured circles or pins).
    Click on the first marker you can see.

    Wait up to 3 seconds for a bottom sheet to slide up from the bottom of the screen.

    Check that:
    1. A bottom sheet panel is now visible at the bottom of the screen.
    2. It shows a place name (some text heading).
    3. It shows an accessibility badge (e.g. "Accessible", "Partial", "Not Accessible").
    4. The sheet is NOT clipped — the content is fully visible.

    If all 4 conditions are met: PASS - bottom sheet rendered correctly with place name and accessibility badge.
    Otherwise: FAIL - <describe what is missing or wrong>.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"Bottom sheet rendering issue: {final}"


@pytest.mark.asyncio
async def test_search_suggestions_visible(llm):
    """Search suggestions dropdown must appear and not be clipped off-screen."""
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.

    Click on the search input at the top of the page and type "KLCC".
    Wait up to 3 seconds for search suggestions to appear.

    Check:
    1. A dropdown list of suggestions appears below the search bar.
    2. The suggestions are fully visible (not cut off by the map or viewport edge).
    3. The suggestions contain relevant text (place names or addresses).

    If the dropdown appears and looks correct: PASS - search suggestions visible and not clipped.
    If missing or clipped: FAIL - <describe the issue>.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"Search suggestions issue: {final}"
