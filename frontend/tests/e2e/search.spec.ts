import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should search from home page and show results', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Wait for initial nearby data to load first
    await expect(page.getByText(/nearby/)).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Set up response listener BEFORE typing
    const searchResponse = page.waitForResponse(
      resp => resp.url().includes('/places/search') && resp.status() === 200,
      { timeout: 25000 }
    );

    await searchInput.fill('KLCC');

    // Wait for the search API to actually respond
    await searchResponse;
    await expect(page.getByText(/\d+ results? found/)).toBeVisible({ timeout: 5000 });
  });

  test('should search from places page and filter results', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // Wait for initial places to load
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    // Set up response listener, then search
    const searchInput = page.locator('input[type="search"]');
    const searchResponse = page.waitForResponse(
      resp => resp.url().includes('/places/search') && resp.status() === 200,
      { timeout: 25000 }
    );
    await searchInput.fill('Pavilion KL');
    await searchResponse;

    // Results should be filtered
    await expect(page.getByText('Pavilion KL').first()).toBeVisible({ timeout: 5000 });
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThan(50);
  });

  test('should show no results for invalid search on places page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    const searchResponse = page.waitForResponse(
      resp => resp.url().includes('/places/search') && resp.status() === 200,
      { timeout: 25000 }
    );
    await searchInput.fill('xyznonexistent123');
    await searchResponse;

    await expect(page.getByText(/no places found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should clear search and show all results again', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    const initialCount = await page.locator('article').count();

    // Search to filter
    const searchResponse = page.waitForResponse(
      resp => resp.url().includes('/places/search') && resp.status() === 200,
      { timeout: 25000 }
    );
    await searchInput.fill('National Mosque');
    await searchResponse;
    await expect(page.locator('article').first()).toBeVisible({ timeout: 5000 });
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Clear search — triggers paginated /places reload
    const clearResponse = page.waitForResponse(
      resp => resp.url().includes('/places') && resp.status() === 200,
      { timeout: 25000 }
    );
    await searchInput.fill('');
    await clearResponse;
    await expect(page.locator('article').first()).toBeVisible({ timeout: 5000 });

    const restoredCount = await page.locator('article').count();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('home page should show nearby places count by default', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Default view should show places nearby (using default KL coordinates)
    await expect(page.getByText(/\d+ places? nearby/)).toBeVisible({ timeout: 15000 });
  });

  test('home page should switch to results count when searching', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Initially shows "nearby"
    await expect(page.getByText(/nearby/)).toBeVisible({ timeout: 15000 });

    // Set up listener BEFORE typing — use specific term to avoid huge result sets
    const searchInput = page.locator('input[type="search"]');
    const searchResponse = page.waitForResponse(
      resp => resp.url().includes('/places/search') && resp.status() === 200,
      { timeout: 25000 }
    );
    await searchInput.fill('Pavilion KL');
    await searchResponse;

    await expect(page.getByText(/found/)).toBeVisible({ timeout: 5000 });
  });
});
