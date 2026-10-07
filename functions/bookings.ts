// Cloudflare Pages Function: venue booking API
// Routes: /bookings  (compatibility route /functions/bookings is provided by
//         functions/functions/bookings.ts)
//
// Public endpoints (no auth):
//   GET  /bookings?from=YYYY-MM-DD&to=YYYY-MM-DD  -> busy slots only (no personal data)
//   POST /bookings                                -> create a pending application
//
// Admin endpoints (validated `bmbcc_admin` JWT cookie, same session as /auth):
//   GET    /bookings?scope=admin                  -> full applications, personal data included
//   PUT    /bookings                              -> approve / reject / complete / cancel / note
//   DELETE /bookings?id=...                       -> permanently remove one application
//
// Storage: KV namespace bound as BOOKINGS. One record per key (`booking:<id>`)
// so two members submitting at the same moment can never overwrite each other.

import {
  ACTIVE_BOOKING_STATUSES,
  BLOCKING_BOOKING_STATUSES,
  DEFAULT_BOOKING_CONFIG,
  addDaysISO,
  bookingReference,
  findConflicts,
  isValidDateISO,
  minutesToTime,
  parseTimeToMinutes,
  toPublicSlot,
  todayISO,
  validateBookingRequest,
} from '../src/lib/bookingCore.js';

export interface Env {
  JWT_SECRET: string;
  BOOKINGS?: KVNamespace;
}

const COOKIE_NAME = 'bmbcc_admin';
const KEY_PREFIX = 'booking:';
const MAX_STORED_BOOKINGS = 400;
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 6;
const MAX_RANGE_DAYS = 90;

type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

interface BookingRecord {
  id: string;
  ref: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  venueId: string;
  venueLabel: { zh: string; en: string };
  venueOther?: string;
  purpose: string;
  reason: string;
  aircon: 'yes' | 'no';
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  headcount?: number | null;
  name: string;
  phone: string;
  email?: string;
  leadersNotified: Array<{ id?: string; label?: { zh: string; en: string }; phone?: string }>;
  lang?: 'zh' | 'en';
  adminNote?: string;
}

// --- Rate limiting (best effort, per edge isolate, mirrors auth.ts) ---

type RateBucket = { count: number; resetAt: number };
const submissionBuckets = new Map<string, RateBucket>();

