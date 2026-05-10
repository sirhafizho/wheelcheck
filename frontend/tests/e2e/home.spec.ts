import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/en');
    
    // Check page title
    await expect(page).toHaveTitle(/WheelCheck/);
    
    // Check header is visible
    await expect(page.getByText('WheelCheck')).toBeVisible();
    
    // Check search input is visible
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Check map container exists (it should be loading or loaded)
    // The map might be in a loading state or fully loaded
    const mapOrLoading = page.locator('[class*="leaflet-container"], [role="status"]');
    await expect(mapOrLoading.first()).toBeVisible();
  });

  test('should navigate to places list', async ({ page }) => {
    await page.goto('/en');
    
    // Click on the "Places" navigation item
    await page.getByRole('link', { name: /places/i }).click();
    
    // Verify we're on the places page
    await expect(page).toHaveURL(/\/en\/places/);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/en');
    
    // Check skip to content link (should be present but hidden)
    const skipLink = page.getByText(/skip to main content/i);
    await expect(skipLink).toBeInTheDocument;
    
    // Check bottom navigation has proper role
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toBeVisible();
  });

  test('should toggle language', async ({ page }) => {
    await page.goto('/en');
    
    // Find and click language toggle
    const langToggle = page.getByRole('button', { name: /language/i });
    await langToggle.click();
    
    // Should redirect to Bahasa Malaysia
    await expect(page).toHaveURL(/\/ms/);
  });
});
