import { test, expect } from '@playwright/test';

// Helper: login as admin and store token in localStorage
async function loginAsAdmin(page: import('@playwright/test').Page) {
  const response = await page.request.post('http://localhost:8080/api/auth/login', {
    data: { email: 'admin@wheelcheck.my', password: 'WheelCheck2026!' },
  });
  const data = await response.json();
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.evaluate((token: string) => {
    localStorage.setItem('wheelcheck_token', token);
  }, data.token);
}

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

    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Places tab should be active/default
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Should show place names from seed data
    await expect(page.getByText('KLCC Park')).toBeVisible();
    await expect(page.getByText('Pavilion KL')).toBeVisible();
  });

  test('should switch to reviews tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Click reviews tab
    await page.getByRole('tab', { name: /reviews/i }).click();

    // Should show review data with access level emojis
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    // Reviews use emoji indicators
    await expect(page.getByText('✅').first()).toBeVisible({ timeout: 5000 });
  });

  test('should switch to users tab and show user list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Click users tab
    await page.getByRole('tab', { name: /users/i }).click();

    // Should show admin user
    await expect(page.getByText('admin@wheelcheck.my')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('ADMIN').first()).toBeVisible();
  });

  test('should delete a review from reviews tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/en/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: /reviews/i }).click();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

    // Count reviews before delete
    const rowsBefore = await page.locator('table tbody tr').count();

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click first delete button
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    await deleteBtn.click();

    // Wait for table to refresh — row count should decrease
    await page.waitForTimeout(1000);
    const rowsAfter = await page.locator('table tbody tr').count();
    expect(rowsAfter).toBeLessThan(rowsBefore);
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

  test('settings should NOT show admin link for non-admin users', async ({ page }) => {
    // Register a regular user
    const response = await page.request.post('http://localhost:8080/api/auth/register', {
      data: {
        email: `regular+${Date.now()}@test.com`,
        password: 'testpass123',
        name: 'Regular User',
      },
    });
    const data = await response.json();

    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.evaluate((token: string) => {
      localStorage.setItem('wheelcheck_token', token);
    }, data.token);

    await page.goto('/en/settings', { waitUntil: 'domcontentloaded' });

    // Admin link should NOT be visible
    await expect(page.getByRole('link', { name: /admin dashboard/i })).not.toBeVisible();
  });

  test('should display in Bahasa Malaysia', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ms/admin', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /papan pemuka admin/i })).toBeVisible({ timeout: 10000 });
  });
});
