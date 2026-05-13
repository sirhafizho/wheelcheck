import { test, expect } from '@playwright/test';

test.describe('Viewport — no outer scroll', () => {
  test('home page has no vertical scroll', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

    // scrollHeight should equal clientHeight — no overflow
    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2); // 2px tolerance
  });

  test('home page map fills the content area between header and bottom nav', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

    const mapBox = await page.getByTestId('map-view').boundingBox();
    const viewportSize = page.viewportSize();

    expect(mapBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();

    // Map should be substantial (at least 60% of viewport height)
    expect(mapBox!.height).toBeGreaterThan(viewportSize!.height * 0.6);

    // Map top should be near the top (within 80px — right after header)
    expect(mapBox!.y).toBeLessThan(80);
  });

  test('places list page has no outer document scroll', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // The document html element should not overflow
    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2);
  });

  test('settings page has no outer document scroll', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2);
  });

  test('filter chips and search bar are fully visible without scrolling', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

    // All filter chips should be within viewport
    const chips = page.locator('button[aria-pressed]');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const chip = chips.nth(i);
      const box = await chip.boundingBox();
      expect(box).not.toBeNull();
      // Chip should be visible (top within viewport)
      const viewportSize = page.viewportSize()!;
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewportSize.height);
    }
  });
});
