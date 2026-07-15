// Cloudflare Pages Function: Authentication Edge Handler
// Route: /auth
// Compatibility route /functions/auth is provided by functions/functions/auth.ts.

export interface Env {
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
}

const COOKIE_NAME = 'bmbcc_admin';
const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

// Best-effort in-memory rate limiting. Cloudflare may run several isolates, so this
// is not a database-backed global limit, but it blocks repeated attempts per edge
// isolate and avoids adding external dependencies for this small admin panel.
const failedAttempts = new Map<string, RateLimitBucket>();

function getClientKey(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function getRateLimitBucket(key: string): RateLimitBucket {
  const now = Date.now();
  const existing = failedAttempts.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    failedAttempts.set(key, bucket);
    return bucket;
  }

  return existing;
}

function isRateLimited(key: string): boolean {
  return getRateLimitBucket(key).count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key: string): RateLimitBucket {
  const bucket = getRateLimitBucket(key);
  bucket.count += 1;
  failedAttempts.set(key, bucket);
  return bucket;
}

function clearFailedAttempts(key: string): void {
  failedAttempts.delete(key);
}

function secondsUntilReset(bucket: RateLimitBucket): number {
  return Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string'
    ? new TextEncoder().encode(value)
    : new Uint8Array(value);

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function responseHeaders(request: Request, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  headers.set('Cache-Control', 'no-store');

  // Same-origin requests do not need CORS. If the browser sends Origin for the
  // same site, echo only that same origin so credentials remain valid and we do
  // not open authenticated endpoints to arbitrary origins.
  const origin = request.headers.get('Origin');
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin === requestOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

function ensureConfigured(env: Env): string | null {
  if (!env.ADMIN_PASSWORD || !env.JWT_SECRET) {
    return 'Authentication is not configured. Set ADMIN_PASSWORD and JWT_SECRET in Cloudflare Pages.';
  }
  return null;
}

// Simple JWT implementation without external dependencies
async function createToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));

  return `${data}.${base64UrlEncode(signature)}`;
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

function setAuthCookie(token: string, maxAge: number = SESSION_DURATION_SECONDS): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: responseHeaders(request, {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }),
  });
};

// POST /auth or /functions/auth - Login / password re-verification
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const configError = ensureConfigured(env);
    if (configError) {
      return jsonResponse(request, { ok: false, error: configError }, { status: 500 });
    }

    const clientKey = getClientKey(request);
    const bucket = getRateLimitBucket(clientKey);
    if (isRateLimited(clientKey)) {
      return jsonResponse(request, {
        ok: false,
        error: `Too many failed attempts. Try again in ${secondsUntilReset(bucket)} seconds.`,
      }, { status: 429 });
    }

    const { password } = await request.json() as { password?: string };

    if (!password || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
      const updatedBucket = recordFailedAttempt(clientKey);
      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - updatedBucket.count);
      return jsonResponse(request, {
        ok: false,
        error: remainingAttempts > 0
          ? 'Invalid password'
          : `Too many failed attempts. Try again in ${secondsUntilReset(updatedBucket)} seconds.`,
        remainingAttempts,
      }, { status: 401 });
    }

    clearFailedAttempts(clientKey);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = await createToken({
      admin: true,
      iat: nowSeconds,
      exp: nowSeconds + SESSION_DURATION_SECONDS,
    }, env.JWT_SECRET);

    return jsonResponse(request, { ok: true }, {
      headers: {
        'Set-Cookie': setAuthCookie(token),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return jsonResponse(request, { ok: false, error: 'Server error' }, { status: 500 });
  }
};

// GET /auth or /functions/auth - Verify session
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const configError = ensureConfigured(env);
    if (configError) {
      return jsonResponse(request, { isAdmin: false, error: configError }, { status: 500 });
    }

    const cookieHeader = request.headers.get('Cookie');
    const token = getTokenFromCookie(cookieHeader);

    if (!token) {
      return jsonResponse(request, { isAdmin: false });
    }

    const payload = await verifyToken(token, env.JWT_SECRET);
    const isAdmin = payload?.admin === true;

    return jsonResponse(request, { isAdmin });
  } catch (err) {
    console.error('Verify error:', err);
    return jsonResponse(request, { isAdmin: false });
  }
};

// DELETE /auth or /functions/auth - Logout
export const onRequestDelete: PagesFunction<Env> = async ({ request }) => {
  return jsonResponse(request, { ok: true }, {
    headers: {
      'Set-Cookie': clearAuthCookie(),
    },
  });
};
