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

test.describe.serial('Comments & Discussion E2E', () => {
  let userToken: string;
  let adminToken: string;
  let placeId: string;
  let userCommentId: string;
  let adminCommentId: string;
  let replyId: string;

  test.beforeAll(async ({ request }) => {
    userToken = await getAuthToken(request, USER_EMAIL, USER_PASSWORD);
    adminToken = await getAuthToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await request.get(`${API_BASE}/places/search?name=hospital`);
    const places = await res.json();
    placeId = places[0]?.id;
    if (!placeId) {
      const all = await request.get(`${API_BASE}/places?page=0&size=1`);
      const data = await all.json();
      placeId = data.content?.[0]?.id;
    }
    expect(placeId).toBeTruthy();
  });

  test('user can post a comment', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { placeId, content: 'E2E test: ramp was great, easy wheelchair access!' },
    });
    expect(res.ok()).toBe(true);
    const comment = await res.json();
    userCommentId = comment.id;
    expect(comment.content).toContain('ramp was great');
    expect(comment.userName).toBeTruthy();
    await delay(500);
  });

  test('admin can post a comment on same place', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { placeId, content: 'E2E test: admin agrees, this place is very accessible.' },
    });
    expect(res.ok()).toBe(true);
    const comment = await res.json();
    adminCommentId = comment.id;
    expect(comment.content).toContain('admin agrees');
    await delay(500);
  });

  test('user can reply to admin comment', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        placeId,
        content: 'E2E test: thanks admin, totally agree!',
        parentId: adminCommentId,
      },
    });
    expect(res.ok()).toBe(true);
    const reply = await res.json();
    replyId = reply.id;
    expect(reply.content).toContain('thanks admin');
    await delay(500);
  });

  test('can fetch all comments for a place', async ({ request }) => {
    const res = await request.get(`${API_BASE}/comments/place/${placeId}`);
    expect(res.ok()).toBe(true);
    const comments = await res.json();
    expect(comments.length).toBeGreaterThanOrEqual(2);
    const adminComment = comments.find((c: any) => c.id === adminCommentId);
    expect(adminComment).toBeTruthy();
    await delay(500);
  });

  test('user can upvote admin comment', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments/${adminCommentId}/vote?type=up`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.ok()).toBe(true);
    const comment = await res.json();
    expect(comment.upvotes).toBeGreaterThanOrEqual(1);
    await delay(500);
  });

  test('user can toggle vote from up to down', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments/${adminCommentId}/vote?type=down`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.ok()).toBe(true);
    const comment = await res.json();
    expect(comment.downvotes).toBeGreaterThanOrEqual(1);
    await delay(500);
  });

  test('user can remove vote by voting same type again', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments/${adminCommentId}/vote?type=down`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.ok()).toBe(true);
    await delay(500);
  });

  test('user can edit their own comment', async ({ request }) => {
    const res = await request.put(`${API_BASE}/comments/${userCommentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { content: 'E2E test: edited — ramp is excellent, 10/10 accessibility!' },
    });
    expect(res.ok()).toBe(true);
    const comment = await res.json();
    expect(comment.content).toContain('edited');
    await delay(500);
  });

  test('user cannot edit admin comment', async ({ request }) => {
    const res = await request.put(`${API_BASE}/comments/${adminCommentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { content: 'User trying to edit admin comment' },
    });
    expect(res.ok()).toBe(false);
    await delay(500);
  });

  test('user cannot delete admin comment', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/comments/${adminCommentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.ok()).toBe(false);
    await delay(500);
  });

  test('admin can delete user reply', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/comments/${replyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(204);
    await delay(500);
  });

  test('user can delete their own comment', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/comments/${userCommentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status()).toBe(204);
    await delay(500);
  });

  test('admin can delete their own comment', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/comments/${adminCommentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(204);
  });

  test('unauthenticated user cannot post a comment', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comments`, {
      data: { placeId, content: 'Anonymous comment attempt' },
    });
    expect(res.ok()).toBe(false);
  });
});
