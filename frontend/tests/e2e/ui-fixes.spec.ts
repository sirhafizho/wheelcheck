/**
 * UI Fixes E2E Tests — covers all issues from Part 5 of FREE_AI_TOOLS_RESEARCH.md
 */
import { test, expect } from '@playwright/test';

// ─── Filter Chips ─────────────────────────────────────────────────────────────

test.describe('Filter Chips', () => {
  test('should show translated filter chip labels in English', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Filter chips should show BM-translated labels
    const chips = page.locator('button[aria-pressed]');
    await expect(chips.first()).toBeVisible({ timeout: 10000 });

    // Check all 4 filters exist with translated English text
    await expect(page.getByRole('button', { name: /Wheelchair Accessible/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Accessible Toilet/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Accessible Parking/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Wide Entrance/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show translated filter chip labels in BM', async ({ page }) => {
    await page.goto('/ms', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Filter chips should show BM-translated labels
    const chips = page.locator('button[aria-pressed]');
    await expect(chips.first()).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Kerusi Roda/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Tandas/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Parkir OKU/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Pintu Masuk/i })).toBeVisible({ timeout: 10000 });
  });

  test('filter chips container should be scrollable', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    // The container wrapping filters should have overflow-x-auto
    const container = page.locator('.overflow-x-auto').first();
    await expect(container).toBeVisible({ timeout: 10000 });
  });

  test('active filter chip should have different visual state', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const firstChip = page.getByRole('button', { name: /Wheelchair Accessible/i });
    await expect(firstChip).toBeVisible({ timeout: 10000 });

    // Before click: aria-pressed = false
    await expect(firstChip).toHaveAttribute('aria-pressed', 'false');
    await firstChip.click();

    // After click: aria-pressed = true + emerald background
    await expect(firstChip).toHaveAttribute('aria-pressed', 'true');
    await expect(firstChip).toHaveClass(/bg-emerald-600/);
  });
});

// ─── Places List FAB ───────────────────────────────────────────────────────────

test.describe('Places List FAB', () => {
  test('should show Add a Place FAB on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // FAB should be visible on mobile
    const fab = page.locator('[data-testid="add-place-fab"]');
    await expect(fab).toBeVisible({ timeout: 10000 });
    await expect(fab).toHaveAttribute('href', /add-place/);
  });

  test('should hide FAB on desktop and show inline button instead', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // FAB should be hidden on desktop (sm:hidden = hidden when >= sm breakpoint)
    const fab = page.locator('[data-testid="add-place-fab"]');
    await expect(fab).toBeHidden({ timeout: 10000 });

    // Desktop inline button should exist
    await expect(page.getByRole('link', { name: /Add Place|Add a Place/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('FAB should navigate to add-place page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="add-place-fab"]').click();
    await expect(page).toHaveURL(/add-place/, { timeout: 10000 });
  });
});

// ─── Get Directions Button ─────────────────────────────────────────────────────

test.describe('Get Directions Button', () => {
  test('should show Get Directions button on place detail page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Get Directions button should be present
    const btn = page.locator('[data-testid="get-directions-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toHaveAttribute('href', /maps\.google\.com/);
    await expect(btn).toHaveAttribute('target', '_blank');
    await expect(btn).toHaveAttribute('rel', /noopener/);
  });

  test('Get Directions link should contain lat/lng coordinates', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    const btn = page.locator('[data-testid="get-directions-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });

    const href = await btn.getAttribute('href');
    // Should contain a lat/lng pattern like ?q=5.4,103.2
    expect(href).toMatch(/q=[\d.-]+,[\d.-]+/);
  });

  test('Get Directions button text should be in English', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    const btn = page.locator('[data-testid="get-directions-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toContainText('Get Directions');
  });

  test('Get Directions button text should be in BM on /ms locale', async ({ page }) => {
    await page.goto('/ms/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    const btn = page.locator('[data-testid="get-directions-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toContainText('Dapatkan Arah');
  });
});

// ─── Favorite Toast Feedback ───────────────────────────────────────────────────

test.describe('Favourite Toast', () => {
  test.beforeEach(async ({ page }) => {
    // Log in via profile page
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
    // Click Login button to reveal form
    await page.getByRole('button', { name: /^Log in$|^Login$/i }).first().click();
    await page.fill('#login-email', 'user@wheelcheck.demo');
    await page.fill('#login-password', 'demo1234');
    await page.getByRole('button', { name: /^Log in$|^Login$/i }).last().click();
    await page.waitForFunction(() => !!localStorage.getItem('wheelcheck_token'), { timeout: 15000 });
  });

  test('should show toast when saving a place', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Wait for the page to load
    await expect(page.locator('[data-testid="favorite-toggle"]')).toBeVisible({ timeout: 10000 });

    // Click favorite toggle
    await page.locator('[data-testid="favorite-toggle"]').click();

    // Toast should appear
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/favour|saved|removed/i);

    // Toast should auto-dismiss
    await expect(toast).toBeHidden({ timeout: 5000 });
  });
});

// ─── Comment Section — Log in to Comment ─────────────────────────────────────

test.describe('Comment Login Gate', () => {
  test('should show "Log in to comment" link when not authenticated', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Scroll to comment section
    const commentSection = page.locator('[data-testid="comment-section"]');
    await expect(commentSection).toBeVisible({ timeout: 10000 });

    // Log in link should appear instead of a Post button
    const loginLink = page.locator('[data-testid="comment-login-link"]');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await expect(loginLink).toHaveAttribute('href', /profile/);

    // Should NOT show a Post button when not logged in
    const submitBtn = page.locator('[data-testid="comment-submit"]');
    await expect(submitBtn).toBeHidden({ timeout: 5000 });
  });

  test('comment textarea should be disabled when not logged in', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    const textarea = page.locator('[data-testid="comment-input"]');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await expect(textarea).toBeDisabled({ timeout: 5000 });
  });

  test('should show Post button when authenticated', async ({ page }) => {
    // Set token in localStorage to simulate logged in
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('wheelcheck_token', 'fake-jwt-token-for-testing');
    });
    await page.reload();
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    const submitBtn = page.locator('[data-testid="comment-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });

    // Login link should be hidden
    const loginLink = page.locator('[data-testid="comment-login-link"]');
    await expect(loginLink).toBeHidden({ timeout: 5000 });
  });
});

