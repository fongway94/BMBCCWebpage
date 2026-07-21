# Cloudflare R2 media setup

This is phase 1 of the media system: secure R2 image/PDF uploads alongside the existing URL fields. Existing Google Drive, Unsplash, YouTube, and other public URLs are deliberately untouched. Videos remain URL-only.

## Create and bind storage

1. In Cloudflare **R2**, create a bucket named `bmbcc-media` (or change `bucket_name` in `wrangler.toml`).
2. In **Workers & Pages → KV**, create `bmbcc-media-index`.
3. Pages project → **Settings → Functions**: bind the R2 bucket as `MEDIA_BUCKET`, and the new KV namespace as `MEDIA_INDEX`. Keep the existing `GITHUB_SETTINGS` binding.
4. Pages project → **Settings → Environment variables**: add `MEDIA_PUBLIC_URL=https://media.example.org` as a plain server-side variable for Preview and Production. It is a public URL, not a credential. `ADMIN_PASSWORD` and `JWT_SECRET` remain Secrets.
5. Add `media.example.org` under the R2 bucket’s **Custom Domains** tab, then create/accept the Cloudflare DNS record and wait for HTTPS to become active. Do not use `r2.dev` in production.

The function writes immutable keys such as `images/website/2026/07/<uuid>.webp`, `galleries/events/2026/07/<uuid>.webp`, and `bulletins/2026/07/<uuid>.pdf`. Source/content data remains in GitHub/localStorage; only uploaded binaries are in R2.

## Security and validation

`/media` validates the existing HttpOnly `bmbcc_admin` session for **every** listing, upload, and trash operation. The browser never receives R2 credentials. Uploads accept JPEG, PNG, and WebP only after magic-byte validation; SVG and video uploads are rejected. PDFs must have both the PDF category and `%PDF-` signature. PDFs are stored with `application/pdf`, inline disposition, nosniff, and immutable caching.

The upload control optimizes JPEG photos in-browser before transmission: max 2200px long edge, WebP quality .82, and a re-encode that removes EXIF/GPS. PNG/WebP is retained for graphics, logos, and QR codes. The server enforces original received size limits: ordinary images 5 MB, events 8 MB, logos/QR 2 MB, bulletins 15 MB.

## Capacity and cache

The metadata index tracks R2 uploads only (external URLs are never counted). Uploads warn at 5 GiB in the API status and reject a request that would pass 7 GiB; existing objects stay readable. This is a small-church operational guard, not a replacement for a transactional database—avoid concurrent bulk uploads.

Set a Cloudflare Cache Rule for `media.example.org/*`: **Cache Everything**, Edge TTL one year (or respect origin), Browser TTL one year. Objects already send `Cache-Control: public, max-age=31536000, immutable`, so cached reads avoid repeated R2 Class B operations. Never invalidate immutable URLs; upload a replacement and save its new URL.

## Local and deployment

For function testing use `npm run build` then `npx wrangler pages dev dist --port 8788`, with `.dev.vars` copied from `.dev.vars.example`. Wrangler local R2/KV bindings may be configured with `--local` or dashboard remote bindings. Bind the same resources in both Preview and Production; preview URLs can call their own `/media` function while returned assets use the configured custom media domain.

## Retention roadmap

DELETE currently means **move to trash in metadata**, never immediate R2 deletion. It is intentionally reversible. The next independently deployable phase adds inventory, reference scanning against saved site data, restore, 30-day reviewed purge, and unused-upload review. Historical bulletins and galleries must not be automatically purged.
