import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser, API_BASE } from './helpers';

test.describe('Admin Dashboard', () => {
  test('should deny access without admin token', async ({ page }) => {
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show dashboard with stats when logged in as admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Stats cards
    await expect(page.getByText(/total places/i)).toBeVisible();
    await expect(page.getByText(/total reviews/i)).toBeVisible();
    await expect(page.getByText(/total users/i)).toBeVisible();
  });

  test('should show places tab by default with table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    // Places tab should be active/default with paginated table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Should show at least one place name in the table
    await expect(table.locator('tr').nth(1)).toBeVisible({ timeout: 5000 });
  });

  test('should switch to reviews tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Click reviews tab
    await page.getByRole('tab', { name: /reviews/i }).click();

    // Should show review data or empty state
    await expect(page.locator('table').or(page.getByText(/no reviews/i))).toBeVisible({ timeout: 10000 });
  });

  test('should switch to users tab and show user list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 15000 });

    // Click users tab
    await page.getByRole('tab', { name: /users/i }).click();

    // Wait for user table rows to load (lazy fetched)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Should show at least one user with a role badge
    await expect(page.getByText(/ADMIN|USER/).first()).toBeVisible({ timeout: 5000 });
  });

  test('settings should NOT show admin link for non-admin users', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Admin link should NOT be visible
    await expect(page.getByRole('link', { name: /admin dashboard/i })).not.toBeVisible();
  });

  test('should be accessible from settings page for admin users', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Admin link should be visible
    const adminLink = page.getByRole('link', { name: /admin dashboard/i });
    await expect(adminLink).toBeVisible({ timeout: 5000 });

    await adminLink.click();
    await expect(page).toHaveURL(/\/en\/admin/);
  });

  test('should display in Bahasa Malaysia', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ms/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /papan pemuka admin/i })).toBeVisible({ timeout: 10000 });
  });
});
