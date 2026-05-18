/**
 * Playwright Global Teardown
 * Runs once after all tests complete.
 * Deletes all E2E test artefacts from the database so the demo stays clean.
 */
import type { FullConfig } from '@playwright/test';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? 'admin@wheelcheck.demo';
const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? 'demo1234';

// Place names created by test specs that are not timestamp-based
const NAMED_TEST_PLACES = [
  'E2E Owner Test Place',
  'E2E Owner Test Place Updated',
  'E2E Admin Delete Target',
  'Security Test Place',
];

async function safeFetch(url: string, opts: RequestInit = {}): Promise<any> {
  try {
    const res = await fetch(url, opts);
    if (res.status === 204 || res.status === 404) return { ok: res.ok, status: res.status };
    const text = await res.text();
    return text ? JSON.parse(text) : { ok: res.ok, status: res.status };
  } catch {
    return null;
  }
}

export default async function globalTeardown(_config: FullConfig) {
  console.log('\n[teardown] Cleaning E2E test data…');

  // ── 1. Get admin token ──────────────────────────────────────────────────
  const loginData = await safeFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!loginData?.token) {
    console.warn('[teardown] Could not get admin token — skipping cleanup');
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${loginData.token}`,
    'Content-Type': 'application/json',
  };

  // ── 2. Delete E2E test places ───────────────────────────────────────────
  // Search for "E2E" prefix places
  const searchData = await safeFetch(
    `${API_BASE}/places/search?name=E2E&size=100`,
    { headers: authHeaders },
  );
  const searchPlaces: any[] = Array.isArray(searchData)
    ? searchData
    : (searchData?.content ?? []);

  const toDelete = searchPlaces.filter(
    (p: any) =>
      p.name?.startsWith('E2E') ||
      NAMED_TEST_PLACES.includes(p.name),
  );

  let deletedPlaces = 0;
  for (const place of toDelete) {
    const r = await safeFetch(`${API_BASE}/places/${place.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (r?.status === 204 || r?.ok) deletedPlaces++;
  }

  // Also search for named test places individually in case search missed them
  for (const name of NAMED_TEST_PLACES) {
    const res = await safeFetch(
      `${API_BASE}/places/search?name=${encodeURIComponent(name)}&size=20`,
      { headers: authHeaders },
    );
    const places: any[] = Array.isArray(res) ? res : (res?.content ?? []);
    for (const p of places) {
      if (p.name !== name) continue;
      const r = await safeFetch(`${API_BASE}/places/${p.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (r?.status === 204 || r?.ok) deletedPlaces++;
    }
  }

  console.log(`[teardown] ✓ Deleted ${deletedPlaces} test place(s)`);

  // ── 3. Delete E2E test users ────────────────────────────────────────────
  const usersData = await safeFetch(`${API_BASE}/admin/users?size=200`, {
    headers: authHeaders,
  });
  const allUsers: any[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.content ?? []);

  const testUsers = allUsers.filter(
    (u: any) =>
      /^[a-z]+user\+\d+@example\.com$/.test(u.email ?? ''),
  );

  let deletedUsers = 0;
  for (const user of testUsers) {
    const r = await safeFetch(`${API_BASE}/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (r?.ok || r?.status === 204 || r?.status === 200) deletedUsers++;
  }

  console.log(`[teardown] ✓ Deleted ${deletedUsers} test user(s)`);
  console.log('[teardown] Done.\n');
}
