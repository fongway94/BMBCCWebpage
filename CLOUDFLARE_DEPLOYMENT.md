# 🚀 Cloudflare Pages Deployment Guide

Complete migration from GitHub Pages to Cloudflare Pages with edge authentication.

---

## 📋 Prerequisites

- GitHub repository: `fongway94/BMBCCWebpage`
- Cloudflare account (free)
- Node.js 18+ installed locally

---

## 🔧 Step 1: Generate Secrets

Run these commands locally to generate strong secrets:

```bash
# Admin password (server-side Cloudflare secret only)
openssl rand -base64 18
# Example output: jBbNtc+Vc0DLMcJj4UYvG7xW

# JWT secret for session signing
openssl rand -base64 32
# Example output: a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6
```

**Save both values securely.** You'll need them in the Cloudflare dashboard. They must not be committed or put in `VITE_*` variables.

---

## ☁️ Step 2: Cloudflare Pages Setup

### 2.1 Create Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. **Connect to Git** → Select `fongway94/BMBCCWebpage`
3. Configure build settings:

| Setting | Value |
|---------|-------|
| **Project name** | `bmbcc-webpage` (or your choice) |
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | *(leave empty)* |
| **Node.js version** | `18` (or `20`) |

4. Click **Save and Deploy**

### 2.2 Add Environment Variables

Go to **Settings** → **Environment variables** → **Add variable**:

| Variable Name | Value | Type |
|---------------|-------|------|
| `ADMIN_PASSWORD` | `jBbNtc+Vc0DLMcJj4UYvG7xW` (your generated password) | **Secret** |
| `JWT_SECRET` | `a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6` (your generated secret) | **Secret** |

⚠️ **Mark both as "Secret"** (encrypted, not visible in dashboard)

### 2.3 Trigger New Deploy

After adding env vars, go to **Deployments** → **Retry deployment** (or push a new commit).

---

## 🔐 Step 3: Verify Authentication Works

1. Visit your deployment URL: `https://bmbcc-webpage.pages.dev`
2. Navigate to `/#/admin` (or click Admin button if visible)
3. Enter the **exact password** from `ADMIN_PASSWORD`
4. Should log in successfully with HttpOnly cookie session

**Test session persistence:**
- Refresh page → should stay logged in
- Open in incognito → should require login
- Close browser, reopen → should stay logged in (24hr cookie)

---

## 🌐 Step 4: Custom Domain (Optional)

### 4.1 Add Domain in Cloudflare

1. Pages project → **Custom domains** → **Add custom domain**
2. Enter: `bmbcc.example.com` (your domain)
3. Cloudflare will auto-add DNS records if domain is on Cloudflare
4. If external DNS: Add CNAME record pointing to `bmbcc-webpage.pages.dev`

### 4.2 Verify HTTPS

