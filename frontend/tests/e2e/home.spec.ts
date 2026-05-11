import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Check page title
    await expect(page).toHaveTitle(/WheelCheck/);
    
    // Check header is visible
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    // Check search input is visible
    const searchInput = page.getByLabel(/search venues/i);
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to places list', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Wait for nav to render
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    // Click on the "Places" navigation item in bottom nav
    await page.getByRole('link', { name: /places/i }).click();
    
    // Verify we're on the places page
    await expect(page).toHaveURL(/\/en\/places/);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render
    await expect(page.getByText('WheelCheck').first()).toBeVisible();
    
    // Check bottom navigation has proper role
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toBeVisible();
    
    // Check language switch button exists
    const langButton = page.getByLabel(/switch language/i);
    await expect(langButton).toBeAttached();
  });

  test('should toggle language', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to fully hydrate (button must be interactive)
    const langToggle = page.getByLabel(/switch language/i);
    await expect(langToggle).toBeVisible();
    
    // Wait a moment for hydration
    await page.waitForTimeout(1000);
    
    // Click and wait for navigation
    await langToggle.click();
    await page.waitForURL(/\/ms/, { timeout: 15000 });
  });
});
