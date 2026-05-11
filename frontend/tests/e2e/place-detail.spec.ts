import { test, expect } from '@playwright/test';

test.describe('Place Detail Page', () => {
  // Navigate to a place detail via the places list
  test('should show place details', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // Click first place card
    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Should show place name as heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
    const name = await heading.textContent();
    expect(name?.length).toBeGreaterThan(0);

    // Should show address (all seeded venues have addresses)
    const detailCard = page.locator('.bg-white.rounded-lg.shadow-lg');
    await expect(detailCard).toBeVisible({ timeout: 10000 });
  });

  test('should show accessibility badge on detail page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // AccessBadge should be visible
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should show Report Accessibility button', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Should have the report button
    const reportBtn = page.getByRole('button', { name: /report accessibility/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to report page when clicking Report button', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Click report button
    const reportBtn = page.getByRole('button', { name: /report accessibility/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();

    // Should navigate to report page
    await expect(page).toHaveURL(/\/en\/report\/[a-f0-9-]+/);
  });

  test('should have Back button that works', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Click back button
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeVisible({ timeout: 10000 });
    await backBtn.click();

    // Should go back to places list
    await expect(page).toHaveURL(/\/en\/places$/);
  });

  test('should show report count', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Should show Reports section
    await expect(page.getByText('Reports')).toBeVisible({ timeout: 10000 });
  });
});
