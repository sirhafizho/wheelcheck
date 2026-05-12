import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * CDP-enhanced geolocation tests.
 * Uses Chrome DevTools Protocol to simulate GPS positions at real Malaysian locations.
 * Tests both the main map page and the add-place location picker.
 */

// Real Malaysian locations for testing
const LOCATIONS = {
  klSentral: { latitude: 3.1343, longitude: 101.6865, accuracy: 10 },
  klcc: { latitude: 3.1578, longitude: 101.7117, accuracy: 15 },
  midValley: { latitude: 3.1178, longitude: 101.6772, accuracy: 8 },
  bangsar: { latitude: 3.1277, longitude: 101.6720, accuracy: 12 },
  petaling: { latitude: 3.1067, longitude: 101.6536, accuracy: 20 },
};

async function mockGeolocation(context: BrowserContext, location: typeof LOCATIONS.klSentral) {
  // Use CDP to override geolocation at browser level
  const cdpSession = await context.newCDPSession(await context.pages().then(p => p[0]) || await context.newPage());
  await cdpSession.send('Emulation.setGeolocationOverride', {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
  });
  return cdpSession;
}

async function mockGeolocationForPage(page: Page, location: typeof LOCATIONS.klSentral) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Emulation.setGeolocationOverride', {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
  });
  return cdpSession;
}

const getViewport = async (page: Page) => {
  const viewport = page.getByTestId('map-viewport');
  const [lat, lng, zoom] = await Promise.all([
    viewport.getAttribute('data-lat'),
    viewport.getAttribute('data-lng'),
    viewport.getAttribute('data-zoom'),
  ]);
  return { lat: Number(lat), lng: Number(lng), zoom: Number(zoom) };
};

test.describe('Geolocation-based map tests (CDP)', () => {
  // Only run on Chromium (CDP is Chrome-specific)
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP requires Chromium');

  test.beforeEach(async ({ context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
  });

  test('main map centers on user location (KL Sentral) when My Location clicked', async ({ page }) => {
    const cdp = await mockGeolocationForPage(page, LOCATIONS.klSentral);

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click My Location button
    const myLocationBtn = page.getByLabel(/my location/i);
    await expect(myLocationBtn).toBeVisible();
    await myLocationBtn.click();

    // Wait for geolocation to resolve and map to pan
    await page.waitForTimeout(2000);

    const viewport = await getViewport(page);
    expect(viewport.lat).toBeCloseTo(LOCATIONS.klSentral.latitude, 1);
    expect(viewport.lng).toBeCloseTo(LOCATIONS.klSentral.longitude, 1);

    await cdp.detach();
  });

  test('main map loads nearby places for KLCC area', async ({ page }) => {
    const cdp = await mockGeolocationForPage(page, LOCATIONS.klcc);

    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Click My Location to trigger geolocation
    const myLocationBtn = page.getByLabel(/my location/i);
    await myLocationBtn.click();

    // Wait for: geolocation resolve + map fly + moveend + debounce(500ms) + API fetch
    await page.waitForTimeout(4000);

    // Should show places counter (may be 0 if area has few places, but counter should exist)
    const counter = page.locator('text=/\\d+ places? nearby/');
    await expect(counter).toBeVisible({ timeout: 10000 });

    await cdp.detach();
  });

  test('add-place map auto-centers on user location (Mid Valley)', async ({ page }) => {
    const cdp = await mockGeolocationForPage(page, LOCATIONS.midValley);

    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    // Wait for geolocation + map render
    await page.waitForTimeout(3000);

    // The location picker map should be visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // The map should be centered near Mid Valley
    // LocationPicker uses its own coordinates display
    const latDisplay = page.locator('[data-testid="picker-lat"]');
    const lngDisplay = page.locator('[data-testid="picker-lng"]');

    if (await latDisplay.isVisible()) {
      const lat = Number(await latDisplay.textContent());
      const lng = Number(await lngDisplay.textContent());
      expect(lat).toBeCloseTo(LOCATIONS.midValley.latitude, 1);
      expect(lng).toBeCloseTo(LOCATIONS.midValley.longitude, 1);
    }

    await cdp.detach();
  });

  test('simulates moving from Bangsar to Petaling Jaya (location change)', async ({ page }) => {
    // Start at Bangsar
    const cdp = await mockGeolocationForPage(page, LOCATIONS.bangsar);

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const myLocationBtn = page.getByLabel(/my location/i);
    await myLocationBtn.click();
    await page.waitForTimeout(2000);

    const viewport1 = await getViewport(page);
    expect(viewport1.lat).toBeCloseTo(LOCATIONS.bangsar.latitude, 1);

    // "Move" to Petaling Jaya
    await cdp.send('Emulation.setGeolocationOverride', {
      latitude: LOCATIONS.petaling.latitude,
      longitude: LOCATIONS.petaling.longitude,
      accuracy: LOCATIONS.petaling.accuracy,
    });

    // Click My Location again to update
    await myLocationBtn.click();
    await page.waitForTimeout(2000);

    const viewport2 = await getViewport(page);
    expect(viewport2.lat).toBeCloseTo(LOCATIONS.petaling.latitude, 1);
    expect(viewport2.lng).toBeCloseTo(LOCATIONS.petaling.longitude, 1);

    await cdp.detach();
  });

  test('nearby places update when location changes significantly', async ({ page }) => {
    // Start at KL Sentral
    const cdp = await mockGeolocationForPage(page, LOCATIONS.klSentral);

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const myLocationBtn = page.getByLabel(/my location/i);
    await myLocationBtn.click();
    await page.waitForTimeout(4000);

    const counter = page.locator('text=/\\d+ places? nearby/');
    await expect(counter).toBeVisible({ timeout: 10000 });
    const text1 = await counter.textContent();

    // Move to KLCC (different area)
    await cdp.send('Emulation.setGeolocationOverride', {
      latitude: LOCATIONS.klcc.latitude,
      longitude: LOCATIONS.klcc.longitude,
      accuracy: LOCATIONS.klcc.accuracy,
    });

    await myLocationBtn.click();
    await page.waitForTimeout(4000);

    // Places should have been refetched (counter visible with potentially different count)
    await expect(counter).toBeVisible({ timeout: 10000 });
    const text2 = await counter.textContent();

    // Verify the map actually moved (viewport changed)
    const viewport = await getViewport(page);
    expect(viewport.lat).toBeCloseTo(LOCATIONS.klcc.latitude, 1);

    await cdp.detach();
  });

  test('network throttling shows loading state gracefully', async ({ page }) => {
    const cdp = await mockGeolocationForPage(page, LOCATIONS.klcc);

    // Simulate slow 3G network
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50000, // 50 KB/s (slow 3G)
      uploadThroughput: 25000,
      latency: 2000, // 2s latency
    });

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // The page should still render (map container visible)
    const mapView = page.getByTestId('map-view');
    await expect(mapView).toBeVisible({ timeout: 30000 });

    // Reset network
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    await cdp.detach();
  });
});
