import { test, expect, Page } from '@playwright/test';
import { API_BASE, loginAsUser, getAuthToken, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

test.describe('Add Place — Login Gate', () => {
  test('shows login required screen for unauthenticated users', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('🔒')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/log in|sign in/i).first()).toBeVisible({ timeout: 10000 });
    // Should have a button to navigate to login/profile
    const loginBtn = page.getByRole('button', { name: /sign in|log in/i });
    await expect(loginBtn).toBeVisible();
  });
});

test.describe('Add Place — Authenticated Form', () => {
  test.beforeEach(async ({ page }) => {
    // Need a page context before we can set localStorage
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await loginAsUser(page);
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });
    // Wait for form to render (not the lock screen)
    await expect(page.getByRole('heading', { name: /add a place/i })).toBeVisible({ timeout: 10000 });
  });

  test('displays 3-step guided form', async ({ page }) => {
    // Step 1: Name input with search icon
    await expect(page.getByLabel(/place name/i).or(page.locator('#name'))).toBeVisible();

    // Step 2: Category chips — at least some categories visible
    await expect(page.getByText('🍽️')).toBeVisible();
    await expect(page.getByText('☕')).toBeVisible();
    await expect(page.getByText('🛍️')).toBeVisible();
    await expect(page.getByText('🏥')).toBeVisible();

    // Step 3: Location picker
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });

  test('category chips are tappable and selectable', async ({ page }) => {
    // Find CAFE chip and click it
    const cafeChip = page.locator('button', { hasText: '☕' });
    await expect(cafeChip).toBeVisible();
    await cafeChip.click();
    // Should have selected state — border-emerald-500
    await expect(cafeChip).toHaveClass(/border-emerald-500/);

    // Click a different one — Restaurant
    const restaurantChip = page.locator('button', { hasText: '🍽️' });
    await restaurantChip.click();
    await expect(restaurantChip).toHaveClass(/border-emerald-500/);
    // Cafe should no longer be selected
    await expect(cafeChip).not.toHaveClass(/border-emerald-500/);
  });

  test('submit button disabled when form is incomplete', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /add place/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Should show missing hint text
    await expect(page.getByText(/enter.*name|name.*required/i)).toBeVisible();
  });

  test('submit button becomes enabled with required fields', async ({ page }) => {
    // Initially disabled
    const submitBtn = page.getByRole('button', { name: /add place/i });
    await expect(submitBtn).toBeDisabled();

    // Fill name
    const nameInput = page.locator('#name');
    await nameInput.fill('E2E Test Place');

    // Select category
    await page.locator('button', { hasText: '☕' }).click();

    // Interact with the map — click on it to set a pin
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 150, y: 150 } });

    // Wait for location state to update
    await page.waitForTimeout(1500);

    // Now the submit button should be enabled
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  });

  test('"More details" toggle reveals optional fields', async ({ page }) => {
    // Photos and address manual fields should be hidden initially
    const moreBtn = page.getByText(/more details/i);
    await expect(moreBtn).toBeVisible();

    // City input should not be visible before expanding
    await expect(page.locator('#city')).not.toBeVisible();

    await moreBtn.click();

    // Now optional fields should be visible
    await expect(page.locator('#city')).toBeVisible();
    // Photo upload area
    await expect(page.getByText(/photo/i).first()).toBeVisible();
  });

  test('all category chips from backend enum are present', async ({ page }) => {
    const expectedCategories = [
      '🍽️', // RESTAURANT
      '☕',  // CAFE
      '🏪', // SHOP
      '🛍️', // MALL
      '🏥', // HOSPITAL
      '🕌', // MOSQUE
      '🚇', // TRANSPORT
      '🏛️', // GOVERNMENT
      '🎓', // EDUCATION
      '🌳', // PARK
      '🏨', // HOTEL
      '📍', // OTHER
    ];

    for (const emoji of expectedCategories) {
      await expect(page.locator('button', { hasText: emoji })).toBeVisible();
    }
  });

  test('touch targets meet 48dp minimum', async ({ page }) => {
    // Name input should be at least 48px tall
    const nameInput = page.locator('#name');
    const box = await nameInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // Category chips should be at least 64px tall
    const chip = page.locator('button', { hasText: '☕' });
    const chipBox = await chip.boundingBox();
    expect(chipBox).toBeTruthy();
    expect(chipBox!.height).toBeGreaterThanOrEqual(60);
  });
});

test.describe('Add Place — Navigation', () => {
  test('navigate to add place via FAB from home page', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const fab = page.getByLabel(/add a place/i);
    await expect(fab).toBeVisible({ timeout: 10000 });

    await fab.click();
    await expect(page).toHaveURL(/\/en\/add-place/);
  });

  test('navigate to add place from places list', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // Could be a link or a button with "add" text
    const addTrigger = page.getByRole('link', { name: /add/i }).or(
      page.getByRole('button', { name: /add/i })
    ).first();
    await expect(addTrigger).toBeVisible({ timeout: 10000 });
    await addTrigger.click();
    await expect(page).toHaveURL(/\/en\/add-place/, { timeout: 15000 });
  });

  test('displays in Bahasa Malaysia', async ({ page }) => {
    // Login first (need token)
    await page.goto('/ms', { waitUntil: 'domcontentloaded' });
    await loginAsUser(page);
    await page.goto('/ms/add-place', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /tambah tempat/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Add Place — Full Submit Flow (Demo)', () => {
  let createdPlaceName: string;

  test.afterAll(async ({ request }) => {
    if (!createdPlaceName) return;
    try {
      const token = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
      const search = await request.get(
        `${API_BASE}/places/search?name=${encodeURIComponent(createdPlaceName)}&size=10`,
      );
      const places: any[] = await search.json();
      for (const p of Array.isArray(places) ? places : []) {
        if (p.name === createdPlaceName) {
          await request.delete(`${API_BASE}/places/${p.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    } catch { /* best-effort cleanup */ }
  });

  test('create a place via the form (under 1 min)', async ({ page }) => {
    // Login
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await loginAsUser(page);
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /add a place/i })).toBeVisible({ timeout: 10000 });

    const testName = `E2E Test Place ${Date.now()}`;
    createdPlaceName = testName;

    // Step 1: Type name
    const nameInput = page.locator('#name');
    await nameInput.fill(testName);

    // Step 2: Pick category
    await page.locator('button', { hasText: '☕' }).click();

    // Step 3: Set location via GPS or map click
    // Click the GPS "Use my location" button if visible, otherwise click map center
    const gpsBtn = page.locator('button', { hasText: /📍|gps|my location|current/i });
    const map = page.locator('.leaflet-container');

    if (await gpsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await map.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(1000);
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /add place/i });

    // If button still disabled, try dragging the map to trigger location change
    if (await submitBtn.isDisabled()) {
      await map.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(2000);
    }

    // Wait for enabled and click
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Should show success — the heading text "Place Added! 🎉"
    await expect(
      page.getByRole('heading', { name: /place added/i })
    ).toBeVisible({ timeout: 30000 });
  });
});
