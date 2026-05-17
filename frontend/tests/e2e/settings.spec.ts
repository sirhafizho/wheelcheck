import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('should display settings page with all sections', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();

    // Language section
    await expect(page.getByText(/language/i).first()).toBeVisible();
    await expect(page.getByText(/current language/i)).toBeVisible();

    // Accessibility section
    await expect(page.getByText(/dark mode/i)).toBeVisible();
    await expect(page.getByText(/high contrast mode/i)).toBeVisible();
    await expect(page.getByText(/large text/i)).toBeVisible();

    // About section
    await expect(page.getByText(/about wheelcheck/i)).toBeVisible();
  });

  test('should show current language as English', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/current language.*english/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /switch to.*bahasa/i })).toBeVisible();
  });

  test('should switch language to Bahasa Malaysia', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /switch to.*bahasa/i }).click();
    await page.waitForURL(/\/ms\/settings/, { timeout: 10000 });

    // Should now show BM content
    await expect(page.getByRole('heading', { name: /tetapan/i })).toBeVisible();
  });

  test('should have high contrast toggle', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /high contrast/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeAttached();

    // Default should be off
    await expect(toggle).not.toBeChecked();

    // Click to enable
    await toggle.check({ force: true });
    await expect(toggle).toBeChecked();

    // Verify class applied to document
    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('high-contrast')
    );
    expect(hasClass).toBe(true);
  });

  test('should have large text toggle', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('label', { hasText: /large text/i }).locator('input[type="checkbox"]');
    await expect(toggle).toBeAttached();

    await expect(toggle).not.toBeChecked();

    await toggle.check({ force: true });
    await expect(toggle).toBeChecked();

    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('large-text')
    );
    expect(hasClass).toBe(true);
  });

  test('should persist high contrast setting across navigations', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Enable high contrast
    const toggle = page.locator('label', { hasText: /high contrast/i }).locator('input[type="checkbox"]');
    await toggle.check({ force: true });
    await expect(toggle).toBeChecked();

    // Navigate away and back
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Should still be checked (persisted in localStorage)
    const toggleAfter = page.locator('label', { hasText: /high contrast/i }).locator('input[type="checkbox"]');
    await expect(toggleAfter).toBeChecked();

    // Clean up
    await toggleAfter.uncheck({ force: true });
  });

  test('should display version and license info', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('1.0.0')).toBeVisible();
    await expect(page.getByText('Apache 2.0')).toBeVisible();
  });

  test('should have GitHub link', async ({ page }) => {
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    const githubLink = page.getByRole('link', { name: /view on github/i });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/sirhafizho/wheelcheck');
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

  test('should display in Bahasa Malaysia', async ({ page }) => {
    await page.goto('/ms/settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /tetapan/i })).toBeVisible();
  });
});
