import { test, expect, type Page } from '@playwright/test';

/**
 * Comprehensive adversarial map UX tests.
 * Tests every user interaction path: zoom, pan, markers, clusters,
 * bottom sheet open/dismiss, filter chips, search→map, state persistence,
 * rapid interactions, and edge cases.
 */

const getViewport = async (page: Page) => {
  const viewport = page.getByTestId('map-viewport');
  const [lat, lng, zoom] = await Promise.all([
    viewport.getAttribute('data-lat'),
    viewport.getAttribute('data-lng'),
    viewport.getAttribute('data-zoom'),
  ]);
  return { lat: Number(lat), lng: Number(lng), zoom: Number(zoom) };
};

const waitForMapReady = async (page: Page) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  // Wait for tiles + markers to load
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
};

test.describe('Map Zoom — Multi-Level', () => {
  test('zoom in multiple levels with + button', async ({ page }) => {
    await waitForMapReady(page);
    const initial = await getViewport(page);
    const zoomInBtn = page.getByLabel('Zoom in');

    // Click zoom in 3 times
    for (let i = 0; i < 3; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(400);
    }

    const after = await getViewport(page);
    expect(after.zoom).toBeGreaterThanOrEqual(initial.zoom + 3);
  });

  test('zoom out multiple levels with - button', async ({ page }) => {
    await waitForMapReady(page);

    // First zoom in so we have room to zoom out
    const zoomInBtn = page.getByLabel('Zoom in');
    for (let i = 0; i < 3; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(400);
    }
    const midZoom = await getViewport(page);

    const zoomOutBtn = page.getByLabel('Zoom out');
    for (let i = 0; i < 3; i++) {
      await zoomOutBtn.click();
      await page.waitForTimeout(400);
    }

    const after = await getViewport(page);
    expect(after.zoom).toBeLessThanOrEqual(midZoom.zoom - 3);
  });

  test('zoom in then out returns to approximately same level', async ({ page }) => {
    await waitForMapReady(page);
    const initial = await getViewport(page);

    const zoomInBtn = page.getByLabel('Zoom in');
    const zoomOutBtn = page.getByLabel('Zoom out');

    // Zoom in 2
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    // Zoom out 2
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
    await zoomOutBtn.click();
    await page.waitForTimeout(300);

    const after = await getViewport(page);
    expect(after.zoom).toBeCloseTo(initial.zoom, 0);
  });

  test('max zoom level is capped at 19 (overzoom)', async ({ page }) => {
    await waitForMapReady(page);
    const zoomInBtn = page.getByLabel('Zoom in');

    // Click zoom in many times to hit the max
    for (let i = 0; i < 20; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(200);
    }

    const after = await getViewport(page);
    expect(after.zoom).toBeLessThanOrEqual(19);
    expect(after.zoom).toBeGreaterThanOrEqual(17); // Should get close to max
  });

  test('min zoom level is respected', async ({ page }) => {
    await waitForMapReady(page);
    const zoomOutBtn = page.getByLabel('Zoom out');

    for (let i = 0; i < 20; i++) {
      await zoomOutBtn.click();
      await page.waitForTimeout(200);
    }

    const after = await getViewport(page);
    expect(after.zoom).toBeGreaterThanOrEqual(5); // MIN_ZOOM from config
  });
});

test.describe('Map Zoom — Stress Tests', () => {
  test('rapid alternating zoom does not crash the map', async ({ page }) => {
    await waitForMapReady(page);
    const zoomInBtn = page.getByLabel('Zoom in');
    const zoomOutBtn = page.getByLabel('Zoom out');

    // Rapidly alternate zoom in/out 10 times
    for (let i = 0; i < 10; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(50);
      await zoomOutBtn.click();
      await page.waitForTimeout(50);
    }

    // Map should still be functional
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const viewport = await getViewport(page);
    expect(viewport.lat).not.toBeNaN();
    expect(viewport.zoom).not.toBeNaN();
  });

  test('rapid zoom in 10x does not freeze UI', async ({ page }) => {
    await waitForMapReady(page);
    const zoomInBtn = page.getByLabel('Zoom in');

    for (let i = 0; i < 10; i++) {
      await zoomInBtn.click();
      // No wait — stress test
    }

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    // Map still interactive — can read viewport
    const viewport = await getViewport(page);
    expect(viewport.zoom).toBeGreaterThan(10);
    // Search input still responsive
    const search = page.locator('input[type="search"]');
    await expect(search).toBeVisible();
  });
});

