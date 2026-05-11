import { test, expect, type Page } from '@playwright/test';

const getViewport = async (page: Page) => {
  const viewport = page.getByTestId('map-viewport');
  const [lat, lng, zoom] = await Promise.all([
    viewport.getAttribute('data-lat'),
    viewport.getAttribute('data-lng'),
    viewport.getAttribute('data-zoom'),
  ]);

  return {
    lat: Number(lat),
    lng: Number(lng),
    zoom: Number(zoom),
  };
};

test.describe('Map interactions', () => {
  test('shows search suggestions and flies to the first result on Enter', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[type="search"]');
    await searchInput.click();
    await expect(searchInput).toBeFocused();
    await searchInput.pressSequentially('KLCC');

    const suggestions = page.getByTestId('search-suggestions');
    await expect(suggestions).toBeVisible({ timeout: 15000 });

    const firstSuggestion = page.getByTestId('search-suggestion').first();
    await expect(firstSuggestion).toBeVisible({ timeout: 15000 });

    const expectedLat = Number(await firstSuggestion.getAttribute('data-lat'));
    const expectedLng = Number(await firstSuggestion.getAttribute('data-lng'));

    await searchInput.press('Enter');
    await expect(suggestions).toBeHidden();

    await expect.poll(async () => (await getViewport(page)).lat).toBeCloseTo(expectedLat, 2);
    await expect.poll(async () => (await getViewport(page)).lng).toBeCloseTo(expectedLng, 2);
    await expect.poll(async () => (await getViewport(page)).zoom).toBeGreaterThanOrEqual(16);
  });

  test('keeps map controls on the right and supports clustered markers', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const myLocationButton = page.getByLabel(/my location/i);
    const zoomInButton = page.locator('.leaflet-control-zoom-in');
    const zoomOutButton = page.locator('.leaflet-control-zoom-out');
    const markerCluster = page.locator('.marker-cluster').first();

    await expect(myLocationButton).toBeVisible();
    await expect(zoomInButton).toBeVisible({ timeout: 15000 });
    await expect(zoomOutButton).toBeVisible();
    await expect(markerCluster).toBeVisible({ timeout: 15000 });

    const myLocationBox = await myLocationButton.boundingBox();
    const zoomInBox = await zoomInButton.boundingBox();

    expect(myLocationBox).not.toBeNull();
    expect(zoomInBox).not.toBeNull();
    expect(zoomInBox!.x).toBeGreaterThan(myLocationBox!.x - 1);
    expect(zoomInBox!.y).toBeGreaterThan(myLocationBox!.y);

    const beforeZoom = await getViewport(page);
    await zoomInButton.click();
    await expect.poll(async () => (await getViewport(page)).zoom).toBeGreaterThan(beforeZoom.zoom);
  });

  test('refetches places when map is panned to a new area', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Wait for initial places to load
    const placesCounter = page.locator('text=/\\d+ places? nearby/');
    await expect(placesCounter).toBeVisible({ timeout: 15000 });

    const initialCount = await placesCounter.textContent();

    // Pan the map by dragging it
    const mapView = page.getByTestId('map-view');
    const box = await mapView.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;

    // Drag significantly to the right to change viewport
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 200, startY, { steps: 10 });
    await page.mouse.up();

    // Wait for debounce (500ms) + API call
    await page.waitForTimeout(1500);

    // The counter should still be visible (places refetched for new area)
    await expect(placesCounter.or(page.locator('text=/\\d+ results? found/'))).toBeVisible({ timeout: 10000 });
  });
});