function clientKey(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function checkRateLimit(key: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = submissionBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    submissionBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  submissionBuckets.set(key, bucket);
  if (bucket.count > MAX_SUBMISSIONS_PER_WINDOW) {
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

// --- JWT helpers (duplicated from auth.ts on purpose: CF Pages bundles each
//     function independently and this repository keeps functions self-contained) ---

function base64UrlDecode(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split('.');
    if (!headerB64 || !bodyB64 || !signatureB64) return null;

    const data = `${headerB64}.${bodyB64}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(
      atob((signatureB64 + '='.repeat((4 - (signatureB64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')),
      (char) => char.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data));
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(bodyB64));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// --- Response helpers ---

function responseHeaders(request: Request, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  headers.set('Cache-Control', 'no-store');

  const origin = request.headers.get('Origin');
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin === requestOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Vary', 'Origin');
  }

  return headers;
}

function jsonResponse(request: Request, body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: responseHeaders(request, init.headers),
  });
}

function storageMissing(request: Request): Response {
  return jsonResponse(request, {
    ok: false,
    error: 'booking_storage_unavailable',
    message:
      'Booking storage is not configured. Create a Cloudflare KV namespace and bind it as BOOKINGS (see CLOUDFLARE_DEPLOYMENT.md).',
  }, { status: 503 });
}

async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!env.JWT_SECRET) {
    return jsonResponse(request, { ok: false, error: 'server_not_configured', message: 'JWT_SECRET is not set.' }, { status: 500 });
  }

  const token = getTokenFromCookie(request.headers.get('Cookie'));
  if (!token) {
    return jsonResponse(request, { ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload || payload.admin !== true) {
    return jsonResponse(request, { ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  return null;
}

// --- Storage helpers ---

async function listBookings(env: Env): Promise<BookingRecord[]> {
  if (!env.BOOKINGS) return [];
  const records: BookingRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.BOOKINGS.list({ prefix: KEY_PREFIX, cursor, limit: 500 });
    const values = await Promise.all(page.keys.map((key) => env.BOOKINGS!.get(key.name, 'json')));
    values.forEach((value) => {
      if (value && typeof value === 'object') records.push(value as BookingRecord);
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return records;
}

async function putBooking(env: Env, record: BookingRecord): Promise<void> {
  await env.BOOKINGS!.put(`${KEY_PREFIX}${record.id}`, JSON.stringify(record));
}

async function deleteBooking(env: Env, id: string): Promise<void> {
  await env.BOOKINGS!.delete(`${KEY_PREFIX}${id}`);
}

// --- Shared helpers ---

function sortBookings(records: BookingRecord[]): BookingRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
}

function makeId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${Date.now().toString(36)}-${random}`;
}

function clampConfig(raw: unknown) {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const toNumber = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  };
  const timeOrDefault = (value: unknown, fallback: string) =>
    typeof value === 'string' && parseTimeToMinutes(value) !== null ? value : fallback;

  return {
    advanceDays: toNumber(source.advanceDays, DEFAULT_BOOKING_CONFIG.advanceDays, 0, 30),
    openTime: timeOrDefault(source.openTime, DEFAULT_BOOKING_CONFIG.openTime),
    closeTime: timeOrDefault(source.closeTime, DEFAULT_BOOKING_CONFIG.closeTime),
    maxDurationHours: toNumber(source.maxDurationHours, DEFAULT_BOOKING_CONFIG.maxDurationHours, 1, 12),
    slotMinutes: toNumber(source.slotMinutes, DEFAULT_BOOKING_CONFIG.slotMinutes, 15, 120),
    contactPhone: typeof source.contactPhone === 'string' ? source.contactPhone.slice(0, 40) : DEFAULT_BOOKING_CONFIG.contactPhone,
    whatsapp: typeof source.whatsapp === 'string' ? source.whatsapp.slice(0, 40) : DEFAULT_BOOKING_CONFIG.whatsapp,
  };
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function bilingual(value: unknown): { zh: string; en: string } {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    zh: cleanText(source.zh, 80),
    en: cleanText(source.en, 80),
  };
}

function sanitizeLeaders(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((entry) => {
    const source = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    return {
      id: cleanText(source.id, 40),
      label: bilingual(source.label),
      phone: cleanText(source.phone, 40),
    };
  }).filter((entry) => entry.id || entry.label.zh || entry.label.en);
}

/* ------------------------------------------------------------------ *
 * Handlers
 * ------------------------------------------------------------------ */

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: responseHeaders(request, {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }),
  });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.BOOKINGS) return storageMissing(request);

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'public';
  const today = todayISO();

  if (scope === 'admin') {
    const authError = await requireAdmin(request, env);
    if (authError) return authError;

    const records = await listBookings(env);
    return jsonResponse(request, { ok: true, today, bookings: sortBookings(records) });
  }

  // Public: availability only. Never expose names, phones or emails.
  const single = url.searchParams.get('date');
  const from = single || url.searchParams.get('from') || today;
  const to = single || url.searchParams.get('to') || from;

  if (!isValidDateISO(from) || !isValidDateISO(to)) {
    return jsonResponse(request, { ok: false, error: 'invalid_date', message: 'Use YYYY-MM-DD dates.' }, { status: 400 });
  }
  const rangeStart = from <= to ? from : to;
  const rangeEnd = from <= to ? to : from;
  if (addDaysISO(rangeStart, MAX_RANGE_DAYS) < rangeEnd) {
    return jsonResponse(request, { ok: false, error: 'range_too_large', message: `Maximum range is ${MAX_RANGE_DAYS} days.` }, { status: 400 });
  }

  const records = await listBookings(env);
  const slots = records
    .filter((record) => ACTIVE_BOOKING_STATUSES.includes(record.status))
    .filter((record) => record.date >= rangeStart && record.date <= rangeEnd)
    .map(toPublicSlot)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  return jsonResponse(request, { ok: true, today, from: rangeStart, to: rangeEnd, bookings: slots });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.BOOKINGS) return storageMissing(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // Hidden honeypot field: real members never fill this in.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse(request, { ok: true, spamIgnored: true, booking: null }, { status: 202 });
  }

  const limit = checkRateLimit(clientKey(request));
  if (limit.limited) {
    return jsonResponse(request, {
      ok: false,
      error: 'rate_limited',
      message: 'Too many applications submitted from this connection. Please try again later.',
    }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
  }

  const config = clampConfig(body.config);
  const today = todayISO();
  const { ok, errors } = validateBookingRequest(body, config, { today });
  if (!ok) {
    return jsonResponse(request, { ok: false, error: 'invalid_request', errors }, { status: 400 });
  }

  const venueId = cleanText(body.venueId, 40);
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(venueId)) {
    return jsonResponse(request, { ok: false, error: 'invalid_request', errors: { venueId: 'invalid' } }, { status: 400 });
  }

  const date = cleanText(body.date, 10);
  const startTime = cleanText(body.startTime, 5);
  const durationHours = Math.round(Number(body.durationHours));
  const start = parseTimeToMinutes(startTime)!;
  const endTime = minutesToTime(start + durationHours * 60);

  const candidate = { venueId, date, startTime, durationHours };

  // Hard block when staff already approved an overlapping slot for this venue.
  // Members may still submit against a *pending* slot: the UI warns them and
  // staff make the final call, so two people can apply for the same window.
  const existing = await listBookings(env);
  const approvedConflicts = findConflicts(candidate, existing, BLOCKING_BOOKING_STATUSES)
    .map(toPublicSlot);
  if (approvedConflicts.length > 0) {
    return jsonResponse(request, {
      ok: false,
      error: 'slot_taken',
      message: 'The selected time is already booked and approved for this venue.',
      conflicts: approvedConflicts,
    }, { status: 409 });
  }

  if (existing.length >= MAX_STORED_BOOKINGS) {
    return jsonResponse(request, {
      ok: false,
      error: 'booking_limit_reached',
      message: 'The booking list is full. Please contact the church office.',
    }, { status: 507 });
  }

  const pendingConflicts = findConflicts(candidate, existing, ['pending']).map(toPublicSlot);

  const now = new Date().toISOString();
  const id = makeId();
  const record: BookingRecord = {
    id,
    ref: bookingReference(date),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    venueId,
    venueLabel: bilingual(body.venueLabel),
    venueOther: cleanText(body.venueOther, 80),
    purpose: cleanText(body.purpose, 20),
    reason: cleanText(body.reason, 500),
    aircon: body.aircon === 'yes' ? 'yes' : 'no',
    date,
    startTime,
    endTime,
    durationHours,
    headcount: body.headcount === undefined || body.headcount === '' || body.headcount === null
      ? null
      : Math.round(Number(body.headcount)) || null,
    name: cleanText(body.name, 80),
    phone: cleanText(body.phone, 20),
    email: cleanText(body.email, 120),
    leadersNotified: sanitizeLeaders(body.leadersNotified),
    lang: body.lang === 'en' ? 'en' : 'zh',
  };

  await putBooking(env, record);

  return jsonResponse(request, {
    ok: true,
    booking: record,
    warnings: pendingConflicts.length > 0 ? { pendingConflicts } : null,
  }, { status: 201 });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.BOOKINGS) return storageMissing(request);

  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const id = cleanText(body.id, 80);
  const action = cleanText(body.action, 20);
  if (!id || !action) {
    return jsonResponse(request, { ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const record = await env.BOOKINGS.get(`${KEY_PREFIX}${id}`, 'json') as BookingRecord | null;
  if (!record) {
    return jsonResponse(request, { ok: false, error: 'not_found' }, { status: 404 });
  }

  const note = cleanText(body.note, 500);
  const now = new Date().toISOString();

  if (action === 'approve') {
    const others = (await listBookings(env)).filter((item) => item.id !== id);
    const conflicts = findConflicts(record, others, BLOCKING_BOOKING_STATUSES).map(toPublicSlot);
    if (conflicts.length > 0 && body.force !== true) {
      return jsonResponse(request, { ok: false, error: 'conflict', conflicts }, { status: 409 });
    }
    record.status = 'approved';
    record.decidedAt = now;
  } else if (action === 'reject') {
    record.status = 'rejected';
    record.decidedAt = now;
  } else if (action === 'complete') {
    record.status = 'completed';
  } else if (action === 'cancel') {
    record.status = 'cancelled';
    record.decidedAt = now;
  } else if (action === 'reopen') {
    record.status = 'pending';
    delete record.decidedAt;
  } else if (action !== 'note') {
    return jsonResponse(request, { ok: false, error: 'unknown_action' }, { status: 400 });
  }

  if (note) record.adminNote = note;
  record.updatedAt = now;
  await putBooking(env, record);

  return jsonResponse(request, { ok: true, booking: record });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.BOOKINGS) return storageMissing(request);

  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
  if (!id) return jsonResponse(request, { ok: false, error: 'missing_id' }, { status: 400 });

  await deleteBooking(env, id);
  return jsonResponse(request, { ok: true, deleted: id });
};
