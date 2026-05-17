import type { Page, APIRequestContext } from '@playwright/test';

/**
 * Shared E2E test helpers.
 * API_BASE respects NEXT_PUBLIC_API_URL env var so tests work against
 * both local dev (http://localhost:8080/api) and demo (HF Spaces).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';

// Demo / local credentials
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@wheelcheck.demo';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'demo1234';
export const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'user@wheelcheck.demo';
export const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'demo1234';

/**
 * Token cache — avoids hammering the login endpoint on every test.
 * HF Space rate-limits auth/login after ~4 rapid requests, returning 429
 * and causing subsequent calls to get `undefined` tokens (→ 403 on API).
 * Tokens are valid for 24h (app.jwt.expiration: 86400), so reuse is safe.
 */
const tokenCache = new Map<string, { token: string; fetchedAt: number }>();
const TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes (well within 24h JWT lifetime)

/** Get a JWT token via the auth/login endpoint — cached per credential pair */
export async function getAuthToken(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<string> {
  const cacheKey = `${email}:${password}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < TOKEN_TTL_MS) {
    return cached.token;
  }

  // Retry once on 429 with a short back-off
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    if (res.status() === 429) continue; // rate limited — wait and retry
    const data = await res.json();
    if (data.token) {
      tokenCache.set(cacheKey, { token: data.token, fetchedAt: Date.now() });
      return data.token;
    }
  }
  throw new Error(`Failed to get auth token for ${email} after retries`);
}

/** Log in and inject token into the page's localStorage */
export async function loginAsAdmin(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = await res.json();
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('wheelcheck_token', token);
      if (user) localStorage.setItem('wheelcheck_user', JSON.stringify(user));
    },
    { token: data.token, user: data.user },
  );
}

export async function loginAsUser(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  const data = await res.json();
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('wheelcheck_token', token);
      if (user) localStorage.setItem('wheelcheck_user', JSON.stringify(user));
    },
    { token: data.token, user: data.user },
  );
}


/** Log in and inject token into the page's localStorage */
export async function loginAsAdmin(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = await res.json();
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('wheelcheck_token', token);
      if (user) localStorage.setItem('wheelcheck_user', JSON.stringify(user));
    },
    { token: data.token, user: data.user },
  );
}

export async function loginAsUser(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  const data = await res.json();
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('wheelcheck_token', token);
      if (user) localStorage.setItem('wheelcheck_user', JSON.stringify(user));
    },
    { token: data.token, user: data.user },
  );
}
