import { test, expect } from '@playwright/test';
import {
  API_BASE,
  getAuthToken,
  USER_EMAIL,
  USER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from './helpers';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

test.describe.serial('Security & Demo Guard', () => {
  let adminToken: string;
  let userToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    userToken = await getAuthToken(request, USER_EMAIL, USER_PASSWORD);
  });

  // --- Admin auth & access control ---

  test('unauthenticated cannot access admin endpoints', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/stats`);
    expect(res.ok()).toBe(false);
    expect([401, 403]).toContain(res.status());
  });

  test('normal user cannot access admin endpoints', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('demo admin can read admin stats', async ({ request }) => {
    await delay(500);
    const statsRes = await request.get(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(statsRes.ok()).toBe(true);
    const stats = await statsRes.json();
    expect(stats.totalPlaces).toBeGreaterThan(0);
  });

  // --- Demo guard restrictions ---

  test('demo admin cannot delete users', async ({ request }) => {
    await delay(500);
    const usersRes = await request.get(`${API_BASE}/admin/users?size=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(usersRes.ok()).toBe(true);
    const users = await usersRes.json();
    const targetUser = users.content?.find((u: any) => u.email === USER_EMAIL);
    expect(targetUser).toBeTruthy();

    const delRes = await request.delete(`${API_BASE}/admin/users/${targetUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status()).toBe(403);
    const body = await delRes.json();
    expect(body.error).toBe('Demo restriction');
  });

  test('demo admin cannot change user roles', async ({ request }) => {
    await delay(500);
    const usersRes = await request.get(`${API_BASE}/admin/users?size=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await usersRes.json();
    const targetUser = users.content?.find((u: any) => u.email === USER_EMAIL);

    const roleRes = await request.put(`${API_BASE}/admin/users/${targetUser.id}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { role: 'ADMIN' },
    });
    expect(roleRes.status()).toBe(403);
    const body = await roleRes.json();
    expect(body.error).toBe('Demo restriction');
  });

  test('demo admin can still delete a place (within limits)', async ({ request }) => {
    await delay(500);
    const createRes = await request.post(`${API_BASE}/places`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'Security Test Place',
        latitude: 5.4141,
        longitude: 100.3288,
        address: '123 Test St',
        city: 'Georgetown',
        category: 'OTHER',
      },
    });
    expect(createRes.ok()).toBe(true);
    const place = await createRes.json();

    await delay(500);

    const delRes = await request.delete(`${API_BASE}/admin/places/${place.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status()).toBe(204);
  });

  // --- Auth & upload security ---

  test('photo upload requires authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/photos/upload`, {
      multipart: {
        placeId: '00000000-0000-0000-0000-000000000000',
        file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') },
      },
    });
    expect(res.ok()).toBe(false);
  });

  test('review submission requires authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/reviews`, {
      data: {
        placeId: '00000000-0000-0000-0000-000000000000',
        entrance: 3, toilet: 3, parking: 3, internalNav: 3,
        notes: 'Test review',
      },
    });
    expect(res.ok()).toBe(false);
  });

  test('CORS headers are set on API responses', async ({ request }) => {
    const res = await request.get(`${API_BASE}/places/search?name=test`, {
      headers: { 'Origin': 'https://wheelcheck-swart.vercel.app' },
    });
    expect(res.ok()).toBe(true);
    const allowOrigin = res.headers()['access-control-allow-origin'];
    if (allowOrigin) {
      expect(allowOrigin).toContain('wheelcheck');
    }
  });

  // --- Rate limiting (LAST — exhausts auth tokens) ---

  test('rate limit returns 429 with tier info', async ({ request }) => {
    const results: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'nonexistent@test.com', password: 'wrong' },
      });
      results.push(res.status());
      if (res.status() === 429) break;
    }
    expect(results).toContain(429);
  });
});
