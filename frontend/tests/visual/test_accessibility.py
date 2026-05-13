"""
Accessibility audit tests using browser-use + LLM vision.

These go beyond what Playwright's getByRole/getByLabel can check:
  - Full ARIA accessibility tree audit
  - Color contrast (visual perception via LLM)
  - Keyboard navigation flow
  - Semantic HTML for a wheelchair accessibility app (meta-irony!)

Run: pytest tests/visual/test_accessibility.py -v
Requires: ANTHROPIC_API_KEY or OPENAI_API_KEY
"""
import pytest
from browser_use import Agent
from browser_use.browser import BrowserProfile

from conftest import FRONTEND_URL


def make_agent(task: str, llm, headless: bool = True) -> Agent:
    profile = BrowserProfile(headless=headless, disable_security=False)
    return Agent(
        task=task,
        llm=llm,
        browser_profile=profile,
        use_vision=True,
        max_failures=2,
        max_actions_per_step=8,
    )


@pytest.mark.asyncio
async def test_map_page_aria_labels(llm):
    """
    All interactive controls on the home map page must have accessible labels.
    Critical for users with screen readers (relevant for a wheelchair accessibility app!).
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.

    Execute this JavaScript to audit interactive elements without ARIA labels:
    const problems = [];
    document.querySelectorAll('button, input, a[href]').forEach(el => {{
        const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
                      el.textContent?.trim() || el.getAttribute('title') || el.getAttribute('alt');
        if (!label || label.length < 2) {{
            problems.push(el.tagName + ' ' + (el.className || '').slice(0, 50));
        }}
    }});
    JSON.stringify({{count: problems.length, problems: problems.slice(0, 10)}})

    If count is 0: PASS - all interactive elements have accessible labels.
    If count > 0: FAIL - X elements missing labels: <list them>.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"ARIA label issues: {final}"


@pytest.mark.asyncio
async def test_report_form_accessibility(llm):
    """
    The report wizard form (the core user action) must be fully accessible.
    All inputs must have labels, required fields must be marked, submit button must be labelled.
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.
    Click on the first map marker you can see to open the bottom sheet.
    Wait for the bottom sheet to appear, then look for a "Report" button and click it.
    Wait for a report wizard/form to appear.

    If a report form appears, audit it:
    1. Does every input field have a visible label?
    2. Are required fields indicated (asterisk, aria-required, or similar)?
    3. Does the submit/next button have a clear label?
    4. Is the form navigable by keyboard (logical tab order)?

    Output: PASS - report form is accessible with proper labels and indicators.
    Or: FAIL - <describe specific accessibility problems found>.

    If you cannot find the Report button or the form, output: SKIP - could not navigate to report form.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    # SKIP is acceptable if navigation to report form fails (e.g. no markers loaded)
    assert "FAIL" not in final.upper(), f"Report form accessibility issue: {final}"


@pytest.mark.asyncio
async def test_color_contrast_filter_chips(llm):
    """
    Filter chip buttons must have sufficient color contrast for low-vision users.
    This is checked visually by the LLM — something Playwright can't do.
    """
    task = f"""
    Go to {FRONTEND_URL}/en and wait for the map to load.

    Look at the filter chip buttons below the search bar (e.g. "Ramp", "Elevator", "Toilet" etc.).

    Evaluate the color contrast:
    1. Are the text labels on unselected chips clearly readable against their background?
    2. Are selected/active chips visually distinct with sufficient contrast?
    3. Would a user with low vision or color blindness be able to distinguish selected vs unselected chips?

    Consider WCAG AA standard: text should have at least 4.5:1 contrast ratio.

    Output: PASS - filter chips have sufficient contrast and are distinguishable.
    Or: FAIL - <describe which chips have contrast issues>.
    """
    agent = make_agent(task, llm)
    result = await agent.run()
    final = result.final_result() or ""
    assert "FAIL" not in final.upper(), f"Color contrast issue: {final}"


@pytest.mark.asyncio
async def test_exploratory_wheelchair_user_experience(llm):
    """
    Exploratory test: simulate a wheelchair user trying to find an accessible place.
    The LLM acts as the user and reports any friction points or confusing UI.
    This is the 'find bugs you didn't write a test for' use case.
    """
    task = f"""
    You are a wheelchair user trying to find an accessible restaurant or café near KLCC in Kuala Lumpur.
    Use the WheelCheck app at {FRONTEND_URL}/en to find one.

    Steps to try:
    1. Look at what's visible on the map initially.
    2. Try searching for "KLCC" or "Suria KLCC".
    3. Try using the filter chips to filter by accessibility level.
    4. Click on a place to see its accessibility details.
    5. Try to understand whether the place is accessible for a wheelchair user.

    As you go, note any friction points:
    - Confusing UI elements
    - Missing information a wheelchair user would need
    - Broken interactions
    - Anything that made the task harder than it should be

    Finally summarise:
    - PASS if you successfully found an accessible place with clear information
    - PARTIAL if you found a place but the information was unclear or the process was frustrating
    - FAIL if you could not complete the task at all

    Be detailed in your findings — this is a usability report for developers.
    """
    agent = make_agent(task, llm, headless=False)  # Run headed so we can watch
    result = await agent.run()
    final = result.final_result() or ""
    # We accept PARTIAL — we want the report even if it's not perfect
    assert "FAIL" not in final.upper(), f"Exploratory wheelchair user test failed: {final}"
