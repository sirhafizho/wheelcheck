import { test, expect, type Locator, type Page } from '@playwright/test';

const mockPlace = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'KLCC Accessible Station',
  latitude: 3.15785,
  longitude: 101.7123,
  address: 'Kuala Lumpur City Centre, Kuala Lumpur',
  city: 'Kuala Lumpur',
  state: 'Wilayah Persekutuan Kuala Lumpur',
  category: 'TRANSIT_STATION',
  accessibilityLevel: 'FULL',
  reviewCount: 12,
  createdAt: '2024-01-01T10:00:00Z',
  lastReportedAt: '2024-02-01T10:00:00Z',
  distance: 350,
  dataSource: 'OSM',
  description: 'Lift access available at the main entrance.',
  osmWheelchairTag: 'yes',
  osmToiletAccessible: true,
  osmTactilePaving: true,
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

  await page.route(`**/api/places/${mockPlace.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlace),
    });
  });
}

async function openBottomSheet(page: Page): Promise<Locator> {
  await mockPlaceApis(page);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

  const marker = page.getByRole('button', { name: 'Marker' }).first();
  await expect(marker).toBeVisible({ timeout: 15000 });
  await marker.click({ force: true });

  const bottomSheet = page.getByTestId('bottom-sheet');
  await expect(bottomSheet).toBeVisible({ timeout: 5000 });
  return bottomSheet;
}

test.describe('UI layout and UX', () => {
  test('map controls do not overlap with filter bar', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

    const firstFilter = page.locator('button[aria-pressed]').first();
    await expect(firstFilter).toBeVisible();
    const filterBox = await firstFilter.boundingBox();

    const myLocationBtn = page.getByLabel(/my location/i);
    await expect(myLocationBtn).toBeVisible();
    const myLocBox = await myLocationBtn.boundingBox();

    expect(filterBox).not.toBeNull();
    expect(myLocBox).not.toBeNull();
    expect(myLocBox!.y).toBeGreaterThan(filterBox!.y + filterBox!.height - 1);

    const zoomIn = page.getByLabel('Zoom in');
    await expect(zoomIn).toBeVisible();
    const zoomInBox = await zoomIn.boundingBox();

    expect(zoomInBox).not.toBeNull();
    expect(zoomInBox!.y).toBeGreaterThan(myLocBox!.y + myLocBox!.height - 1);
  });

  test('zoom buttons control map zoom level', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });

    const viewport = page.getByTestId('map-viewport');
    const getZoom = async () => Number(await viewport.getAttribute('data-zoom'));

    const initialZoom = await getZoom();

    await page.getByLabel('Zoom in').click();
    await expect.poll(getZoom).toBeGreaterThan(initialZoom);

    const afterZoomIn = await getZoom();
    await page.getByLabel('Zoom out').click();
    await expect.poll(getZoom).toBeLessThan(afterZoomIn);
  });

  test('map position is restored after navigating away and back', async ({ page }) => {
    await mockPlaceApis(page);
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\d+ places? nearby/)).toBeVisible({ timeout: 15000 });

    const mapView = page.getByTestId('map-view');
    const box = await mapView.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 150, startY - 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const viewport = page.getByTestId('map-viewport');
    const savedLat = Number(await viewport.getAttribute('data-lat'));
    const savedLng = Number(await viewport.getAttribute('data-lng'));

    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('map-view')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    const restoredLat = Number(await viewport.getAttribute('data-lat'));
    const restoredLng = Number(await viewport.getAttribute('data-lng'));

    expect(Math.abs(restoredLat - savedLat)).toBeLessThan(0.05);
    expect(Math.abs(restoredLng - savedLng)).toBeLessThan(0.05);
  });

  test('bottom sheet shows data source for places', async ({ page }) => {
    const bottomSheet = await openBottomSheet(page);

    await expect(bottomSheet.getByText(/OpenStreetMap|Community|Prasarana|data\.gov\.my|Wikidata|Geoapify/)).toBeVisible();
    await expect(bottomSheet.getByText('Accessibility Evidence:')).toBeVisible();
    await expect(bottomSheet.getByText('♿ Wheelchair: yes')).toBeVisible();
  });
});
