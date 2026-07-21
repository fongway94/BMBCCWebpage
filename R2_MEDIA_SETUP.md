# Cloudflare R2 media setup

This is the media system: secure R2 image/PDF uploads alongside the existing URL fields (**Phase 1**), plus an authenticated Admin **Media Storage** manager with reference-aware cleanup (**Phase 2**). Existing Google Drive, Unsplash, YouTube, and other public URLs are deliberately untouched and are never treated as R2 media. Videos remain URL-only. Phase 2 is additive and independently deployable — it introduces no new bindings and changes no Phase 1 behavior.

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

## Retention model (Phase 1 + Phase 2)

DELETE means **move to trash in metadata**, never immediate R2 deletion — it is intentionally reversible. **Phase 2** adds the inventory UI, reference scanning against saved site data, restore, a 30-day reviewed purge, and unused-upload review. Permanent deletion is **always** a manual, explicitly confirmed admin action; nothing is ever deleted automatically. Historical bulletins and event galleries are protected and are never purged without an explicit override.

---

# Phase 2 — Admin "Media Storage" manager

## What Phase 2 adds

An authenticated **Media Storage** section in the Admin Console (sidebar → *Media Storage* / *媒体存储管理*). It is served entirely by the existing `/media` Pages Function and the existing HttpOnly `bmbcc_admin` session. **No new bindings, secrets, or environment variables are required** — Phase 2 reuses `MEDIA_BUCKET`, `MEDIA_INDEX`, `MEDIA_PUBLIC_URL`, `JWT_SECRET`, and `ADMIN_PASSWORD` exactly as Phase 1 configured them.

The manager shows:

- Total R2 storage used, remaining capacity up to 7 GB, and clear **5 GB warning** / **7 GB hard-limit** states.
- Total live file count, trash count and trash size, and a per-category breakdown (bytes + count).
- For each file: filename/key, image or PDF preview, size, category/media type, upload date, trash status, whether it is currently referenced by website content, and — when determinable — **where it is used** (section + item title + field).

Filters and actions:

- Search by filename/key/type; sort by newest, oldest, largest, smallest; filter by category and by live/trash state.
- **Find unused uploads** (unreferenced live uploads older than 7 days, plus unreferenced trash).
- **View where a file is used**, **copy the immutable media URL**, **move to trash**, **restore** a trashed file, and **manual permanent deletion** for eligible trash only.
- **Reconcile index** — a manual repair that lists the bucket once and re-syncs the KV metadata index.

## Endpoint surface (`/media`, all authenticated)

- `GET` — Phase 1 listing + usage (unchanged fields), plus additive Phase 2 fields: `remaining`, `byCategoryCount`, `trashCount`, `trashUsed`, `percentUsed`, `hardLimitReached`, and `lastScanAt`.
- `POST` `multipart/form-data` — Phase 1 upload (unchanged).
- `POST` `application/json` — Phase 2 actions: `{action:'scan', urls[]}`, `{action:'restore', key}`, `{action:'purge', key, confirm, overrideProtected?}`, `{action:'reconcile'}`.
- `DELETE` `{key}` — Phase 1 reversible move-to-trash (unchanged).

## Cleanup rules & limits (enforced server-side)

The retention policy lives in `src/lib/mediaCore.js` and is enforced **identically** by the API and the UI. The server re-validates every rule, so the browser can never bypass them:

1. **Only trashed objects can be permanently deleted.** Live files are never purgeable — move to trash first.
2. **Explicit confirmation required.** A purge must send the full object key back verbatim in `confirm`.
3. **Referenced files are never deleted.** A purge requires a fresh server-side reference scan (≤ 24h old) that does **not** reference the key. Changing a URL in an edit form only changes the *next* scan result — it never triggers a deletion.
4. **30-day trash retention.** Trashed media stays recoverable for at least `TRASH_RETENTION_DAYS = 30` days before it is even eligible.
5. **Protected archives.** `bulletins` (PDFs) and `galleries` (historical event galleries) require the explicit `overrideProtected` flag and are **never** deleted automatically.
6. **Unused uploads are only flagged**, never auto-deleted. Unreferenced live uploads older than `UNUSED_REVIEW_DAYS = 7` days are marked *Review* for human inspection.
7. **No blind deletions.** The system never deletes the oldest files, referenced files, or anything outside an explicit, confirmed admin purge.
8. **Capacity limits unchanged:** 5 GiB warning, 7 GiB hard upload ceiling. Usage counts live objects only; trash is reported separately.

## Reference scanning & external URLs

On opening the page (and via *Re-scan references*), the UI collects **every URL** from the currently saved site data (the localStorage / GitHub `initialData` model) and posts it to `{action:'scan'}`. Only an **exact** match of `${MEDIA_PUBLIC_URL}/${key}` counts as a reference. Google Drive, Unsplash, YouTube, and any other external URL can never match an R2 key, so external media is never misidentified, flagged, or touched. If `MEDIA_PUBLIC_URL` is not configured, reference detection and copy-URL are disabled and the UI says so.

## Operations guidance

- **Routine use costs nothing heavy.** Listing, usage, and reference scans read the KV index only — there is **no full R2 listing on page load**.
- **Use *Reconcile index* sparingly.** It is the only operation that performs a full bucket listing; run it only if the index and bucket drift apart (e.g. an object was edited directly in R2).
- **Deletion workflow:** Move to trash → wait out the 30-day retention → confirm the file is unreferenced (run a scan) → permanently delete. Protected categories additionally require the override checkbox.
- **Immutable URLs:** objects keep `Cache-Control: public, max-age=31536000, immutable`. Never rewrite or invalidate a URL — upload a replacement and save its new URL.

## Phase 3 — Fellowship Highlights operation

Fellowship Highlights is a **separate top-level array** (`fellowshipHighlights[]`) in the site data model, independent of the `events[]` announcements array.

- Each highlight entry contains `title`, `date`, `description`, and an `images[]` array.
- Any R2 media URL inside `images[]` is reported as **referenced by that highlight** during a reference scan.
- Removing a highlight (or an individual image URL from it) only **detaches** the R2 objects; they become unreferenced and follow the normal 30-day trash retention + manual purge workflow.
- Protected-category rules (`galleries`) apply to Fellowship Highlights just like historical event galleries.

**Upload limits** (enforced server-side via the existing `/media` endpoint):
- Maximum **100 images** per highlight.
- Maximum **100 MB** total R2 storage per highlight.
- Per-image limits follow the existing `galleries` category rules (8 MB pre-processing, optimized to WebP).

**Thumbnail behavior**: The client may request a thumbnail key (`<uuid>-thumb.webp`) alongside the full-size object. Both keys are stored under `galleries/events/YYYY/MM/`. The admin UI shows the first image as the card preview.

**Retention guidance**: Highlights are archival church records. They are covered by the `galleries` protected category and require the `overrideProtected` flag for permanent deletion, even after the 30-day trash period.

## Testing & validation

- `npm test` runs the Node test suite (`tests/mediaCore.test.mjs`) covering usage accounting, the 5 GB/7 GB states, external-URL exclusion, exact-match references, the 30-day purge policy, protected-category override, the 7-day unused-review rule, and search/sort/filter behavior.
- `npm run build` must pass; the `/media` function is bundled by Wrangler (esbuild) and inlines the shared `mediaCore.js` policy so the API and UI stay in lock-step.
- Manual check: `npm run build && npx wrangler pages dev dist --port 8788` (with `.dev.vars`), log in to the Admin Console, and open *Media Storage*.
