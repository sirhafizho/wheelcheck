import { test, expect, type Page, type Locator } from '@playwright/test';

async function openPopupForSuggestion(page: Page): Promise<Locator> {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });

  const searchInput = page.locator('input[type="search"]');
  await searchInput.click();
  await expect(searchInput).toBeFocused();
  await searchInput.pressSequentially('KLCC');

  const firstSuggestion = page.getByTestId('search-suggestion').first();
  await expect(firstSuggestion).toBeVisible({ timeout: 15000 });
  await firstSuggestion.click();

  // Wait for fly animation (1.5s) and marker rendering
  await page.waitForTimeout(2500);

  // At zoom 16, individual markers or cluster markers may be visible
  const marker = page.getByRole('button', { name: 'Marker' }).first();
  const clusterMarker = page.locator('.marker-cluster').first();

  // Wait for either type to appear
  await expect(marker.or(clusterMarker)).toBeVisible({ timeout: 15000 });

  // Prefer individual marker (opens popup), else zoom into cluster first
  if (await marker.isVisible()) {
    await marker.click({ force: true });
  } else {
    // Click cluster to zoom in and reveal individual markers
    await clusterMarker.click({ force: true });
    await page.waitForTimeout(1000);
    const individualMarker = page.getByRole('button', { name: 'Marker' }).first();
    await expect(individualMarker).toBeVisible({ timeout: 10000 });
    await individualMarker.click({ force: true });
  }

  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toBeVisible({ timeout: 10000 });

  return popup;
}

test.describe('Map Popup Navigation', () => {
  test('should show place details in map popup', async ({ page }) => {
    const popup = await openPopupForSuggestion(page);

    await expect(popup.locator('h3')).toBeVisible();
    await expect(popup.locator('p').first()).toBeVisible();
  });

  test('should show review count in popup', async ({ page }) => {
    const popup = await openPopupForSuggestion(page);

    await expect(popup.getByText(/\d+ reviews?/)).toBeVisible();
  });

  test('should have View Details link in popup', async ({ page }) => {
    const popup = await openPopupForSuggestion(page);

    const detailsLink = popup.getByText(/view details/i);
    await expect(detailsLink).toBeVisible();
    await expect(detailsLink).toHaveAttribute('href', /\/en\/places\//);
  });

  test('should navigate to place detail when clicking View Details', async ({ page }) => {
    const popup = await openPopupForSuggestion(page);

    await popup.getByText(/view details/i).click();

    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(page.getByText(/report accessibility/i)).toBeVisible({ timeout: 10000 });
  });
});