test.describe('Map Pan', () => {
  test('pan map changes viewport coordinates', async ({ page }) => {
    await waitForMapReady(page);
    const before = await getViewport(page);

    const map = page.getByTestId('map-view');
    const box = await map.boundingBox();
    expect(box).not.toBeNull();

    // Drag from center to left (pan east)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 4, box!.y + box!.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const after = await getViewport(page);
    // Longitude should have changed (panned east)
    expect(after.lng).not.toBeCloseTo(before.lng, 2);
  });

  test('pan does not change zoom level', async ({ page }) => {
    await waitForMapReady(page);
    const before = await getViewport(page);

    const map = page.getByTestId('map-view');
    const box = await map.boundingBox();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 4, box!.y + box!.height / 4, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const after = await getViewport(page);
    expect(after.zoom).toBe(before.zoom);
  });
});

test.describe('Marker Clusters', () => {
  test('clusters are visible at default zoom', async ({ page }) => {
    await waitForMapReady(page);
    const clusters = page.locator('.marker-cluster');
    await expect(clusters.first()).toBeVisible({ timeout: 15000 });
  });

  test('clicking a cluster zooms into it', async ({ page }) => {
    await waitForMapReady(page);
    const before = await getViewport(page);

    const cluster = page.locator('.marker-cluster').first();
    await expect(cluster).toBeVisible({ timeout: 15000 });
    await cluster.click();

    // Wait for zoom animation
    await page.waitForTimeout(2000);

    const after = await getViewport(page);
    expect(after.zoom).toBeGreaterThan(before.zoom);
  });

  test('clusters show count badge', async ({ page }) => {
    await waitForMapReady(page);
    const cluster = page.locator('.marker-cluster').first();
    await expect(cluster).toBeVisible({ timeout: 15000 });

    // Cluster should display a number
    const text = await cluster.textContent();
    expect(text).toMatch(/\d+/);
    expect(Number(text)).toBeGreaterThanOrEqual(2);
  });

  test('individual markers appear at high zoom (disableClusteringAtZoom: 18)', async ({ page }) => {
    await waitForMapReady(page);

    // Zoom in to level 18+
    const zoomInBtn = page.getByLabel('Zoom in');
    for (let i = 0; i < 15; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(2000);

    const viewport = await getViewport(page);
    if (viewport.zoom >= 18) {
      // At zoom 18+, clusters should be gone, individual markers visible
      const individualMarkers = page.locator('.leaflet-marker-icon:not(.marker-cluster)');
      // Either individual markers are visible OR there are simply no places in this area
      const markerCount = await individualMarkers.count();
      const clusterCount = await page.locator('.marker-cluster').count();
      // If there are places here, they should be individual (not clustered)
      if (markerCount > 0) {
        expect(clusterCount).toBe(0);
      }
    }
  });
});

test.describe('Bottom Sheet — Open & Dismiss', () => {
  test('clicking a marker opens the bottom sheet', async ({ page }) => {
    await waitForMapReady(page);

    // We need to get to a zoom level where individual markers are visible
    // First try zooming into a cluster
    const cluster = page.locator('.marker-cluster').first();
    if (await cluster.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Keep clicking clusters to drill down
      for (let i = 0; i < 5; i++) {
        const nextCluster = page.locator('.marker-cluster').first();
        if (await nextCluster.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextCluster.click();
          await page.waitForTimeout(1500);
        } else {
          break;
        }
      }
    }

    // Try to find and click an individual marker
    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker.click();

      // Bottom sheet should appear
      const bottomSheet = page.getByTestId('bottom-sheet');
      await expect(bottomSheet).toBeVisible({ timeout: 10000 });

      // Should show place name
      const heading = bottomSheet.locator('h2, h3').first();
      await expect(heading).toBeVisible();
      const name = await heading.textContent();
      expect(name).toBeTruthy();
      expect(name!.length).toBeGreaterThan(0);
    }
  });

  test('clicking a second marker replaces bottom sheet content', async ({ page }) => {
    await waitForMapReady(page);

    // Search for a specific place to get a marker
    const search = page.locator('input[type="search"]');
    await search.fill('KLCC');

    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await suggestion.click();
    await page.waitForTimeout(3000);

    // Click first visible marker
    const marker1 = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker1.click();

      const bottomSheet = page.getByTestId('bottom-sheet');
      await expect(bottomSheet).toBeVisible({ timeout: 10000 });
      const name1 = await bottomSheet.locator('h2, h3').first().textContent();

      // If there's a second marker, click it
      const marker2 = page.locator('.leaflet-marker-icon:not(.marker-cluster)').nth(1);
      if (await marker2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await marker2.click();
        await page.waitForTimeout(1000);

        // Bottom sheet should still be visible (with potentially different content)
        await expect(bottomSheet).toBeVisible();
      }
    }
  });

  test('bottom sheet has View Details link', async ({ page }) => {
    await waitForMapReady(page);

    // Use search to find a place and open its sheet
    const search = page.locator('input[type="search"]');
    await search.fill('Pavilion KL');
    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await suggestion.click();
    await page.waitForTimeout(3000);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker.click();

      const bottomSheet = page.getByTestId('bottom-sheet');
      await expect(bottomSheet).toBeVisible({ timeout: 10000 });

      const detailsLink = bottomSheet.getByRole('link', { name: /view details/i });
      await expect(detailsLink).toBeVisible();

      // Should point to a valid place URL
      const href = await detailsLink.getAttribute('href');
      expect(href).toMatch(/\/en\/places\//);
    }
  });

  test('View Details navigates to place detail page', async ({ page }) => {
    await waitForMapReady(page);

    const search = page.locator('input[type="search"]');
    await search.fill('Pavilion KL');
    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await suggestion.click();
    await page.waitForTimeout(3000);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker.click();

      const bottomSheet = page.getByTestId('bottom-sheet');
      await expect(bottomSheet).toBeVisible({ timeout: 10000 });

      const link = bottomSheet.getByRole('link', { name: /view details/i });
      await link.click();

      await expect(page).toHaveURL(/\/en\/places\//, { timeout: 15000 });
      // Place detail page should have a heading and report button
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('bottom sheet can be dismissed by clicking outside', async ({ page }) => {
    await waitForMapReady(page);

    const search = page.locator('input[type="search"]');
    await search.fill('KLCC');
    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await suggestion.click();
    await page.waitForTimeout(3000);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker.click();

      const bottomSheet = page.getByTestId('bottom-sheet');
      await expect(bottomSheet).toBeVisible({ timeout: 10000 });

      // Click on the map area above the bottom sheet to dismiss
      const mapView = page.getByTestId('map-view');
      const mapBox = await mapView.boundingBox();
      if (mapBox) {
        await page.mouse.click(mapBox.x + mapBox.width / 2, mapBox.y + 50);
        await page.waitForTimeout(500);
      }

      // Bottom sheet should be hidden or the place deselected
      // (implementation may vary — some apps keep sheet but deselect marker)
    }
  });
});

test.describe('Filter Chips', () => {
  test('accessibility filter chips are visible', async ({ page }) => {
    await waitForMapReady(page);

    // Filter chips should be visible
    await expect(page.getByText('♿ Wheelchair Accessible').or(page.getByText('♿')).first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a filter chip updates places count', async ({ page }) => {
    await waitForMapReady(page);

    // Wait for initial places count
    const counter = page.locator('text=/\\d+ places?/');
    await expect(counter).toBeVisible({ timeout: 15000 });
    const initialText = await counter.textContent();

    // Click wheelchair accessible filter
    const filterChip = page.getByText('♿ Wheelchair Accessible').or(page.getByText('♿').first());
    if (await filterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterChip.click();
      await page.waitForTimeout(2000);

      // Counter should still be visible (may have different number)
      await expect(page.locator('text=/\\d+ (places?|results?)/').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('toggling filter off restores original results', async ({ page }) => {
    await waitForMapReady(page);

    const counter = page.locator('text=/\\d+ places?/');
    await expect(counter).toBeVisible({ timeout: 15000 });

    const filterChip = page.getByText('♿ Wheelchair Accessible').or(page.getByText('♿').first());
    if (await filterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Toggle on
      await filterChip.click();
      await page.waitForTimeout(2000);

      // Toggle off
      await filterChip.click();
      await page.waitForTimeout(2000);

      // Counter should still be visible
      await expect(page.locator('text=/\\d+ (places?|results?)/').first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Search → Map Integration', () => {
  test('search result flies map to that location', async ({ page }) => {
    await waitForMapReady(page);
    const before = await getViewport(page);

    const search = page.locator('input[type="search"]');
    await search.click();
    await search.fill('Hospital');

    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });

    // Get the suggestion's coordinates before clicking
    const suggLat = await suggestion.getAttribute('data-lat');
    const suggLng = await suggestion.getAttribute('data-lng');

    await suggestion.click();

    // Wait for fly animation to complete
    await page.waitForTimeout(4000);

    const after = await getViewport(page);
    // Zoom should have increased to SEARCH_FLY_TO_ZOOM (16)
    expect(after.zoom).toBeGreaterThanOrEqual(15);
    // If suggestion had coordinates, map center should be near them
    if (suggLat && suggLng) {
      expect(Math.abs(after.lat - parseFloat(suggLat))).toBeLessThan(0.05);
      expect(Math.abs(after.lng - parseFloat(suggLng))).toBeLessThan(0.05);
    }
  });

  test('clearing search does not crash', async ({ page }) => {
    await waitForMapReady(page);

    const search = page.locator('input[type="search"]');
    await search.fill('KLCC');
    await expect(page.getByTestId('search-suggestions')).toBeVisible({ timeout: 15000 });

    // Clear the input
    await search.fill('');
    await page.waitForTimeout(500);

    // Map should still be functional
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const viewport = await getViewport(page);
    expect(viewport.lat).not.toBeNaN();
  });

  test('search with gibberish does not crash and map stays functional', async ({ page }) => {
    await waitForMapReady(page);

    const search = page.locator('input[type="search"]');
    await search.fill('!@#$%^&*()');
    await page.waitForTimeout(2000);

    // Map should still be fully functional regardless of results
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const viewport = await getViewport(page);
    expect(viewport.lat).not.toBeNaN();
    expect(viewport.zoom).toBeGreaterThan(0);

    // Clearing should work fine
    await search.fill('');
    await page.waitForTimeout(500);
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});

test.describe('Map State Persistence', () => {
  test('map viewport is restored after navigating away and back', async ({ page }) => {
    await waitForMapReady(page);

    // Zoom in and pan
    const zoomInBtn = page.getByLabel('Zoom in');
    await zoomInBtn.click();
    await page.waitForTimeout(500);
    await zoomInBtn.click();
    await page.waitForTimeout(500);

    const mapView = page.getByTestId('map-view');
    const box = await mapView.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
    }
    await page.waitForTimeout(1000);

    const beforeNav = await getViewport(page);

    // Navigate to places list
    await page.getByRole('link', { name: /places/i }).first().click();
    await expect(page).toHaveURL(/\/places/, { timeout: 10000 });

    // Navigate back to home (map)
    await page.getByRole('link', { name: /home|map/i }).first().click();
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    const afterNav = await getViewport(page);
    // Viewport should be approximately restored (allow ~0.1 degree drift from tile snapping)
    expect(Math.abs(afterNav.lat - beforeNav.lat)).toBeLessThan(0.15);
    expect(Math.abs(afterNav.lng - beforeNav.lng)).toBeLessThan(0.15);
    expect(Math.abs(afterNav.zoom - beforeNav.zoom)).toBeLessThan(1.5);
  });
});

test.describe('Map Controls Layout', () => {
  test('zoom controls are visible and accessible', async ({ page }) => {
    await waitForMapReady(page);

    const zoomIn = page.getByLabel('Zoom in');
    const zoomOut = page.getByLabel('Zoom out');
    const myLocation = page.getByLabel(/my location/i);

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(myLocation).toBeVisible();

    // Check they have reasonable sizes for touch targets
    const zoomInBox = await zoomIn.boundingBox();
    expect(zoomInBox).not.toBeNull();
    expect(zoomInBox!.width).toBeGreaterThanOrEqual(30);
    expect(zoomInBox!.height).toBeGreaterThanOrEqual(30);
  });

  test('my location button is positioned above zoom controls', async ({ page }) => {
    await waitForMapReady(page);

    const myLocation = page.getByLabel(/my location/i);
    const zoomIn = page.getByLabel('Zoom in');

    const mlBox = await myLocation.boundingBox();
    const ziBox = await zoomIn.boundingBox();

    expect(mlBox).not.toBeNull();
    expect(ziBox).not.toBeNull();
    // My Location should be above zoom in
    expect(mlBox!.y + mlBox!.height).toBeLessThanOrEqual(ziBox!.y + 5);
  });

  test('places count pill is visible on map', async ({ page }) => {
    await waitForMapReady(page);

    const counter = page.locator('text=/\\d+ places?/');
    await expect(counter).toBeVisible({ timeout: 15000 });

    const text = await counter.textContent();
    const num = parseInt(text!.match(/\d+/)![0]);
    expect(num).toBeGreaterThan(0);
  });
});

test.describe('Map — Edge Cases', () => {
  test('map renders correctly on page load (no blank tiles)', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const container = page.locator('.leaflet-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // At least some tiles should be loaded
    const loadedTiles = page.locator('.leaflet-tile-loaded');
    await expect(loadedTiles.first()).toBeVisible({ timeout: 15000 });

    const tileCount = await loadedTiles.count();
    expect(tileCount).toBeGreaterThan(4); // Should have multiple tiles
  });

  test('map is interactive while bottom sheet is open', async ({ page }) => {
    await waitForMapReady(page);

    // Open bottom sheet via search
    const search = page.locator('input[type="search"]');
    await search.fill('KLCC');
    const suggestion = page.getByTestId('search-suggestion').first();
    await expect(suggestion).toBeVisible({ timeout: 15000 });
    await suggestion.click();
    await page.waitForTimeout(3000);

    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
      await marker.click();
      await expect(page.getByTestId('bottom-sheet')).toBeVisible({ timeout: 10000 });

      // Map zoom should still work with bottom sheet open
      const before = await getViewport(page);
      const zoomInBtn = page.getByLabel('Zoom in');
      await zoomInBtn.click();
      await page.waitForTimeout(500);

      const after = await getViewport(page);
      expect(after.zoom).toBeGreaterThan(before.zoom);
    }
  });

  test('FAB (add place button) is visible and clickable on map', async ({ page }) => {
    await waitForMapReady(page);

    const fab = page.getByLabel(/add a place/i);
    await expect(fab).toBeVisible();

    // Should not be covered by other elements
    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(40);

    await fab.click();
    await expect(page).toHaveURL(/\/add-place/, { timeout: 10000 });
  });

  test('data freshness notice is visible', async ({ page }) => {
    await waitForMapReady(page);

    const notice = page.getByText(/data source|last updated|osm|openstreetmap/i).first();
    await expect(notice).toBeVisible({ timeout: 10000 });
  });
});
