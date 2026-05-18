/**
 * Map styling tests — CartoDB tiles, dark mode, cluster appearance, tooltip glass-morphism.
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Navigate to the map, optionally in dark mode. */
async function openMap(page: Page, dark = false) {
  await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((isDark) => {
    localStorage.setItem('wheelcheck_dark_mode', isDark ? 'true' : 'false');
  }, dark);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="map-view"]')).toBeVisible({ timeout: 15_000 });
  if (dark) await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 });
}

/** Zoom into an area with individual markers via search. */
async function zoomInViaSearch(page: Page, query = 'Hospital') {
  const input = page.locator('input[type="search"]');
  await input.fill(query);
  await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 12_000 });
  await page.getByTestId('search-suggestion').first().click();
  await page.waitForTimeout(1_800);
  // Clear input to close bottom sheet
  await input.fill('');
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// 1. CartoDB tile layer
// ---------------------------------------------------------------------------

test.describe('CartoDB tile layer', () => {
  test('light mode uses CartoDB Positron tile URL', async ({ page }) => {
    await openMap(page, false);
    await page.waitForTimeout(1_500);

    const tileImg = page.locator('.leaflet-tile-pane img').first();
    await expect(tileImg).toBeVisible({ timeout: 10_000 });
    const src = await tileImg.getAttribute('src').catch(() => null);
    expect(src ?? '').toContain('basemaps.cartocdn.com/light_all');
  });

  test('dark mode uses CartoDB Dark Matter tile URL', async ({ page }) => {
    await openMap(page, true);
    await page.waitForTimeout(1_500);

    const tileImg = page.locator('.leaflet-tile-pane img').first();
    await expect(tileImg).toBeVisible({ timeout: 10_000 });
    const src = await tileImg.getAttribute('src').catch(() => null);
    expect(src ?? '').toContain('basemaps.cartocdn.com/dark_all');
  });

  test('dark mode tile pane has NO CSS invert filter', async ({ page }) => {
    await openMap(page, true);

    const filter = await page.locator('.leaflet-tile-pane').evaluate(
      (el) => (el as HTMLElement).style.filter || getComputedStyle(el).filter
    );
    expect(filter).not.toContain('invert');
  });
});

// ---------------------------------------------------------------------------
// 2. Tooltip glass-morphism
// ---------------------------------------------------------------------------

test.describe('Marker tooltip styling', () => {
  test('tooltip appears on marker hover with no arrow', async ({ page }) => {
    await openMap(page, false);
    await zoomInViaSearch(page);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    await expect(marker).toBeVisible({ timeout: 10_000 });
    await marker.hover();
    await page.waitForTimeout(500);

    const tooltip = page.locator('.leaflet-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 4_000 });

    // Arrow (::before) should be hidden
    const arrowDisplay = await tooltip.evaluate(
      (el) => window.getComputedStyle(el, '::before').display
    );
    expect(arrowDisplay).toBe('none');
  });

  test('tooltip is visible in dark mode', async ({ page }) => {
    await openMap(page, true);
    await zoomInViaSearch(page);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    await expect(marker).toBeVisible({ timeout: 10_000 });
    await marker.hover();
    await page.waitForTimeout(500);

    await expect(page.locator('.leaflet-tooltip')).toBeVisible({ timeout: 4_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Cluster appearance
// ---------------------------------------------------------------------------

test.describe('Cluster appearance', () => {
  test('clusters do not use the old yellow default colours', async ({ page }) => {
    await openMap(page, false);
    await page.waitForTimeout(2_000);

    const cluster = page.locator('.marker-cluster').first();
    if (!(await cluster.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    const bg = await cluster.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Old default had green-yellow (181, 226, 140). Our custom uses emerald or transparent.
    expect(bg).not.toContain('181, 226');
    expect(bg).not.toContain('241, 211');
  });

  test('cluster inner div shows a count number', async ({ page }) => {
    await openMap(page, false);
    await page.waitForTimeout(2_000);

    const clusterDiv = page.locator('.marker-cluster div').first();
    if (!(await clusterDiv.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    const text = await clusterDiv.textContent();
    expect(parseInt(text ?? '0', 10)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Attribution
// ---------------------------------------------------------------------------

test.describe('Attribution', () => {
  test('attribution references CARTO and is small', async ({ page }) => {
    await openMap(page, false);

    const attr = page.locator('.leaflet-control-attribution');
    await expect(attr).toBeVisible();

    const text = await attr.innerText();
    expect(text.toLowerCase()).toContain('carto');

    const fontSize = await attr.evaluate(
      (el) => parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeLessThanOrEqual(11);
  });

  test('dark mode attribution has dark background', async ({ page }) => {
    await openMap(page, true);

    const attr = page.locator('.leaflet-control-attribution');
    const bg = await attr.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      expect((r + g + b) / 3).toBeLessThan(80);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Visual screenshots (light + dark)
// ---------------------------------------------------------------------------

test.describe('Visual snapshots', () => {
  test('light mode map', async ({ page }) => {
    await openMap(page, false);
    await page.waitForTimeout(2_500);
    await expect(page.locator('[data-testid="map-view"]')).toHaveScreenshot(
      'map-light.png',
      { maxDiffPixelRatio: 0.08 }
    );
  });

  test('dark mode map', async ({ page }) => {
    await openMap(page, true);
    await page.waitForTimeout(2_500);
    await expect(page.locator('[data-testid="map-view"]')).toHaveScreenshot(
      'map-dark.png',
      { maxDiffPixelRatio: 0.08 }
    );
  });
});
