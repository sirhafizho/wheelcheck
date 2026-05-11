import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page with map and search', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    await expect(page).toHaveTitle(/WheelCheck/);
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    // Search input should be visible and focusable
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });

  test('should display map container', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Wait for the map to mount (Leaflet is dynamically imported)
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Map tiles should load
    await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show places count after loading', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Wait for places to load from API (shows "X places nearby")
    await expect(page.getByText(/\d+ places? nearby/)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to places list', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    await page.getByRole('link', { name: /places/i }).click();
    await expect(page).toHaveURL(/\/en\/places/);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    // Bottom nav with proper aria-label
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toBeVisible();
    
    // Language toggle with proper aria-label
    const langButton = page.getByLabel(/switch language/i);
    await expect(langButton).toBeAttached();
    
    // All nav links should be present
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /places/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('should toggle language to Bahasa Malaysia', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    const langToggle = page.getByLabel(/switch language/i);
    await expect(langToggle).toBeVisible();
    await page.waitForTimeout(500);
    
    await langToggle.click();
    await page.waitForURL(/\/ms/, { timeout: 15000 });
    
    // Verify BM content
    await expect(page.getByText('Cari Tempat Boleh Diakses')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle language back to English', async ({ page }) => {
    await page.goto('/ms', { waitUntil: 'domcontentloaded' });
    
    const langToggle = page.getByLabel(/tukar bahasa/i);
    await expect(langToggle).toBeVisible();
    await page.waitForTimeout(500);
    
    await langToggle.click();
    await page.waitForURL(/\/en/, { timeout: 15000 });
    
    await expect(page.getByText('Find Accessible Places')).toBeVisible({ timeout: 5000 });
  });

  test('should have My Location button', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    const myLocationBtn = page.getByText(/my location/i);
    await expect(myLocationBtn).toBeVisible();
  });
});
