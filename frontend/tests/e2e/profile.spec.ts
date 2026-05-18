import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('should show login prompt when not authenticated', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    await expect(page.getByText(/sign in to track your contributions/i)).toBeVisible();
  });

  test('should display login and register buttons', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    const loginBtn = page.getByRole('button', { name: /log in/i });
    const registerBtn = page.getByRole('button', { name: /create account/i });

    await expect(loginBtn).toBeVisible();
    await expect(registerBtn).toBeVisible();
  });

  test('should show login form when Log In is clicked', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should show register form when Create Account is clicked', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('cancel button should dismiss login form', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();

    // Back to initial state
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('cancel button should dismiss register form', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByLabel(/display name/i)).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('should register a new user and show profile', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /create account/i }).click();

    const uniqueEmail = `e2euser+${Date.now()}@example.com`;
    await page.getByLabel(/display name/i).fill('Test User');
    await page.getByLabel(/email/i).first().fill(uniqueEmail);
    await page.getByLabel(/password/i).first().fill('testpass123');

    await page.getByRole('button', { name: /create account/i }).click();

    // Should show profile after registration
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
  });

  test('should show review stats after login', async ({ page }) => {
    // Register first
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /create account/i }).click();

    const uniqueEmail = `e2euser+${Date.now()}@example.com`;
    await page.getByLabel(/display name/i).fill('Stats User');
    await page.getByLabel(/email/i).first().fill(uniqueEmail);
    await page.getByLabel(/password/i).first().fill('testpass123');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show review stats
    await expect(page.getByText(/reviews submitted/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/total contributions/i)).toBeVisible();
  });

  test('should logout and return to login prompt', async ({ page }) => {
    // Register first
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /create account/i }).click();

    const uniqueEmail = `e2euser+${Date.now()}@example.com`;
    await page.getByLabel(/display name/i).fill('Logout User');
    await page.getByLabel(/email/i).first().fill(uniqueEmail);
    await page.getByLabel(/password/i).first().fill('testpass123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible({ timeout: 10000 });

    // Now logout
    await page.getByRole('button', { name: /log out/i }).click();

    // Should show login prompt again
    await expect(page.getByText(/sign in to track your contributions/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('form inputs should meet minimum touch target size', async ({ page }) => {
    await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });

    const loginBtn = page.getByRole('button', { name: /log in/i });
    const registerBtn = page.getByRole('button', { name: /create account/i });

    // Buttons should have min-h-[48px] class
    await expect(loginBtn).toHaveClass(/min-h-\[48px\]/);
    await expect(registerBtn).toHaveClass(/min-h-\[48px\]/);
  });

  test('should display in Bahasa Malaysia', async ({ page }) => {
    await page.goto('/ms/profile', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /profil/i })).toBeVisible();
  });
});
