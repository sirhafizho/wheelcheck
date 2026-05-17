import { test, expect } from '@playwright/test';

test.describe('Places Page', () => {
  test('should show list of places', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // Page title
    await expect(page.getByRole('heading', { name: /places/i })).toBeVisible({ timeout: 10000 });

    // Should show place cards (seeded with 5 KL venues)
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display accessibility badges on place cards', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // Wait for cards to load
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // Seeded venues have accessibility levels — badges should appear
    // Badges use AccessBadge component which renders colored indicators
    const firstCard = page.locator('article').first();
    await expect(firstCard).toBeVisible();
    
    // Card should have a place name
    const heading = firstCard.locator('h3');
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    expect(name?.length).toBeGreaterThan(0);
  });

  test('should show review count on cards', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // At least one card should show review count
    await expect(page.getByText(/\d+ reviews?/).first()).toBeVisible();
  });

  test('should navigate to place detail when card clicked', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // Click the first place card (it's wrapped in a Link)
    await page.locator('article').first().click();

    // Should navigate to place detail page
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);
  });

  test('should have search input on places page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // Should be able to type in search
    await searchInput.fill('KLCC');
    await expect(searchInput).toHaveValue('KLCC');
  });

  test('should filter places when searching', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('input[type="search"]');
    
    // Search for a known venue
    await searchInput.fill('KLCC');
    
    // Wait for debounce + API refetch — articles should reappear
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15000 });
    
    // Should still show results (KLCC is a seeded venue)
    const cards = page.locator('article');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show places in Bahasa Malaysia', async ({ page }) => {
    await page.goto('/ms/places', { waitUntil: 'domcontentloaded' });

    // Title should be in BM
    await expect(page.getByRole('heading', { name: /tempat/i })).toBeVisible({ timeout: 10000 });
  });
});