- Cloudflare auto-provisions SSL (Let's Encrypt)
- Wait for "Active" status (usually < 5 minutes)
- Test: `https://bmbcc.example.com/#/admin`

---

## 📝 Step 5: Local Development

### 5.1 Environment File

```bash
cp .env.example .env.local
# Optional: edit only public Vite defaults such as VITE_GITHUB_REPO.
# Do not put passwords or tokens in VITE_* variables.

cp .dev.vars.example .dev.vars
# Edit .dev.vars with local ADMIN_PASSWORD and JWT_SECRET for Wrangler.
```

### 5.2 Run Dev Server

```bash
npm run dev
# Opens http://localhost:5173
```

**Note:** `npm run dev` serves only the Vite app; Cloudflare Pages Functions are not available there. For admin login and full edge-auth testing, build and run with **Wrangler**:

```bash
npm run build
npx wrangler pages dev dist --port 8788
# Opens http://localhost:8788 with edge functions
```

---

## 🔄 Step 6: Deployment Workflow

### Daily Usage

```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Build & verify
npm run build

# 4. Commit & push
git add .
git commit -m "Update: description of changes"
git push origin main

# 5. Cloudflare Pages auto-deploys on push
# 6. Check deployment at: https://dash.cloudflare.com/pages
```

### Content Edits Cost Zero Builds (Runtime Data Loading)

The site loads the latest published site data (`src/data/initialData.js`) directly from
GitHub's raw CDN at runtime, so **admin panel saves go live for all visitors within
~5 minutes — no Cloudflare build required**. This keeps content edits from consuming
the Cloudflare Pages build quota (500 builds/month on Free).

**One-time setup — exclude the data file from triggering builds:**

1. Cloudflare Dashboard → **Pages** → your project → **Settings** → **Builds & deployments**
2. Under **Build watch paths**, click **Configure** / **Edit**
3. Set:
   - **Include paths**: `*`
   - **Exclude paths**: `src/data/initialData.js`
4. **Save**

**How it behaves after this:**

| Push type | Builds? | Visitors see it |
|-----------|---------|-----------------|
| Auto-save from admin panel (data only) | ❌ Skipped | Within ~5 min (CDN cache) |
| Code change (any other file) | ✅ Yes | After deploy (~2 min) |
| Code + data in the same push | ✅ Yes | After deploy (~2 min) |

**Fallback safety:** if GitHub raw is unreachable or the data is invalid, visitors
silently receive the data bundled at the last build. In the admin's own browser,
the local working copy (localStorage) always takes precedence over remote data.

⚠️ **The repository must stay public** for runtime loading to work. If you ever make
it private, visitors fall back to bundled (possibly stale) content — temporarily
remove the build watch path exclusion until it is public again.

### Password Rotation

**To change admin password:**

1. Generate new password: `openssl rand -base64 18`
2. Cloudflare Dashboard → Pages → `bmbcc-webpage` → Settings → Environment variables
3. Update `ADMIN_PASSWORD` secret
4. **Save** → Triggers automatic redeploy
5. Wait 1-2 minutes for deploy
6. All browsers/devices now use new password

---

## 🛠️ Troubleshooting

### Build Fails

| Error | Solution |
|-------|----------|
| Blank page / assets 404 | Confirm `vite.config.js` has `base: '/'` and redeploy current `main` |
| Auth says not configured | Add `ADMIN_PASSWORD` and `JWT_SECRET` secrets in Cloudflare Pages Settings |
| Build fails | Run `npm ci` then `npm run build`; no admin password is required at build time |
| Function route 404 | Ensure `functions/functions/auth.ts` exists for `/functions/auth` and `functions/auth.ts` exists for `/auth` compatibility |

### Auth Not Working

| Symptom | Check |
|---------|-------|
| Login returns 401 | Verify `ADMIN_PASSWORD` matches exactly |
| Login returns 429 | Too many failed attempts; wait for the rate-limit window |
| Cookie not set | Check the site is served over HTTPS and browser cookies are allowed |
| Session lost on refresh | Verify `JWT_SECRET` is set and unchanged between deployments |
| Auth endpoint 404 | Test `/functions/auth`; the wrapper in `functions/functions/auth.ts` must be deployed |

### Debug Commands

```bash
# Check build output locally
npm run build && npx serve dist

# Test edge function locally
wrangler pages dev dist --port 8788

# View Cloudflare Pages logs
# Dashboard → Pages → bmbcc-webpage → Deployments → View logs
```

---

## 📁 File Structure Summary

```
BMBCCWebpage/
├── functions/
│   ├── auth.ts              # Shared edge authentication handler (/auth)
│   └── functions/
│       └── auth.ts          # /functions/auth route wrapper
├── public/
│   ├── _headers             # Security headers + CORS
│   └── _redirects           # Notes: Pages built-in SPA fallback; no wildcard loop
├── src/
│   └── App.jsx              # Updated to use /functions/auth
├── wrangler.toml            # Cloudflare Pages config
├── .env.example             # Template for local dev
├── .env.local               # Optional public Vite defaults (gitignored)
├── .dev.vars                # Local Wrangler secrets (gitignored)
├── CLOUDFLARE_DEPLOYMENT.md # This guide
└── SECURITY_FEATURES.md     # Security documentation
```

---

## 🔒 Security Notes

| Feature | Implementation |
|---------|----------------|
| **Password storage** | Only in Cloudflare encrypted env vars / `.dev.vars` locally (never in repo or browser bundle) |
| **Session** | HttpOnly, Secure, SameSite=Lax cookie (24hr) |
| **JWT signing** | HS256 with `JWT_SECRET` (edge runtime) |
| **Rate limiting** | Server-side in `auth.ts` (5 attempts → 15min lockout) |
| **Headers** | CSP-ready, X-Frame-Options, XSS protection |
| **GitHub PAT** | Optional; entered in admin UI and stored only in that browser's localStorage. Never commit or set as `VITE_GITHUB_PAT`. |

---

## 📞 Support

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Pages Functions**: https://developers.cloudflare.com/pages/functions/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

**Last Updated**: 2026-07-15
**Repository**: `fongway94/BMBCCWebpage`
**Production URL**: `https://bmbcc-webpage.pages.dev` (or custom domain)