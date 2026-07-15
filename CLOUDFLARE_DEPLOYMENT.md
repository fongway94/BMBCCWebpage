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
# Admin password (use SAME value in both places)
openssl rand -base64 18
# Example output: jBbNtc+Vc0DLMcJj4UYvG7xW

# JWT secret for session signing
openssl rand -base64 32
# Example output: a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6
```

**Save both values!** You'll need them in Cloudflare dashboard.

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

4. Click **Save and Deploy** (first deploy will fail without env vars - that's OK)

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
# Edit .env.local with your VITE_ADMIN_PASSWORD (same as ADMIN_PASSWORD)
```

### 5.2 Run Dev Server

```bash
npm run dev
# Opens http://localhost:5173
```

**Note:** Local dev uses localStorage auth (no edge function). For full local testing with edge auth, use **Wrangler**:

```bash
npm install -g wrangler
wrangler pages dev dist --port 8788
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
| `ADMIN_PASSWORD not set` | Add env var in Cloudflare Pages Settings |
| `JWT_SECRET not set` | Add env var in Cloudflare Pages Settings |
| `Module not found: functions/auth` | Ensure `functions/auth.ts` exists in repo root |

### Auth Not Working

| Symptom | Check |
|---------|-------|
| Login returns 401 | Verify `ADMIN_PASSWORD` matches exactly |
| Cookie not set | Check browser allows 3rd party cookies / not in incognito |
| Session lost on refresh | Verify `JWT_SECRET` is set and consistent |
| CORS errors | Check `_headers` has `Access-Control-Allow-Credentials: true` |

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
│   └── auth.ts              # Edge authentication handler
├── public/
│   ├── _headers             # Security headers + CORS
│   └── _redirects           # SPA routing + API passthrough
├── src/
│   └── App.jsx              # Updated to use /functions/auth
├── wrangler.toml            # Cloudflare Pages config
├── .env.example             # Template for local dev
├── .env.local               # Your local secrets (gitignored)
├── CLOUDFLARE_DEPLOYMENT.md # This guide
└── SECURITY_FEATURES.md     # Security documentation
```

---

## 🔒 Security Notes

| Feature | Implementation |
|---------|----------------|
| **Password storage** | Only in Cloudflare encrypted env vars (never in repo) |
| **Session** | HttpOnly, Secure, SameSite=Lax cookie (24hr) |
| **JWT signing** | HS256 with `JWT_SECRET` (edge runtime) |
| **Rate limiting** | Server-side in `auth.ts` (5 attempts → 15min lockout) |
| **Headers** | CSP-ready, X-Frame-Options, XSS protection |
| **GitHub PAT** | Still client-side in localStorage (optional feature) |

---

## 📞 Support

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Pages Functions**: https://developers.cloudflare.com/pages/functions/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

**Last Updated**: 2026-07-15
**Repository**: `fongway94/BMBCCWebpage`
**Production URL**: `https://bmbcc-webpage.pages.dev` (or custom domain)