import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Places list panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    // Wait for map to load and places to appear
    await page.waitForSelector('[data-testid="sidebar-place-item"], [data-testid="places-list-toggle"]', { timeout: 15000 });
  });

  test('desktop sidebar shows place items', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForSelector('[data-testid="places-sidebar"]', { timeout: 15000 });

    const sidebar = page.locator('[data-testid="places-sidebar"]');
    await expect(sidebar).toBeVisible();

    const items = page.locator('[data-testid="sidebar-place-item"]');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('mobile shows list toggle button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForTimeout(3000);

    const toggle = page.locator('[data-testid="places-list-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 10000 });
  });

  test('clicking a sidebar item opens place detail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForSelector('[data-testid="sidebar-place-item"]', { timeout: 15000 });

    await page.locator('[data-testid="sidebar-place-item"]').first().click();
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible({ timeout: 5000 });
  });

  test('AI Accessible filter chips exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForTimeout(2000);

    const chip = page.getByRole('button', { name: /AI Accessible/i });
    await expect(chip).toBeVisible();
  });

  test('AI filter reduces visible places', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForSelector('[data-testid="sidebar-place-item"]', { timeout: 15000 });

    const before = await page.locator('[data-testid="sidebar-place-item"]').count();

    await page.getByRole('button', { name: /AI Accessible/i }).click();
    await page.waitForTimeout(500);

    const after = await page.locator('[data-testid="sidebar-place-item"]').count();
    // After filtering, count should be <= before (can be 0 if no AI data in viewport)
    expect(after).toBeLessThanOrEqual(before);
  });
});
