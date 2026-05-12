import { test, expect, type Page, type Locator } from '@playwright/test';

const mockPlace = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'KLCC Test Mall',
  latitude: 3.15785,
  longitude: 101.7123,
  address: '241 Jalan Ampang, Kuala Lumpur',
  category: 'SHOPPING_MALL',
  accessibilityLevel: 'FULL',
  reviewCount: 7,
  distance: 350,
  createdAt: '2024-01-01T10:00:00Z',
};

async function mockPlaceApis(page: Page) {
  await page.route('**/api/places/nearby', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockPlace]),
    });
  });

  await page.route('**/api/places/search?name=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockPlace]),
    });
  });

  await page.route(`**/api/places/${mockPlace.id}/reports`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`**/api/comments/place/${mockPlace.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`**/api/places/${mockPlace.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlace),
    });
  });
}

async function openBottomSheetForSuggestion(page: Page): Promise<Locator> {
  await mockPlaceApis(page);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });

  const searchInput = page.locator('input[type="search"]');
  await searchInput.click();
  await expect(searchInput).toBeFocused();
  await searchInput.pressSequentially('KLCC');

  const firstSuggestion = page.getByTestId('search-suggestion').first();
  await expect(firstSuggestion).toBeVisible({ timeout: 15000 });
  await firstSuggestion.click();

  await page.waitForTimeout(2500);

  const marker = page.getByRole('button', { name: 'Marker' }).first();
  await expect(marker).toBeVisible({ timeout: 15000 });
  await marker.click({ force: true });

  const bottomSheet = page.getByTestId('bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 10000 });

  return bottomSheet;
}

test.describe('Map Bottom Sheet Navigation', () => {
  test('should show place details in the bottom sheet', async ({ page }) => {
    const bottomSheet = await openBottomSheetForSuggestion(page);

    await expect(bottomSheet.getByRole('heading', { name: mockPlace.name })).toBeVisible();
    await expect(bottomSheet.getByText(mockPlace.address)).toBeVisible();
  });

  test('should show review count in the bottom sheet', async ({ page }) => {
    const bottomSheet = await openBottomSheetForSuggestion(page);

    await expect(bottomSheet.getByText('7 reviews')).toBeVisible();
    await expect(bottomSheet.getByText('350 m away • ~5 min roll')).toBeVisible();
  });

  test('should have a View Details link in the bottom sheet', async ({ page }) => {
    const bottomSheet = await openBottomSheetForSuggestion(page);

    const detailsLink = bottomSheet.getByRole('link', { name: /view details/i });
    await expect(detailsLink).toBeVisible();
    await expect(detailsLink).toHaveAttribute('href', `/en/places/${mockPlace.id}`);
  });

  test('should navigate to place detail when clicking View Details', async ({ page }) => {
    const bottomSheet = await openBottomSheetForSuggestion(page);

    await bottomSheet.getByRole('link', { name: /view details/i }).click();

    await expect(page).toHaveURL(`/en/places/${mockPlace.id}`, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: mockPlace.name })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /report/i })).toBeVisible({ timeout: 10000 });
  });
});
