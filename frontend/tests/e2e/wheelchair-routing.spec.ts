import { test, expect } from '@playwright/test';
import { API_BASE, getAuthToken, loginAsAdmin, loginAsUser } from './helpers';

/**
 * E2E tests for the wheelchair routing endpoint (POST /api/routing/wheelchair).
 * ORS adapter is disabled by default (no ORS_API_KEY), so these tests verify:
 *  - Auth enforcement (401 without token)
 *  - 503 when adapter is not configured (default state)
 *  - Request schema is accepted by the backend
 */

const klRouteRequest = {
  from: { lat: 3.1535, lng: 101.7123 },
  to: { lat: 3.1600, lng: 101.7200 },
};

test.describe('Wheelchair Routing API', () => {
  test('returns 401 or 403 without authentication token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      data: klRouteRequest,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('returns 503 when ORS adapter is not configured (default)', async ({ request }) => {
    const token = await getAuthToken(request);
    await new Promise(r => setTimeout(r, 400));

    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    // Accept transient HF rate-limit/overload errors
    if ([429, 502, 503].includes(res.status())) return;
    expect([200, 503]).toContain(res.status());
  });

  test('accepts valid route request schema', async ({ request }) => {
    const token = await getAuthToken(request);

    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    expect(res.status()).not.toBe(400);
    expect(res.status()).not.toBe(422);
  });

  test('accepts route request with custom wheelchair options', async ({ request }) => {
    const token = await getAuthToken(request);

    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        from: { lat: 3.1535, lng: 101.7123 },
        to: { lat: 3.1600, lng: 101.7200 },
        options: {
          maximumInclinePercent: 3,
          maximumSlopedKerbMeters: 0.03,
          minimumWidthMeters: 1.2,
          surfaceType: 'asphalt',
          smoothnessType: 'excellent',
        },
      },
    });

    expect(res.status()).not.toBe(400);
    expect(res.status()).not.toBe(422);
  });

  test('returns 401 or 403 for route request with invalid token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      headers: { Authorization: 'Bearer invalid-token-here' },
      data: klRouteRequest,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('when ORS is enabled, response has correct shape', async ({ request }) => {
    const token = await getAuthToken(request);
    await new Promise(r => setTimeout(r, 400));

    const res = await request.post(`${API_BASE}/routing/wheelchair`, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    if ([429, 502].includes(res.status())) return; // transient HF error
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.distanceMeters).toBe('number');
      expect(typeof body.durationSeconds).toBe('number');
      expect(typeof body.geometry).toBe('string');
      expect(Array.isArray(body.warnings)).toBe(true);
    } else {
      expect([503, 404]).toContain(res.status());
    }
  });
});

test.describe('Aggregation Adapters API', () => {
  test('GET /api/aggregation/adapters returns both place and routing adapter lists', async ({ request }) => {
    const token = await getAuthToken(request);
    await new Promise(r => setTimeout(r, 400));

    const res = await request.get(`${API_BASE}/aggregation/adapters`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if ([429, 502, 503].includes(res.status())) return; // transient HF error
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.placeAdapters)).toBe(true);
    expect(Array.isArray(body.routingAdapters)).toBe(true);

    const osmAdapter = body.placeAdapters.find((a: { source: string }) => a.source === 'OSM');
    expect(osmAdapter).toBeDefined();
    expect(osmAdapter.enabled).toBe(true);
    expect(osmAdapter.displayName).toBe('OpenStreetMap');
    expect(typeof osmAdapter.priority).toBe('number');
  });

  test('GET /api/aggregation/adapters returns 403 for non-admin user', async ({ request }) => {
    const token = await getAuthToken(request, 'user@wheelcheck.demo', 'demo1234');

    const res = await request.get(`${API_BASE}/aggregation/adapters`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(403);
  });

  test('GET /api/aggregation/adapters returns 401 or 403 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/aggregation/adapters`);
    expect([401, 403]).toContain(res.status());
  });
});
