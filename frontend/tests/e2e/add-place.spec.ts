import { test, expect } from '@playwright/test';

test.describe('Add Place Page', () => {
  test('should display add place form with all required fields', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /add a place/i })).toBeVisible();

    // Required fields
    await expect(page.getByLabel(/place name/i)).toBeVisible();
    await expect(page.getByLabel(/address/i)).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/latitude/i)).toBeVisible();
    await expect(page.getByLabel(/longitude/i)).toBeVisible();

    // Photo section
    await expect(page.getByText(/evidence photos/i)).toBeVisible();
    await expect(page.getByText(/at least 1 photo required/i)).toBeVisible();
  });

  test('should have optional Bahasa Malaysia name field', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    const nameMsInput = page.getByLabel(/name.*bahasa/i);
    await expect(nameMsInput).toBeVisible();
  });

  test('should have category dropdown with Malaysian venue types', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    const categorySelect = page.getByLabel(/category/i);
    await expect(categorySelect).toBeVisible();

    // Check for key Malaysian venue categories
    await expect(categorySelect.locator('option', { hasText: 'Shopping Mall' })).toBeAttached();
    await expect(categorySelect.locator('option', { hasText: 'Restaurant' })).toBeAttached();
    await expect(categorySelect.locator('option', { hasText: 'Hospital' })).toBeAttached();
    await expect(categorySelect.locator('option', { hasText: 'Mosque' })).toBeAttached();
    await expect(categorySelect.locator('option', { hasText: 'Transport Hub' })).toBeAttached();
    await expect(categorySelect.locator('option', { hasText: 'Cafe' })).toBeAttached();
  });

  test('submit button should be disabled when form is incomplete', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    const submitBtn = page.getByRole('button', { name: /add place/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test('should show photo upload button', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    const addPhotoBtn = page.getByRole('button', { name: /add photo/i });
    await expect(addPhotoBtn).toBeVisible();
    await expect(addPhotoBtn).toContainText('0/5');
  });

  test('should show photo required error initially', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/please upload at least one photo/i)).toBeVisible();
  });

  test('all form inputs should meet minimum touch target size', async ({ page }) => {
    await page.goto('/en/add-place', { waitUntil: 'domcontentloaded' });

    // Check that inputs have min-h-[48px] class (48dp touch target)
    const inputs = page.locator('input.min-h-\\[48px\\], select.min-h-\\[48px\\]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should navigate to add place via FAB from home page', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    // FAB button with plus icon
    const fab = page.getByLabel(/add a place/i);
    await expect(fab).toBeVisible();

    await fab.click();
    await expect(page).toHaveURL(/\/en\/add-place/);
    await expect(page.getByRole('heading', { name: /add a place/i })).toBeVisible();
  });

  test('should navigate to add place from places list page', async ({ page }) => {
    await page.goto('/en/places', { waitUntil: 'domcontentloaded' });

    const addLink = page.getByRole('link', { name: /add a place/i });
    await expect(addLink).toBeVisible();

    await addLink.click();
    await expect(page).toHaveURL(/\/en\/add-place/);
  });

  test('should display in Bahasa Malaysia', async ({ page }) => {
    await page.goto('/ms/add-place', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /tambah tempat/i })).toBeVisible();
  });
});
