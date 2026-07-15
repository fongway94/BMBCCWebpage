# 🔒 Security Features / 安全功能说明

## Overview / 功能概述

This site now targets **Cloudflare Pages + Pages Functions** for admin authentication.

Implemented protections:

1. **Hidden admin entry** — the login button is hidden by default; admins can still use `/#/admin`.
2. **Server-side authentication** — passwords are verified by Cloudflare Pages Functions, not in browser JavaScript.
3. **HttpOnly session cookie** — signed JWT session stored in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
4. **Rate limiting** — 5 failed attempts trigger a 15-minute lockout per edge-isolate/IP bucket.
5. **SPA routing** — Cloudflare Pages serves `index.html` for not-found app routes when no `404.html` exists; `_redirects` documents this without adding a wildcard loop.
6. **Cloudflare-safe asset paths** — Vite uses `base: '/'`, so deployed assets load from `/assets/...` instead of `/BMBCCWebpage/assets/...`.
7. **Security headers** — CSP, frame blocking, MIME sniffing protection, referrer policy, and permission policy.
8. **No committed secrets** — admin password, JWT secret, and GitHub PAT values must not be committed or placed in `VITE_*` variables.

---

## Authentication Architecture / 认证架构

```text
Admin opens /#/admin
        │
        ▼
React app POSTs /functions/auth with credentials: include
        │
        ▼
Cloudflare Pages Function
        ├─ Checks ADMIN_PASSWORD secret
        ├─ Rate-limits failed attempts
        ├─ Signs HS256 JWT with JWT_SECRET
        └─ Sets HttpOnly Secure SameSite=Lax cookie
        │
        ▼
React app GETs /functions/auth to verify future sessions
```

Routes:

- `functions/functions/auth.ts` exposes `/functions/auth` for the React app.
- `functions/auth.ts` contains the shared implementation and also supports `/auth` as a compatibility route.

---

## Required Cloudflare Secrets / Cloudflare 必需密钥

Cloudflare Pages → project → **Settings** → **Environment variables**:

| Variable | Type | How to generate |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | `openssl rand -base64 18` |
| `JWT_SECRET` | Secret | `openssl rand -base64 32` |

Do **not** create `VITE_ADMIN_PASSWORD`. Vite variables are public in the browser bundle.

Password rotation:

1. Generate a new password with `openssl rand -base64 18`.
2. Update the `ADMIN_PASSWORD` secret in Cloudflare Pages.
3. Save and redeploy/retry deployment.
4. Existing sessions remain valid until JWT expiry unless `JWT_SECRET` is also rotated.

---

## Local Testing / 本地测试

For static UI work only:

```bash
npm ci
npm run dev
```

For admin login and Pages Functions:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars with local ADMIN_PASSWORD and JWT_SECRET
npm run build
npx wrangler pages dev dist --port 8788
```

Then test `http://localhost:8788/#/admin`.

---

## Security Headers / 安全响应头

`public/_headers` applies these main protections:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Limits scripts, frames, connections, and object loading |
| `X-Frame-Options: DENY` | Clickjacking protection |
| `X-Content-Type-Options: nosniff` | MIME sniffing protection |
| `Referrer-Policy: strict-origin-when-cross-origin` | Reduces referrer leakage |
| `Permissions-Policy` | Disables camera, microphone, and geolocation |

Function responses also set `Cache-Control: no-store` and same-origin credential headers when needed.

---

## GitHub Auto-Save Token / GitHub 自动保存 Token

The optional GitHub auto-save feature uses a Fine-grained PAT entered in the admin UI. The token is stored only in that browser's `localStorage` and sent to `https://api.github.com`.

Best practices:

- Use a Fine-grained token.
- Grant access only to `fongway94/BMBCCWebpage`.
- Grant only Contents read/write permission.
- Set an expiry date.
- Never put a PAT in `.env.example`, `.env.local`, or any `VITE_*` variable.

---

## Troubleshooting / 故障排除

| Symptom | Check |
|---|---|
| Blank page on Cloudflare | Confirm deployed commit has `vite.config.js` with `base: '/'`; check browser console for asset 404s |
| Auth endpoint 404 | Confirm `functions/functions/auth.ts` is deployed and test `/functions/auth` |
| Login 401 | Confirm `ADMIN_PASSWORD` matches exactly |
| Login 429 | Wait for the 15-minute rate-limit window |
| Session lost on refresh | Confirm `JWT_SECRET` is set and stable between deployments |
| Admin login unavailable locally | Use `npx wrangler pages dev dist --port 8788`, not only `npm run dev` |

---

## Related Files / 相关文件

| File | Purpose |
|---|---|
| `functions/auth.ts` | Shared Cloudflare auth implementation |
| `functions/functions/auth.ts` | `/functions/auth` route wrapper |
| `src/App.jsx` | Calls `/functions/auth` with `credentials: 'include'` |
| `src/data/initialData.js` | Public content only; no admin password |
| `public/_headers` | Security headers |
| `public/_redirects` | Documents Cloudflare Pages built-in SPA fallback; avoids invalid wildcard rewrites |
| `vite.config.js` | Cloudflare root asset base |
| `wrangler.toml` | Cloudflare Pages config |
| `.env.example` | Public Vite env template only |
| `.dev.vars.example` | Local Wrangler secret template |

**Last updated:** 2026-07-15
