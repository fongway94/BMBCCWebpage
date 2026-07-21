// Cloudflare Pages Function: authenticated image uploads backed by R2.
// POST /image-upload with multipart field "image" to upload.
// GET /image-upload?key=... serves a previously uploaded image publicly.

export interface Env {
  JWT_SECRET: string;
  IMAGES: R2Bucket;
}

const COOKIE_NAME = 'bmbcc_admin';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function base64UrlDecode(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, signaturePart] = token.split('.');
    if (!header || !body || !signaturePart) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const padded = signaturePart + '='.repeat((4 - (signaturePart.length % 4)) % 4);
    const signature = Uint8Array.from(
      atob(padded.replace(/-/g, '+').replace(/_/g, '/')),
      (char) => char.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(`${header}.${body}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  if (!env.JWT_SECRET) return false;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const payload = await verifyToken(match[1], env.JWT_SECRET);
  return payload?.admin === true;
}

function hasAllowedFileSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.slice(0, 8).every((byte, i) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i]);
  if (type === 'image/gif') return new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' || new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a';
  if (type === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return false;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.IMAGES || !env.JWT_SECRET) {
    return json(request, { ok: false, error: 'Image uploads are not configured. Add the IMAGES R2 binding and JWT_SECRET.' }, 500);
  }
  if (!(await isAdmin(request, env))) {
    return json(request, { ok: false, error: 'Not authenticated' }, 401);
  }

  try {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) {
      return json(request, { ok: false, error: 'Choose an image to upload.' }, 400);
    }
    const extension = ALLOWED_IMAGE_TYPES[image.type];
    if (!extension) {
      return json(request, { ok: false, error: 'Only JPG, PNG, GIF, and WebP images are allowed.' }, 415);
    }
    if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
      return json(request, { ok: false, error: 'The image must be 10 MB or smaller.' }, 413);
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasAllowedFileSignature(bytes, image.type)) {
      return json(request, { ok: false, error: 'The selected file is not a valid image.' }, 415);
    }

    const now = new Date();
    const key = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`;
    await env.IMAGES.put(key, bytes, {
      httpMetadata: { contentType: image.type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { originalName: image.name.slice(0, 200) },
    });

    // Store a site-relative URL so an image uploaded on a Pages preview also
    // works on the production/custom domain after the content is published.
    const imageUrl = `/image-upload?key=${encodeURIComponent(key)}`;
    return json(request, { ok: true, url: imageUrl, key });
  } catch (error) {
    console.error('Image upload failed:', error);
    return json(request, { ok: false, error: 'The image could not be uploaded. Please try again.' }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.IMAGES) return new Response('Image storage is not configured.', { status: 500 });
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!/^images\/\d{4}\/\d{2}\/[0-9a-f-]+\.(jpg|png|gif|webp)$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
};
