import { test, expect, request } from '@playwright/test';
import { API_BASE } from './helpers';

/**
 * Malaysia coverage tests — verifies real place data exists for key cities
 * across different states. These tests call the backend API directly.
 */

test.describe('Malaysia State Coverage', () => {
  test('Kuala Lumpur has nearby places', async ({ request }) => {
    const response = await request.post(`${API_BASE}/places/nearby`, {
      data: { latitude: 3.1478, longitude: 101.6953, radius: 5000 },
    });
    expect(response.ok()).toBeTruthy();
    const places = await response.json();
    expect(places.length).toBeGreaterThan(10);
  });

  test('Kuala Terengganu has nearby places', async ({ request }) => {
    const response = await request.post(`${API_BASE}/places/nearby`, {
      data: { latitude: 5.31062, longitude: 103.14308, radius: 5000 },
    });
    expect(response.ok()).toBeTruthy();
    const places = await response.json();
    expect(places.length).toBeGreaterThan(0);
  });

  test('George Town Penang has nearby places', async ({ request }) => {
    const response = await request.post(`${API_BASE}/places/nearby`, {
      data: { latitude: 5.4164, longitude: 100.3327, radius: 5000 },
    });
    expect(response.ok()).toBeTruthy();
    const places = await response.json();
    expect(places.length).toBeGreaterThan(0);
  });

  test('nearby API uses correct field names (latitude/longitude not lat/lng)', async ({ request }) => {
    const correct = await request.post(`${API_BASE}/places/nearby`, {
      data: { latitude: 3.1478, longitude: 101.6953, radius: 2000 },
    });
    expect(correct.ok()).toBeTruthy();
    const correctPlaces = await correct.json();
    expect(correctPlaces.length).toBeGreaterThan(0);

    const wrong = await request.post(`${API_BASE}/places/nearby`, {
      data: { lat: 3.1478, lng: 101.6953, radius: 2000 },
    });
    if (wrong.ok()) {
      const wrongPlaces = await wrong.json();
      expect(wrongPlaces.length).toBe(0);
    }
  });
});
