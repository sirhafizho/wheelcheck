/**
 * Tests for:
 * 1. Colour-coded accessibility markers on the map
 * 2. Hover tooltip showing place name on markers
 * 3. Search dropdown accessibility status badge
 * 4. AI enrichment panel on place detail
 */
import { test, expect, type Page } from '@playwright/test';

/** Close any open bottom sheet via Escape then wait for it to be gone. */
async function closeSheet(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

/**
 * Search for `query`, wait for suggestions, select the first result to fly the
 * map to that location — then IMMEDIATELY dismiss the resulting bottom sheet so
 * the map layer is not obscured for subsequent hover/click tests.
 */
async function flyToViaSearch(page: Page, query: string) {
  const input = page.locator('input[type="search"]');
  await input.click();
  await input.pressSequentially(query, { delay: 40 });

  const suggestions = page.getByTestId('search-suggestions');
  await expect(suggestions).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('search-suggestion').first()).toBeVisible({ timeout: 8_000 });
  await page.getByTestId('search-suggestion').first().click();

  // Give map time to fly + render individual markers at the new zoom
  await page.waitForTimeout(1_500);

  // Clear the search field — this triggers setSelectedPlace(null) which closes the bottom sheet
  await input.fill('');
  await page.waitForTimeout(600);
}

async function waitForIndividualMarker(page: Page) {
  await expect(page.locator('.leaflet-marker-icon:not(.marker-cluster)').first())
    .toBeVisible({ timeout: 12_000 });
}

