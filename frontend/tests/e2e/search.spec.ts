import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should search from home page and show results', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('KLCC');

    // Wait for debounced search to trigger and results to update
    await page.waitForTimeout(500);

    // Should show filtered results (KLCC Park, Suria KLCC)
    await expect(page.getByText(/\d+ results? found/)).toBeVisible({ timeout: 10000 });
  });

  test('should search from places page and filter results', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // Wait for initial places to load
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    // Search for specific place
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Pavilion KL');

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Results should be filtered — at least one result containing "Pavilion"
    await expect(page.getByText('Pavilion KL').first()).toBeVisible({ timeout: 10000 });
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThan(50);
  });

  test('should show no results for invalid search on places page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('xyznonexistent123');

    await page.waitForTimeout(500);

    await expect(page.getByText(/no places found/i)).toBeVisible({ timeout: 10000 });
  });

  test('should clear search and show all results again', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    const initialCount = await page.locator('article').count();

    // Search to filter
    await searchInput.fill('National Mosque');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('article').count();
    expect(filteredCount).toBeLessThan(initialCount);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Should show more places again
    const restoredCount = await page.locator('article').count();
    expect(restoredCount).toBeGreaterThan(filteredCount);
  });

  test('home page should show nearby places count by default', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Default view should show places nearby (using default KL coordinates)
    await expect(page.getByText(/\d+ places? nearby/)).toBeVisible({ timeout: 10000 });
  });

  test('home page should switch to results count when searching', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Initially shows "nearby"
    await expect(page.getByText(/nearby/)).toBeVisible({ timeout: 10000 });

    // Search switches to "found"
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Park');
    await page.waitForTimeout(500);

    await expect(page.getByText(/found/)).toBeVisible({ timeout: 10000 });
  });
});
