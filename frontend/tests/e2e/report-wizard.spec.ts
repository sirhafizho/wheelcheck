import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers';

test.describe('Report Wizard Flow', () => {
  test('should complete the full report wizard', async ({ page }) => {
    // Login first — report submission requires authentication
    await loginAsUser(page);

    // Navigate to a place detail page first
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    // Click first place to go to detail
    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    // Click "Report Accessibility" button
    const reportBtn = page.getByRole('button', { name: /report accessibility/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();
    await expect(page).toHaveURL(/\/en\/report\/[a-f0-9-]+/);

    // Step 1: Entrance - should show "How is the entrance?"
    await expect(page.getByText(/how is the entrance/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Step 1 of 6')).toBeVisible();

    // Select "Fully accessible"
    await page.getByText(/fully accessible.*ramped/i).click();
    
    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Toilet - should show toilet question
    await expect(page.getByRole('heading', { name: /accessible toilet/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 2 of 6')).toBeVisible();

    // Select "Yes, fully accessible"
    await page.getByText(/yes, fully accessible/i).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: Parking
    await expect(page.getByRole('heading', { name: /oku parking/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 3 of 6')).toBeVisible();

    // Select "Yes, designated OKU parking"
    await page.getByText(/yes, designated/i).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 4: Internal navigation
    await expect(page.getByText(/navigation inside/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 4 of 6')).toBeVisible();

    // Select "Easy to navigate"
    await page.getByText(/easy to navigate/i).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 5: Photos (optional)
    await expect(page.getByText(/add photos/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 5 of 6')).toBeVisible();

    // Skip photos, click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 6: Additional notes (optional)
    await expect(page.getByText(/additional notes/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 6 of 6')).toBeVisible();

    // Add a note
    const notesInput = page.locator('textarea');
    await notesInput.fill('Tested via Playwright E2E - fully accessible venue');

    // Submit the report
    await page.getByRole('button', { name: /submit report/i }).click();

    // Should show success message
    await expect(page.getByText(/thanks.*report.*community/i)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back through wizard steps', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    const reportBtn = page.getByRole('button', { name: /report accessibility/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();
    await expect(page).toHaveURL(/\/en\/report\/[a-f0-9-]+/);

    // Step 1: Select entrance option
    await expect(page.getByText(/how is the entrance/i)).toBeVisible({ timeout: 10000 });
    await page.getByText(/partially accessible/i).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Verify we're on toilet step
    await expect(page.getByRole('heading', { name: /accessible toilet/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 2 of 6')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: /back/i }).click();

    // Should be back on entrance step
    await expect(page.getByText(/how is the entrance/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Step 1 of 6')).toBeVisible();
  });

  test('should show progress bar advancing', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/en\/places\/[a-f0-9-]+/);

    const reportBtn = page.getByRole('button', { name: /report accessibility/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();

    // Step 1: Progress should be ~17%
    await expect(page.getByText('17%')).toBeVisible({ timeout: 10000 });

    // Select and advance
    await page.getByText(/fully accessible.*ramped/i).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Progress should be ~33%
    await expect(page.getByText('33%')).toBeVisible({ timeout: 5000 });
  });

  test('should show report wizard in Bahasa Malaysia', async ({ page }) => {
    await page.goto('/ms/places', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });

    await page.locator('article').first().click();
    await expect(page).toHaveURL(/\/ms\/places\/[a-f0-9-]+/);

    const reportBtn = page.getByRole('button', { name: /lapor kebolehcapaian/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();

    // Should show BM content
    await expect(page.getByText(/bagaimanakah pintu masuk/i)).toBeVisible({ timeout: 10000 });
  });
});