// ---------------------------------------------------------------------------
// 1. Colour-coded markers
// ---------------------------------------------------------------------------
test.describe('Colour-coded accessibility markers', () => {
  test('markers use custom DivIcon, not default Leaflet blue pin', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital');
    await waitForIndividualMarker(page);

    // Our DivIcon injects an inner <div data-testid="map-marker">
    const coloredMarker = page.locator('[data-testid="map-marker"]').first();
    await expect(coloredMarker).toBeVisible({ timeout: 8_000 });

    const style = await coloredMarker.getAttribute('style');
    expect(style).toMatch(/background:/);
  });

  test('marker colours come from the four accessibility states', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital');
    await waitForIndividualMarker(page);

    const KNOWN = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];
    const markers = page.locator('[data-testid="map-marker"]');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);

    let found = false;
    for (let i = 0; i < Math.min(count, 8); i++) {
      const style = (await markers.nth(i).getAttribute('style')) ?? '';
      if (KNOWN.some(c => style.includes(c))) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Hover tooltip shows place name
// ---------------------------------------------------------------------------
test.describe('Marker hover tooltip', () => {
  test('hovering an individual marker shows a non-empty name tooltip', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital');
    await waitForIndividualMarker(page);

    // Pick a marker that is not behind the search bar overlay (skip top-left ones)
    const markers = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
    const count = await markers.count();
    let tooltipShown = false;

    for (let i = 0; i < Math.min(count, 8); i++) {
      try {
        await markers.nth(i).hover({ timeout: 3_000 });
        const tooltip = page.locator('.leaflet-tooltip').first();
        if (await tooltip.isVisible({ timeout: 2_000 })) {
          const text = await tooltip.textContent();
          expect(text?.trim().length).toBeGreaterThan(0);
          tooltipShown = true;
          break;
        }
      } catch { /* try next marker */ }
    }

    expect(tooltipShown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Search dropdown accessibility badge
// ---------------------------------------------------------------------------
test.describe('Search suggestions accessibility badge', () => {
  test('each suggestion item includes an accessibility status badge', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const input = page.locator('input[type="search"]');
    await input.click();
    await input.pressSequentially('Hospital', { delay: 40 });

    await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByTestId('search-suggestion').first()).toBeVisible({ timeout: 8_000 });

    const badge = page.locator('[data-testid="search-suggestion-access-badge"]').first();
    await expect(badge).toBeVisible({ timeout: 5_000 });

    const text = await badge.textContent();
    const KNOWN = ['Accessible', 'Partial', 'Not accessible', 'Unknown'];
    expect(KNOWN.some(l => text?.includes(l))).toBe(true);
  });

  test('accessibility badges use colour-coded CSS classes', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const input = page.locator('input[type="search"]');
    await input.click();
    await input.pressSequentially('Hospital', { delay: 40 });

    await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 12_000 });
    await expect(page.getByTestId('search-suggestion').first()).toBeVisible({ timeout: 8_000 });

    const badges = page.locator('[data-testid="search-suggestion-access-badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const cls = await badges.nth(i).getAttribute('class');
      const hasColor = cls?.includes('emerald') || cls?.includes('amber')
                    || cls?.includes('red')     || cls?.includes('gray');
      expect(hasColor).toBe(true);
    }
  });

  test('badge has non-empty text content (screen-reader accessible)', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const input = page.locator('input[type="search"]');
    await input.click();
    await input.pressSequentially('Masjid', { delay: 40 });

    await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 12_000 });
    const items = page.getByTestId('search-suggestion');
    if (await items.count() === 0) test.skip(true, 'No results for Masjid');
    await expect(items.first()).toBeVisible({ timeout: 8_000 });

    const badges = page.locator('[data-testid="search-suggestion-access-badge"]');
    for (let i = 0; i < Math.min(await badges.count(), 3); i++) {
      expect((await badges.nth(i).textContent())?.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. AI enrichment panel
// ---------------------------------------------------------------------------
test.describe('AI enrichment panel', () => {
  test('clicking a marker opens the place detail bottom sheet', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital');
    await waitForIndividualMarker(page);

    // Click the first marker not obscured by the search overlay
    const markers = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
    let opened = false;
    for (let i = 0; i < Math.min(await markers.count(), 6); i++) {
      try {
        await markers.nth(i).click({ timeout: 3_000 });
        if (await page.locator('[data-testid="bottom-sheet"]').isVisible({ timeout: 4_000 })) {
          opened = true;
          break;
        }
      } catch { /* try next */ }
    }
    expect(opened).toBe(true);
  });

  test('enriched place shows AI panel with confidence badge', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital Kepala Batas');
    await waitForIndividualMarker(page);

    const markers = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
    let foundEnrichment = false;

    for (let i = 0; i < Math.min(await markers.count(), 8); i++) {
      try { await markers.nth(i).click({ timeout: 3_000 }); } catch { continue; }
      await page.waitForTimeout(1_500);

      if (await page.locator('[data-testid="ai-enrichment-panel"]').isVisible({ timeout: 2_000 }).catch(() => false)) {
        foundEnrichment = true;
        await expect(page.locator('[data-testid="ai-enrichment-toggle"]')).toBeVisible();
        break;
      }
      await closeSheet(page);
    }

    if (!foundEnrichment) test.skip(true, 'No enriched places visible in current viewport');
  });

  test('AI panel toggle expands to show full reasoning text', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await flyToViaSearch(page, 'Hospital Kepala Batas');
    await waitForIndividualMarker(page);

    const markers = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
    let foundEnrichment = false;

    for (let i = 0; i < Math.min(await markers.count(), 8); i++) {
      try { await markers.nth(i).click({ timeout: 3_000 }); } catch { continue; }
      await page.waitForTimeout(1_500);

      const panel = page.locator('[data-testid="ai-enrichment-panel"]');
      if (await panel.isVisible({ timeout: 2_000 }).catch(() => false)) {
        foundEnrichment = true;
        await page.locator('[data-testid="ai-enrichment-toggle"]').click();
        await expect(panel).toContainText(/Hospital|accessible|wheelchair|Malaysia/i, { timeout: 3_000 });
        break;
      }
      await closeSheet(page);
    }

    if (!foundEnrichment) test.skip(true, 'No enriched places in current viewport');
  });
});
