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

/** Get a JWT token via the auth/login endpoint */
export async function getAuthToken(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  const data = await res.json();
  return data.token;
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
