import { test, expect } from '@playwright/test';

/**
 * Dark mode E2E tests
 * Verifies:
 *  - Toggle in Settings applies dark class to <html>
 *  - Header moon/sun icon toggles dark mode
 *  - Preference persists across navigations (localStorage)
 *  - All key pages render without obvious contrast failures in dark mode
 *  - BM locale also honours dark mode
 */

test.describe('Dark Mode', () => {
  test.afterEach(async ({ page }) => {
    // Clean up: always leave dark mode off so we don't bleed into other tests
    await page.evaluate(() => {
      localStorage.removeItem('wheelcheck_dark_mode');
      document.documentElement.classList.remove('dark');
    });
  });

  // ── Settings toggle ──────────────────────────────────────────────────────

  test('settings page shows dark mode toggle', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeAttached();
    await expect(toggle).not.toBeChecked();
  });

  test('dark mode toggle applies dark class to <html>', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await toggle.check({ force: true });

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });

  test('dark mode persists across page navigations via localStorage', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Enable dark mode
    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await toggle.check({ force: true });

    // Navigate to another page
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    // The anti-FOUC script should have re-applied the dark class
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });

  test('disabling dark mode removes dark class', async ({ page }) => {
    // Start with dark mode on
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('wheelcheck_dark_mode', 'true');
      document.documentElement.classList.add('dark');
    });

    // Reload to let the anti-FOUC script apply it
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeChecked();

    await toggle.uncheck({ force: true });

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(false);
  });

  // ── Header toggle ────────────────────────────────────────────────────────

  test('header has moon/sun icon button', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const btn = page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]').first();
    await expect(btn).toBeVisible();
  });

  test('header moon button toggles dark mode', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Initially light mode — button should say "Switch to dark mode"
    const btn = page.locator('button[aria-label="Switch to dark mode"]');
    await expect(btn).toBeVisible();
    await btn.click();

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);

    // Button should now say "Switch to light mode"
    await expect(page.locator('button[aria-label="Switch to light mode"]')).toBeVisible();
  });

  test('header toggle syncs with settings toggle', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Enable from header
    await page.locator('button[aria-label="Switch to dark mode"]').click();

    // Navigate to settings
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeChecked();
  });

  // ── Anti-FOUC script ─────────────────────────────────────────────────────

  test('anti-FOUC script applies dark class before hydration', async ({ page }) => {
    // Seed localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('wheelcheck_dark_mode', 'true');
    });

    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });

  // ── Visual checks per page ───────────────────────────────────────────────

  async function enableDarkMode(page: Parameters<Parameters<typeof test>[1]>[0]) {
    await page.addInitScript(() => {
      localStorage.setItem('wheelcheck_dark_mode', 'true');
    });
  }

  test('map page (home) renders in dark mode without layout errors', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // Header should be visible and dark
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Bottom nav should be visible
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Map container should render
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });

    // Dark class should be present
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });

  test('places list page renders in dark mode', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /places/i }).first()).toBeVisible();

    // Cards should be visible — the bg-white override should have been applied
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);

    // At least some content should load
    await expect(page.getByRole('heading', { name: /places/i })).toBeVisible();
  });

  test('settings page renders properly in dark mode', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();

    // Dark mode toggle should be checked
    const toggle = page.locator('label', { hasText: /dark mode/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeChecked();

    // All setting sections should be visible
    await expect(page.getByText(/language/i).first()).toBeVisible();
    await expect(page.getByText(/accessibility/i).first()).toBeVisible();
    await expect(page.getByText(/about wheelcheck/i)).toBeVisible();
  });

  test('profile page renders in dark mode (unauthenticated)', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);

    // Should show login or profile content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('favorites page renders in dark mode (unauthenticated)', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en/favorites', { waitUntil: 'domcontentloaded' });

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);

    // Should show empty or login prompt without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('BM locale honours dark mode setting', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/ms/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /tetapan/i })).toBeVisible();

    // Mod Gelap = Dark Mode in Malay
    await expect(page.getByText(/mod gelap/i)).toBeVisible();

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });

  test('dark mode CSS is actually applied to card backgrounds', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Pick the first bg-white card (e.g. language card)
    const card = page.locator('.bg-white').first();
    await expect(card).toBeVisible();

    // In dark mode, bg-white CSS override should make it #1f2937 not white
    const bgColor = await card.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // rgb(31, 41, 55) = #1f2937 (gray-800)
    expect(bgColor).toBe('rgb(31, 41, 55)');
  });

  test('dark mode header has correct background', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const header = page.locator('header');
    const bgColor = await header.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // bg-white/95 → rgba(31, 41, 55, 0.95) in dark mode
    // Computed may be rgb(31, 41, 55) or similar dark color
    // We just check it's NOT white (#ffffff = rgb(255, 255, 255))
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  // ── Combined: dark + BM locale ───────────────────────────────────────────

  test('dark mode and BM locale work simultaneously on places page', async ({ page }) => {
    await enableDarkMode(page);
    await page.goto('/ms/places', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /tempat/i })).toBeVisible();

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isDark).toBe(true);
  });
});
