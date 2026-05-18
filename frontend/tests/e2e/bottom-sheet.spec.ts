import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('BottomSheet', () => {
  async function openSheetViaSearch(page: import('@playwright/test').Page) {
    await page.goto(`${BASE}/en`);
    // Wait for search input (type="search" in the floating bar)
    const search = page.locator('input[type="search"]').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.click();
    await search.fill('Hospital');
    // Wait for suggestion to appear
    const suggestion = page.locator('[data-testid="search-suggestion"]').first();
    await expect(suggestion).toBeVisible({ timeout: 10000 });
    await suggestion.click();
    return page.locator('[data-testid="bottom-sheet"]');
  }

  test('opens when a search result is selected', async ({ page }) => {
    const sheet = await openSheetViaSearch(page);
    await expect(sheet).toBeVisible({ timeout: 8000 });
  });

  test('sheet contains place name', async ({ page }) => {
    const sheet = await openSheetViaSearch(page);
    await expect(sheet).toBeVisible({ timeout: 8000 });

    const heading = sheet.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    console.log('Place in sheet:', name?.trim());
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test('closes when backdrop is clicked', async ({ page }) => {
    const sheet = await openSheetViaSearch(page);
    await expect(sheet).toBeVisible({ timeout: 8000 });

    await page.locator('[data-testid="bottom-sheet-backdrop"]').click({ force: true });
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
  });

  test('closes with Escape key', async ({ page }) => {
    const sheet = await openSheetViaSearch(page);
    await expect(sheet).toBeVisible({ timeout: 8000 });

    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
  });
});
