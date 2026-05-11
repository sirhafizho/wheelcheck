import { test, expect } from '@playwright/test';

test.describe('Map Popup Navigation', () => {
  test('should show place details in map popup', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Wait for map and markers to load
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Wait for markers to appear
    const marker = page.locator('.leaflet-marker-icon').first();
    await expect(marker).toBeVisible({ timeout: 10000 });

    // Click a marker to open popup
    await marker.click();

    // Popup should show place info
    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Should have place name
    await expect(popup.locator('h3')).toBeVisible();

    // Should have accessibility badge
    await expect(popup.locator('[aria-label]').first()).toBeVisible();

    // Should have address
    await expect(popup.locator('p').first()).toBeVisible();
  });

  test('should show review count in popup', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const marker = page.locator('.leaflet-marker-icon').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Should show review count
    await expect(popup.getByText(/\d+ reviews?/)).toBeVisible();
  });

  test('should have View Details link in popup', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const marker = page.locator('.leaflet-marker-icon').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Should have "View Details" link
    const detailsLink = popup.getByText(/view details/i);
    await expect(detailsLink).toBeVisible();
    await expect(detailsLink).toHaveAttribute('href', /\/en\/places\//);
  });

  test('should navigate to place detail when clicking View Details', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const marker = page.locator('.leaflet-marker-icon').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Click "View Details" link
    await popup.getByText(/view details/i).click();

    // Should navigate to place detail page
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/, { timeout: 10000 });

    // Place detail page should show place info
    await expect(page.getByText(/report accessibility/i)).toBeVisible({ timeout: 5000 });
  });
});
