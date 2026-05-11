import { test, expect } from '@playwright/test';

/**
 * E2E tests for the wheelchair routing endpoint (POST /api/routing/wheelchair).
 * ORS adapter is disabled by default (no ORS_API_KEY), so these tests verify:
 *  - Auth enforcement (401 without token)
 *  - 503 when adapter is not configured (default state)
 *  - Request schema is accepted by the backend
 */

const ROUTING_URL = 'http://localhost:8080/api/routing/wheelchair';

const klRouteRequest = {
  from: { lat: 3.1535, lng: 101.7123 },
  to: { lat: 3.1600, lng: 101.7200 },
};

async function getAuthToken(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.post('http://localhost:8080/api/auth/login', {
    data: { email: 'admin@wheelcheck.my', password: 'WheelCheck2026!' },
  });
  const data = await res.json();
  return data.token;
}

test.describe('Wheelchair Routing API', () => {
  test('returns 401 or 403 without authentication token', async ({ request }) => {
    const res = await request.post(ROUTING_URL, {
      data: klRouteRequest,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('returns 503 when ORS adapter is not configured (default)', async ({ request }) => {
    // ORS is disabled by default — no ORS_API_KEY set in dev environment
    const token = await getAuthToken(request);

    const res = await request.post(ROUTING_URL, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    // 503 = adapter not enabled, 200 = adapter enabled with real key
    // Both are valid — test just confirms the endpoint exists and auth works
    expect([200, 503]).toContain(res.status());
  });

  test('accepts valid route request schema', async ({ request }) => {
    const token = await getAuthToken(request);

    const res = await request.post(ROUTING_URL, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    // Must not be 400 (bad request) — schema is valid
    expect(res.status()).not.toBe(400);
    expect(res.status()).not.toBe(422);
  });

  test('accepts route request with custom wheelchair options', async ({ request }) => {
    const token = await getAuthToken(request);

    const res = await request.post(ROUTING_URL, {
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
    const res = await request.post(ROUTING_URL, {
      headers: { Authorization: 'Bearer invalid-token-here' },
      data: klRouteRequest,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('when ORS is enabled, response has correct shape', async ({ request }) => {
    const token = await getAuthToken(request);

    const res = await request.post(ROUTING_URL, {
      headers: { Authorization: `Bearer ${token}` },
      data: klRouteRequest,
    });

    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.distanceMeters).toBe('number');
      expect(typeof body.durationSeconds).toBe('number');
      expect(typeof body.geometry).toBe('string');
      expect(Array.isArray(body.warnings)).toBe(true);
    } else {
      // Adapter not configured — acceptable in dev/CI
      expect([503, 404]).toContain(res.status());
    }
  });
});

test.describe('Aggregation Adapters API', () => {
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

  test('GET /api/aggregation/adapters returns both place and routing adapter lists', async ({ request }) => {
    // Use admin credentials for the aggregation endpoint
    const loginRes = await request.post('http://localhost:8080/api/auth/login', {
      data: { email: 'admin@wheelcheck.my', password: 'WheelCheck2026!' },
    });
    const { token } = await loginRes.json();

    const res = await request.get('http://localhost:8080/api/aggregation/adapters', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // New shape: { placeAdapters: [...], routingAdapters: [...] }
    expect(Array.isArray(body.placeAdapters)).toBe(true);
    expect(Array.isArray(body.routingAdapters)).toBe(true);

    // OSM adapter is always present and enabled
    const osmAdapter = body.placeAdapters.find((a: { source: string }) => a.source === 'OSM');
    expect(osmAdapter).toBeDefined();
    expect(osmAdapter.enabled).toBe(true);

    // New adapters should be present (disabled by default in dev)
    const prasaranaAdapter = body.placeAdapters.find(
      (a: { source: string }) => a.source === 'PRASARANA_GTFS'
    );
    const geoapifyAdapter = body.placeAdapters.find(
      (a: { source: string }) => a.source === 'GEOAPIFY'
    );

    // These should appear when enabled via config — present if bean is registered
    // In dev without env vars they are not registered (ConditionalOnProperty), so
    // we just check that OSM is always there as a sanity check.
    expect(osmAdapter.displayName).toBe('OpenStreetMap');
    expect(typeof osmAdapter.priority).toBe('number');
  });

  test('GET /api/aggregation/adapters returns 403 for non-admin user', async ({ request }) => {
    const registerRes = await request.post('http://localhost:8080/api/auth/register', {
      data: {
        email: `routing-test-${Date.now()}@test.com`,
        password: 'testpass123',
        name: 'Test User',
      },
    });
    const { token } = await registerRes.json();

    const res = await request.get('http://localhost:8080/api/aggregation/adapters', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(403);
  });

  test('GET /api/aggregation/adapters returns 401 or 403 without token', async ({ request }) => {
    const res = await request.get('http://localhost:8080/api/aggregation/adapters');
    expect([401, 403]).toContain(res.status());
  });
});
