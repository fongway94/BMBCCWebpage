// Cloudflare Pages Function: GitHub Settings Edge Handler
// Route: /github-settings
// Stores GitHub PAT, repo, and auto-save toggle in Cloudflare KV.
// All endpoints require a valid admin JWT session (same auth as /auth).

export interface Env {
  JWT_SECRET: string;
  GITHUB_SETTINGS: KVNamespace;
}

const COOKIE_NAME = 'bmbcc_admin';
const KV_KEY = 'github_settings';

// --- Shared JWT helpers (duplicated from auth.ts to avoid cross-file imports in CF Pages) ---

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

// --- Auth guard ---

async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!env.JWT_SECRET || !env.GITHUB_SETTINGS) {
    return jsonResponse(request, {
      ok: false,
      error: 'GitHub settings storage is not configured. Set JWT_SECRET and GITHUB_SETTINGS KV namespace in Cloudflare.',
    }, { status: 500 });
  }

  const cookieHeader = request.headers.get('Cookie');
  const token = getTokenFromCookie(cookieHeader);

  if (!token) {
    return jsonResponse(request, { ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload || payload.admin !== true) {
    return jsonResponse(request, { ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  return null; // null = authenticated, proceed
}

// --- Handlers ---

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

// GET /github-settings — Retrieve stored GitHub settings
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  try {
    const stored = await env.GITHUB_SETTINGS.get(KV_KEY, 'json') as {
      pat?: string;
      repo?: string;
      autoSave?: boolean;
    } | null;

    return jsonResponse(request, {
      ok: true,
      settings: stored || {},
    });
  } catch (err) {
    console.error('Failed to read GitHub settings from KV:', err);
    return jsonResponse(request, { ok: false, error: 'Failed to read settings' }, { status: 500 });
  }
};

// POST /github-settings — Save GitHub settings
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  try {
    const body = await request.json() as {
      pat?: string;
      repo?: string;
      autoSave?: boolean;
    };

    // Validate: only allow expected fields
    const settings: Record<string, unknown> = {};
    if (body.pat !== undefined) settings.pat = String(body.pat);
    if (body.repo !== undefined) settings.repo = String(body.repo);
    if (body.autoSave !== undefined) settings.autoSave = Boolean(body.autoSave);

    await env.GITHUB_SETTINGS.put(KV_KEY, JSON.stringify(settings));

    return jsonResponse(request, { ok: true });
  } catch (err) {
    console.error('Failed to save GitHub settings to KV:', err);
    return jsonResponse(request, { ok: false, error: 'Failed to save settings' }, { status: 500 });
  }
};

// DELETE /github-settings — Clear stored GitHub settings
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  try {
    await env.GITHUB_SETTINGS.delete(KV_KEY);
    return jsonResponse(request, { ok: true });
  } catch (err) {
    console.error('Failed to delete GitHub settings from KV:', err);
    return jsonResponse(request, { ok: false, error: 'Failed to delete settings' }, { status: 500 });
  }
};
