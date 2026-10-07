// Integration tests for the venue booking Pages Function.
// These call the real handler in functions/bookings.ts with a mock KV namespace
// and real Request objects, so validation, conflict blocking and the admin
// approval flow are exercised end-to-end without deploying anything.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  onRequestDelete,
  onRequestGet,
  onRequestPost,
  onRequestPut,
} from '../functions/bookings.ts';

const ORIGIN = 'https://bmbcc.example.org';
const JWT_SECRET = 'test-jwt-secret-value';

/* ----------------------------- test doubles ----------------------------- */

function createMockKV() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      if (!store.has(key)) return null;
      const raw = store.get(key);
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const names = [...store.keys()].filter((name) => name.startsWith(prefix)).sort();
      const start = cursor ? names.indexOf(cursor) + 1 : 0;
      const slice = names.slice(start, start + limit);
      const complete = start + slice.length >= names.length;
      return {
        keys: slice.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete ? undefined : names[start + slice.length],
      };
    },
  };
}

function createEnv({ withStorage = true } = {}) {
  return withStorage
    ? { JWT_SECRET, BOOKINGS: createMockKV() }
    : { JWT_SECRET };
}

function makeRequest(path, { method = 'GET', body, headers = {}, token, ip = '203.0.113.10' } = {}) {
  const merged = new Headers(headers);
  merged.set('X-Forwarded-For', ip);
  if (body !== undefined) merged.set('Content-Type', 'application/json');
  if (token) merged.set('Cookie', `bmbcc_admin=${token}`);
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: merged,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(request, env) {
  return { request, env, params: {}, data: {}, waitUntil() {}, passThroughOnException() {} };
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function signAdminToken(secret = JWT_SECRET, payloadExtra = {}) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({
    admin: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payloadExtra,
  }));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${Buffer.from(signature).toString('base64url')}`;
}

function isoOffset(days) {
  const now = new Date();
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000 + days * 86400000);
  return myt.toISOString().slice(0, 10);
}

async function readJson(response) {
  return response.json();
}

function sampleApplication(overrides = {}) {
  return {
    name: '陈小明',
    phone: '012-3456789',
    email: 'member@example.com',
    venueId: 'jabez-hall',
    venueLabel: { zh: '雅比斯副堂', en: 'Jabez Hall' },
    purpose: 'meeting',
    reason: '小组聚会',
    aircon: 'yes',
    date: isoOffset(5),
    startTime: '10:00',
    durationHours: 2,
    headcount: 20,
    leadersNotified: [{ id: 'worship', label: { zh: '敬拜事工负责人 郑金兰传道', en: 'Worship Ministry' }, phone: '012-4260338' }],
    agree: true,
    lang: 'zh',
    config: { advanceDays: 2, openTime: '08:00', closeTime: '22:00', maxDurationHours: 4 },
    ...overrides,
  };
}

let ipCounter = 0;
function uniqueIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

/* ----------------------------- tests ----------------------------- */

test('GET returns 503 when the BOOKINGS binding is missing', async () => {
  const request = makeRequest('/bookings?from=2026-10-01&to=2026-10-02');
  const res = await onRequestGet(context(request, createEnv({ withStorage: false })));
  assert.equal(res.status, 503);
  const body = await readJson(res);
  assert.equal(body.error, 'booking_storage_unavailable');
});

test('POST creates a pending application and stores the full record', async () => {
  const env = createEnv();
  const request = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  const res = await onRequestPost(context(request, env));
  const body = await readJson(res);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.booking.status, 'pending');
  assert.match(body.booking.ref, /^VB-\d{8}-[A-Z2-9]{4}$/);
  assert.equal(body.booking.endTime, '12:00');
  assert.equal(body.booking.name, '陈小明');
  assert.equal(env.BOOKINGS.store.size, 1);
});

test('POST rejects an incomplete application with per-field errors', async () => {
  const env = createEnv();
  const request = makeRequest('/bookings', { method: 'POST', body: { name: '' }, ip: uniqueIp() });
  const res = await onRequestPost(context(request, env));
  const body = await readJson(res);

  assert.equal(res.status, 400);
  assert.equal(body.error, 'invalid_request');
  assert.ok(body.errors.name);
  assert.ok(body.errors.phone);
  assert.ok(body.errors.agree);
  assert.equal(env.BOOKINGS.store.size, 0);
});

test('POST enforces the advance-days rule sent by the site config', async () => {
  const env = createEnv();
  const request = makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ date: isoOffset(1), config: { advanceDays: 2, openTime: '08:00', closeTime: '22:00', maxDurationHours: 4 } }),
    ip: uniqueIp(),
  });
  const res = await onRequestPost(context(request, env));
  const body = await readJson(res);
  assert.equal(res.status, 400);
  assert.equal(body.errors.date, 'too_soon');
});

test('POST ignores honeypot submissions without storing anything', async () => {
  const env = createEnv();
  const request = makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ website: 'http://spam.example' }),
    ip: uniqueIp(),
  });
  const res = await onRequestPost(context(request, env));
  assert.equal(res.status, 202);
  assert.equal(env.BOOKINGS.store.size, 0);
});

test('POST blocks a slot that staff already approved', async () => {
  const env = createEnv();
  const first = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  const created = await (await onRequestPost(context(first, env))).json();

  const adminToken = await signAdminToken();
  const approve = makeRequest('/bookings', {
    method: 'PUT',
    token: adminToken,
    body: { id: created.booking.id, action: 'approve' },
  });
  const approveRes = await onRequestPut(context(approve, env));
  assert.equal(approveRes.status, 200);

  // A second member picks an overlapping window: 11:00 - 13:00 vs 10:00 - 12:00.
  const clash = makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ name: '林姐妹', phone: '011-2222333', startTime: '11:00' }),
    ip: uniqueIp(),
  });
  const clashRes = await onRequestPost(context(clash, env));
  const clashBody = await readJson(clashRes);
  assert.equal(clashRes.status, 409);
  assert.equal(clashBody.error, 'slot_taken');
  assert.equal(clashBody.conflicts.length, 1);
  assert.equal(clashBody.conflicts[0].startTime, '10:00');
  // Personal data must never leak through a conflict response.
  assert.equal(clashBody.conflicts[0].name, undefined);
});

test('POST allows a slot with a pending application but warns the member', async () => {
  const env = createEnv();
  const first = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  await onRequestPost(context(first, env));

  const second = makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ name: '黄弟兄', phone: '019-8888777', startTime: '10:30' }),
    ip: uniqueIp(),
  });
  const res = await onRequestPost(context(second, env));
  const body = await readJson(res);
  assert.equal(res.status, 201);
  assert.equal(body.warnings.pendingConflicts.length, 1);
});

test('public availability never exposes personal data and hides rejected slots', async () => {
  const env = createEnv();
  const create = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  const created = await (await onRequestPost(context(create, env))).json();

  const adminToken = await signAdminToken();
  const reject = makeRequest('/bookings', {
    method: 'PUT',
    token: adminToken,
    body: { id: created.booking.id, action: 'reject', note: '场地维修' },
  });
  await onRequestPut(context(reject, env));

  const date = sampleApplication().date;
  const publicReq = makeRequest(`/bookings?from=${date}&to=${date}`);
  const res = await onRequestGet(context(publicReq, env));
  const body = await readJson(res);

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(body.bookings, []);

  // Pending + approved records are exposed as bare slots only.
  const create2 = makeRequest('/bookings', { method: 'POST', body: sampleApplication({ startTime: '14:00' }), ip: uniqueIp() });
  await onRequestPost(context(create2, env));
  const res2 = await onRequestGet(context(makeRequest(`/bookings?date=${date}`), env));
  const body2 = await readJson(res2);
  assert.equal(body2.bookings.length, 1);
  assert.deepEqual(Object.keys(body2.bookings[0]).sort(), ['date', 'durationHours', 'startTime', 'status', 'venueId']);
});

test('public availability validates the date range', async () => {
  const env = createEnv();
  const bad = await onRequestGet(context(makeRequest('/bookings?date=05-10-2026'), env));
  assert.equal(bad.status, 400);

  const tooWide = await onRequestGet(context(makeRequest('/bookings?from=2026-01-01&to=2026-12-31'), env));
  assert.equal(tooWide.status, 400);
  const wideBody = await readJson(tooWide);
  assert.equal(wideBody.error, 'range_too_large');
});

test('admin listing requires a valid session', async () => {
  const env = createEnv();
  const create = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  await onRequestPost(context(create, env));

  const anonymous = await onRequestGet(context(makeRequest('/bookings?scope=admin'), env));
  assert.equal(anonymous.status, 401);

  const wrongSecret = await signAdminToken('a-different-secret');
  const forged = await onRequestGet(context(makeRequest('/bookings?scope=admin', { token: wrongSecret }), env));
  assert.equal(forged.status, 401);

  const notAdmin = await signAdminToken(JWT_SECRET, { admin: false });
  const nonAdmin = await onRequestGet(context(makeRequest('/bookings?scope=admin', { token: notAdmin }), env));
  assert.equal(nonAdmin.status, 401);

  const expired = await signAdminToken(JWT_SECRET, { exp: Math.floor(Date.now() / 1000) - 10 });
  const expiredRes = await onRequestGet(context(makeRequest('/bookings?scope=admin', { token: expired }), env));
  assert.equal(expiredRes.status, 401);

  const adminToken = await signAdminToken();
  const ok = await onRequestGet(context(makeRequest('/bookings?scope=admin', { token: adminToken }), env));
  const body = await readJson(ok);
  assert.equal(ok.status, 200);
  assert.equal(body.bookings.length, 1);
  assert.equal(body.bookings[0].phone, '012-3456789');
});

test('admin actions: approve, reject with note, complete and reopen', async () => {
  const env = createEnv();
  const adminToken = await signAdminToken();
  const create = makeRequest('/bookings', { method: 'POST', body: sampleApplication(), ip: uniqueIp() });
  const created = await (await onRequestPost(context(create, env))).json();
  const id = created.booking.id;

  const approve = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'approve' },
  }), env));
  const approved = await readJson(approve);
  assert.equal(approved.booking.status, 'approved');
  assert.ok(approved.booking.decidedAt);

  const complete = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'complete' },
  }), env));
  assert.equal((await readJson(complete)).booking.status, 'completed');

  const reopen = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'reopen' },
  }), env));
  assert.equal((await readJson(reopen)).booking.status, 'pending');

  const reject = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'reject', note: '场地维修中' },
  }), env));
  const rejected = await readJson(reject);
  assert.equal(rejected.booking.status, 'rejected');
  assert.equal(rejected.booking.adminNote, '场地维修中');

  const note = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'note', note: '已电话联系' },
  }), env));
  assert.equal((await readJson(note)).booking.adminNote, '已电话联系');

  const unknown = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id, action: 'explode' },
  }), env));
  assert.equal(unknown.status, 400);

  const missing = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id: 'nope', action: 'approve' },
  }), env));
  assert.equal(missing.status, 404);
});

test('approving a clashing application requires an explicit force', async () => {
  const env = createEnv();
  const adminToken = await signAdminToken();

  const first = await (await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST', body: sampleApplication(), ip: uniqueIp(),
  }), env))).json();
  const second = await (await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST', body: sampleApplication({ name: '李弟兄', phone: '017-1112222', startTime: '11:00' }), ip: uniqueIp(),
  }), env))).json();

  await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id: first.booking.id, action: 'approve' },
  }), env));

  const clash = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id: second.booking.id, action: 'approve' },
  }), env));
  assert.equal(clash.status, 409);
  assert.equal((await readJson(clash)).error, 'conflict');

  const forced = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id: second.booking.id, action: 'approve', force: true },
  }), env));
  assert.equal(forced.status, 200);
  assert.equal((await readJson(forced)).booking.status, 'approved');
});

test('DELETE removes an application and requires admin auth', async () => {
  const env = createEnv();
  const adminToken = await signAdminToken();
  const created = await (await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST', body: sampleApplication(), ip: uniqueIp(),
  }), env))).json();

  const anon = await onRequestDelete(context(makeRequest(`/bookings?id=${created.booking.id}`), env));
  assert.equal(anon.status, 401);

  const res = await onRequestDelete(context(makeRequest(`/bookings?id=${created.booking.id}`, { token: adminToken }), env));
  assert.equal(res.status, 200);
  assert.equal(env.BOOKINGS.store.size, 0);

  const missingId = await onRequestDelete(context(makeRequest('/bookings', { token: adminToken }), env));
  assert.equal(missingId.status, 400);
});

test('repeated submissions from one connection are rate limited', async () => {
  const env = createEnv();
  const ip = uniqueIp();
  let lastStatus = 0;
  for (let i = 0; i < 7; i += 1) {
    const res = await onRequestPost(context(makeRequest('/bookings', {
      method: 'POST',
      body: sampleApplication({ name: `申请人${i}`, startTime: '08:00' }),
      ip,
    }), env));
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);
});

test('end-to-end: member applies, staff approves, the slot shows as taken', async () => {
  const env = createEnv();
  const date = isoOffset(3);

  // 1. Member submits through the public form.
  const submit = await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ date, startTime: '15:00', durationHours: 3, venueId: 'jabez-hall' }),
    ip: uniqueIp(),
  }), env));
  const submitted = await readJson(submit);
  assert.equal(submit.status, 201);
  assert.equal(submitted.booking.endTime, '18:00');

  // 2. The public calendar shows it as pending for that venue.
  const publicBefore = await readJson(await onRequestGet(context(makeRequest(`/bookings?date=${date}`), env)));
  assert.equal(publicBefore.bookings[0].status, 'pending');

  // 3. Staff see it in the console and approve it.
  const adminToken = await signAdminToken();
  const list = await readJson(await onRequestGet(context(
    makeRequest('/bookings?scope=admin', { token: adminToken }), env
  )));
  assert.equal(list.bookings.length, 1);
  const approving = await onRequestPut(context(makeRequest('/bookings', {
    method: 'PUT', token: adminToken, body: { id: list.bookings[0].id, action: 'approve' },
  }), env));
  assert.equal(approving.status, 200);

  // 4. The public calendar now reports the slot as approved.
  const publicAfter = await readJson(await onRequestGet(context(makeRequest(`/bookings?date=${date}`), env)));
  assert.equal(publicAfter.bookings[0].status, 'approved');

  // 5. Another member can no longer book that window.
  const blocked = await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ date, startTime: '16:00', name: '另一位弟兄' }),
    ip: uniqueIp(),
  }), env));
  assert.equal(blocked.status, 409);

  // 6. A neighbouring window the same day is still available.
  const allowed = await onRequestPost(context(makeRequest('/bookings', {
    method: 'POST',
    body: sampleApplication({ date, startTime: '18:00', durationHours: 2, name: '另一位弟兄' }),
    ip: uniqueIp(),
  }), env));
  assert.equal(allowed.status, 201);
});
