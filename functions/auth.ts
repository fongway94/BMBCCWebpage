// Cloudflare Pages Function: Authentication Edge Handler
// Deployed automatically with Cloudflare Pages at /functions/auth

export interface Env {
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
}

const COOKIE_NAME = 'bmbcc_admin';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Simple JWT implementation without external dependencies
async function createToken(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${data}.${sig}`;
}

async function verifyToken(token: string, secret: string): Promise<any | null> {
  try {
    const [headerB64, bodyB64, sig] = token.split('.');
    if (!headerB64 || !bodyB64 || !sig) return null;
    
    const data = `${headerB64}.${bodyB64}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert URL-safe base64 back to standard
    const sigPadding = sig + '='.repeat((4 - sig.length % 4) % 4);
    const signature = Uint8Array.from(atob(sigPadding.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data));
    if (!valid) return null;
    
    const payload = JSON.parse(atob(bodyPadding(bodyB64)));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function bodyPadding(b64: string): string {
  return b64 + '='.repeat((4 - b64.length % 4) % 4);
}

function setAuthCookie(token: string, maxAge: number = SESSION_DURATION): string {
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

// POST /functions/auth - Login
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { password } = await request.json();
    
    if (!password || password !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = await createToken({ 
      admin: true, 
      exp: Date.now() + SESSION_DURATION * 1000 
    }, env.JWT_SECRET);

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setAuthCookie(token)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET /functions/auth - Verify session
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = getTokenFromCookie(cookieHeader);
    
    if (!token) {
      return new Response(JSON.stringify({ isAdmin: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = await verifyToken(token, env.JWT_SECRET);
    const isAdmin = !!payload?.admin;

    return new Response(JSON.stringify({ isAdmin }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Verify error:', err);
    return new Response(JSON.stringify({ isAdmin: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /functions/auth - Logout
export const onRequestDelete: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearAuthCookie()
    }
  });
};