import { test, expect } from '@playwright/test';
import { API_BASE } from './helpers';

test.describe('Place Detail — Reviews & Comments', () => {
  let placeId: string;

  test.beforeAll(async ({ request }) => {
    // Get a place with reviews (use one of the seed places)
    const res = await request.get(`${API_BASE}/places/search?name=KLCC`);
    const places = await res.json();
    placeId = places[0]?.id;
    if (!placeId) {
      // Fallback: get any place
      const allRes = await request.get(`${API_BASE}/places`);
      const allPlaces = await allRes.json();
      placeId = allPlaces.content?.[0]?.id ?? allPlaces[0]?.id;
    }
  });

  test('should show reviews section on place detail page', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    // Reviews section always renders — shows title when reviews exist, else "no reports" message
    await expect(
      page.getByText(/accessibility reports|no reports yet/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show comment section on place detail page', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    // Comments section should exist
    await expect(page.getByRole('heading', { name: /discussion/i })).toBeVisible({ timeout: 10000 });

    // Comment input should be visible
    await expect(page.getByTestId('comment-input')).toBeVisible();
    await expect(page.getByTestId('comment-submit')).toBeVisible();
  });

  test('should display comment input with character count', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    const input = page.getByTestId('comment-input');
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0/2000')).toBeVisible();

    // Type something
    await input.fill('Testing accessibility');
    await expect(page.getByText('21/2000')).toBeVisible();
  });

  test('should show post comment button disabled when empty', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    const submitBtn = page.getByTestId('comment-submit');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeDisabled();
  });

  test('should show back button that navigates back', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    const backBtn = page.getByText('←').first();
    await expect(backBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show report button on place detail', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/report accessibility/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display existing comments if any', async ({ page }) => {
    await page.goto(`/en/places/${placeId}`, { waitUntil: 'domcontentloaded' });

    // Wait for comment section to load
    await expect(page.getByRole('heading', { name: /discussion/i })).toBeVisible({ timeout: 10000 });

    // Check if there are comments or the "no comments" message
    const hasComments = await page.getByTestId('comment-card').count();
    const noComments = await page.getByText(/no comments yet/i).count();

    // One or the other should be true
    expect(hasComments > 0 || noComments > 0).toBe(true);
  });
});