// ─── Report Wizard Cancel Button ───────────────────────────────────────────────

test.describe('Report Wizard Cancel Button', () => {
  test('should show cancel button on wizard', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Click the "Report Accessibility" button
    await page.getByRole('button', { name: /Report Accessibility/i }).click();
    await expect(page).toHaveURL(/\/en\/report\//, { timeout: 10000 });

    // Cancel button should be visible
    const cancelBtn = page.locator('[data-testid="wizard-cancel"]');
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
  });

  test('cancel button should navigate back to place page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();

    const placeUrl = page.url();
    await page.getByRole('button', { name: /Report Accessibility/i }).click();
    await expect(page).toHaveURL(/\/en\/report\//, { timeout: 10000 });

    await page.locator('[data-testid="wizard-cancel"]').click();
    // Should navigate back
    await expect(page).not.toHaveURL(/\/en\/report\//, { timeout: 10000 });
  });

  test('wizard step counter should show (optional) for steps 5 and 6', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();
    await page.getByRole('button', { name: /Report Accessibility/i }).click();
    await expect(page).toHaveURL(/\/en\/report\//, { timeout: 10000 });

    // Step 1 — NOT optional
    await expect(page.locator('text=/Step 1 of 6/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/optional/')).toBeHidden({ timeout: 5000 });

    // Answer step 1 and proceed through to step 5
    // QuestionStep uses <label> elements, not buttons
    await page.locator('label').filter({ hasText: /Fully accessible/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    // Step 2
    await page.locator('label').filter({ hasText: /Yes, fully accessible/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    // Step 3
    await page.locator('label').filter({ hasText: /designated/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    // Step 4
    await page.locator('label').filter({ hasText: /Easy to navigate/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();

    // Step 5 — should show (optional) in the progress label
    await expect(page.locator('span.text-sm.font-medium').filter({ hasText: /optional/ })).toBeVisible({ timeout: 10000 });
  });

  test('Submit Now button should appear on step 4 after answering', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
    await page.locator('article').first().click();
    await page.getByRole('button', { name: /Report Accessibility/i }).click();
    await expect(page).toHaveURL(/\/en\/report\//, { timeout: 10000 });

    // Complete required 4 steps using labels (QuestionStep renders labels)
    await page.locator('label').filter({ hasText: /Fully accessible/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('label').filter({ hasText: /Yes, fully accessible/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('label').filter({ hasText: /designated/i }).first().click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('label').filter({ hasText: /Easy to navigate/i }).first().click();

    // "Submit Now" should appear after answering internalNav step
    const submitNow = page.locator('[data-testid="submit-now-btn"]');
    await expect(submitNow).toBeVisible({ timeout: 10000 });
  });
});
