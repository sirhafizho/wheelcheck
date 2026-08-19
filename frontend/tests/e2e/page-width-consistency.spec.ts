import { test, expect, type Page } from '@playwright/test';

/**
 * Verifies that all content pages use consistent max-width containers.
 *
 * Expected tiers:
 *   - Content pages: max-w-4xl (max-width: 56rem = 896px)
 *   - Form pages:    max-w-lg  (max-width: 32rem = 512px)
 *   - Admin:         max-w-7xl (max-width: 80rem = 1280px)
 *   - Home:          full-width (no max-width constraint on map)
 */

const mockPlace = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Test Place KL',
  latitude: 3.157,
  longitude: 101.712,
  address: '123 Jalan Test, Kuala Lumpur',
  city: 'Kuala Lumpur',
  state: 'Wilayah Persekutuan Kuala Lumpur',
  category: 'RESTAURANT',
  accessibilityLevel: 'FULL',
  reviewCount: 5,
  createdAt: '2024-01-01T10:00:00Z',
  lastReportedAt: '2024-02-01T10:00:00Z',
  dataSource: 'OSM',
};

const mockPlacesResponse = {
  data: [mockPlace],
  total: 1,
  page: 0,
  size: 20,
};

async function mockAllApis(page: Page) {
  await page.route('**/api/places/nearby', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockPlace]),
    });
  });

  await page.route('**/api/places/search*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlacesResponse),
    });
  });

  await page.route(`**/api/places/${mockPlace.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlace),
    });
  });

  await page.route(`**/api/places/${mockPlace.id}/enrichment`, async (route) => {
    await route.fulfill({ status: 404 });
  });

  await page.route('**/api/reviews/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/comments/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/favorites/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({ status: 401 });
  });
}

/**
 * Returns the computed max-width (in px) of the first child container
 * inside the page's scrollable wrapper. We look for the first element
 * matching the selector inside the main scrollable div.
 */
async function getContentMaxWidth(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate((el) => {
    return window.getComputedStyle(el).maxWidth;
  });
}

test.describe('Page width consistency', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
  });

  test('Places listing uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    // Wait for skeleton or content to load
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('Place detail uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto(`/en/places/${mockPlace.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('Favorites uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto('/en/favorites', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('Settings uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('Profile uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('Report page uses max-w-4xl (896px)', async ({ page }) => {
    await page.goto(`/en/report/${mockPlace.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
    const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
    expect(maxWidth).toBe('896px');
  });

  test('All content pages have matching container widths on desktop', async ({ page }) => {
    const contentPages = [
      '/en/places',
      `/en/places/${mockPlace.id}`,
      '/en/favorites',
      '/en/settings',
      '/en/profile',
    ];

    const widths: string[] = [];

    for (const route of contentPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
      const maxWidth = await getContentMaxWidth(page, '.max-w-4xl');
      widths.push(maxWidth);
    }

    // All pages should have the same max-width
    const uniqueWidths = [...new Set(widths)];
    expect(uniqueWidths).toHaveLength(1);
    expect(uniqueWidths[0]).toBe('896px');
  });
});
