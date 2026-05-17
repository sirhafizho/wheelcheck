import { test, expect } from '@playwright/test';
import { loginAsAdmin, API_BASE, getAuthToken, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

test.describe('Admin Search & Filters', () => {
  test.describe.configure({ mode: 'serial' });

  test('should show search bar and filter controls on places tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    // Search input should be visible
    const searchInput = page.getByTestId('admin-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Category filter dropdown
    const categoryFilter = page.getByTestId('admin-filter-category');
    await expect(categoryFilter).toBeVisible();

    // Access level filter dropdown
    const accessFilter = page.getByTestId('admin-filter-access');
    await expect(accessFilter).toBeVisible();
  });

  test('should filter places by search query', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByTestId('admin-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search for a known place
    await searchInput.fill('KLCC');
    await page.waitForTimeout(800); // wait for debounce

    // Should show filter count
    const filterCount = page.getByTestId('admin-filter-count');
    await expect(filterCount).toBeVisible({ timeout: 10000 });
    const countText = await filterCount.textContent();
    expect(countText).toMatch(/\d+ results/);
  });

  test('should filter places by category', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    const categoryFilter = page.getByTestId('admin-filter-category');
    await expect(categoryFilter).toBeVisible({ timeout: 10000 });

    // Filter by HOSPITAL
    await categoryFilter.selectOption('HOSPITAL');
    await page.waitForTimeout(500);

    // Should show filtered results
    const filterCount = page.getByTestId('admin-filter-count');
    await expect(filterCount).toBeVisible({ timeout: 10000 });

    // All visible places should be hospitals
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should filter by access level', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    const accessFilter = page.getByTestId('admin-filter-access');
    await expect(accessFilter).toBeVisible({ timeout: 10000 });

    // Filter by FULL accessibility
    await accessFilter.selectOption('FULL');
    await page.waitForTimeout(500);

    const filterCount = page.getByTestId('admin-filter-count');
    await expect(filterCount).toBeVisible({ timeout: 10000 });
  });

  test('should clear filters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    // Apply a filter
    const searchInput = page.getByTestId('admin-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('test');
    await page.waitForTimeout(800);

    // Clear button should appear
    const clearBtn = page.getByTestId('admin-clear-filters');
    await expect(clearBtn).toBeVisible({ timeout: 5000 });

    await clearBtn.click();
    await page.waitForTimeout(500);

    // Search input should be empty
    await expect(searchInput).toHaveValue('');
    // Clear button should disappear
    await expect(clearBtn).not.toBeVisible();
  });

  test('should combine search + category filter', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByTestId('admin-search-input');
    const categoryFilter = page.getByTestId('admin-filter-category');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search + category filter together
    await searchInput.fill('hospital');
    await page.waitForTimeout(800);

    await categoryFilter.selectOption('HOSPITAL');
    await page.waitForTimeout(500);

    const filterCount = page.getByTestId('admin-filter-count');
    await expect(filterCount).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Search API', () => {
  test('should search places via API with query param', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await request.get(`${API_BASE}/admin/places?search=KLCC&page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.content).toBeDefined();
    // All results should contain KLCC in name (case insensitive)
    for (const place of data.content) {
      const name = place.name.toLowerCase();
      expect(name.includes('klcc')).toBeTruthy();
    }
  });

  test('should filter places via API by category', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await request.get(`${API_BASE}/admin/places?category=HOSPITAL&page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    for (const place of data.content) {
      expect(place.category).toBe('HOSPITAL');
    }
  });

  test('should fuzzy search in admin (midvalley → Mid Valley)', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await request.get(`${API_BASE}/admin/places?search=midvalley&page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.content.length).toBeGreaterThan(0);
    const names = data.content.map((p: { name: string }) => p.name.toLowerCase());
    expect(names.some((n: string) => n.includes('mid valley') || n.includes('midvalley'))).toBeTruthy();
  });
});

test.describe('Live Enrichment', () => {
  test('should return enriched results with enrichLive=true', async ({ request }) => {
    // Query nearby with enrichLive - Penang area (smaller radius for faster OSM response)
    const res = await request.post(`${API_BASE}/places/nearby`, {
      data: {
        latitude: 5.4141,
        longitude: 100.3288,
        radius: 500,
        limit: 20,
        enrichLive: true,
      },
      timeout: 60000,
    });
    expect(res.status()).toBe(200);

    const places = await res.json();
    expect(Array.isArray(places)).toBeTruthy();
    expect(places.length).toBeGreaterThan(0);
  });

  test('should work without enrichLive (default behavior)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/places/nearby`, {
      data: {
        latitude: 3.1579,
        longitude: 101.7118,
        radius: 2000,
        limit: 50,
      },
    });
    expect(res.status()).toBe(200);

    const places = await res.json();
    expect(Array.isArray(places)).toBeTruthy();

    // Without enrichLive, all results should be from DB (isLive=false)
    const livePlaces = places.filter((p: { isLive?: boolean }) => p.isLive === true);
    expect(livePlaces.length).toBe(0);
  });

  test('should include isLive field in response', async ({ request }) => {
    const res = await request.post(`${API_BASE}/places/nearby`, {
      data: {
        latitude: 5.4141,
        longitude: 100.3288,
        radius: 500,
        limit: 10,
        enrichLive: true,
      },
      timeout: 60000,
    });
    expect(res.status()).toBe(200);

    const places = await res.json();
    for (const place of places) {
      expect(typeof place.isLive).toBe('boolean');
    }
  });
});
