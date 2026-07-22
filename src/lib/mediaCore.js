// Shared, dependency-free media logic for the BMBCC R2 media system.
//
// This module is intentionally plain JavaScript with no React, DOM, or
// Cloudflare imports so it can be used by:
//   1. The browser admin UI (bundled by Vite via src/App.jsx)
//   2. The server-side Pages Function (bundled by Wrangler via functions/media.ts)
//   3. The Node test suite (node --test tests/)
//
// Keeping the eligibility/reference rules in one place guarantees the UI and
// the API enforce the exact same retention and cleanup policy.

// ---------------------------------------------------------------------------
// Limits & retention policy (Phase 1 quotas preserved; Phase 2 cleanup rules)
// ---------------------------------------------------------------------------

/** Hard operational ceiling for live (non-trash) media. 9 GiB. */
export const HARD_LIMIT_BYTES = 9 * 1024 ** 3;

/** Soft warning threshold shown in the admin UI and API status. 7 GiB. */
export const WARNING_LIMIT_BYTES = 7 * 1024 ** 3;

/** R2 upload categories. Videos are intentionally URL-only (no uploads). */
export const CATEGORIES = ['images', 'bulletins', 'galleries', 'logos', 'qrcodes'];

/**
 * Categories that must never be purged automatically and require an explicit
 * override even for manual permanent deletion: historical bulletin PDFs and
 * event galleries are archival church records.
 */
export const PROTECTED_CATEGORIES = ['bulletins', 'galleries'];

/** Trashed media must remain recoverable for at least this many days. */
export const TRASH_RETENTION_DAYS = 30;

/** Live uploads that were never referenced may be flagged for review after this many days. */
export const UNUSED_REVIEW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Basic helpers
// ---------------------------------------------------------------------------

/** Human-readable byte size, e.g. 1.4 MB. */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Trim a trailing slash from a base URL. */
export function normalizeBase(publicBase) {
  return String(publicBase || '').replace(/\/$/, '');
}

/** Full public URL for a stored object key (immutable; never rewritten). */
export function fileUrl(publicBase, key) {
  const base = normalizeBase(publicBase);
  if (!base || !key) return null;
  return `${base}/${key}`;
}

/** The short file name of a key, e.g. `images/website/2026/07/abc.webp` → `abc.webp`. */
export function fileName(key) {
  return String(key || '').split('/').pop() || String(key || '');
}

// ---------------------------------------------------------------------------
// Usage accounting (mirrors and extends the Phase 1 server-side usage())
// ---------------------------------------------------------------------------

/**
 * Compute live-only storage usage from metadata index records.
 * Trash records are counted separately so the quota reflects readable media.
 *
 * @param {Array<{key:string,size:number,category:string,trash?:boolean}>} records
 */
export function computeUsage(records) {
  const all = Array.isArray(records) ? records : [];
  const live = all.filter((r) => !r.trash);
  const trashed = all.filter((r) => r.trash);

  const byCategoryBytes = {};
  const byCategoryCount = {};
  for (const category of CATEGORIES) {
    byCategoryBytes[category] = 0;
    byCategoryCount[category] = 0;
  }
  for (const record of live) {
    const category = CATEGORIES.includes(record.category) ? record.category : 'images';
    byCategoryBytes[category] += Number(record.size) || 0;
    byCategoryCount[category] += 1;
  }

  const used = live.reduce((sum, r) => sum + (Number(r.size) || 0), 0);
  const trashUsed = trashed.reduce((sum, r) => sum + (Number(r.size) || 0), 0);

  return {
    used,
    count: live.length,
    // Phase 1 shape: byCategory maps category → bytes. Preserved exactly.
    byCategory: byCategoryBytes,
    byCategoryCount,
    trashCount: trashed.length,
    trashUsed,
    remaining: Math.max(0, HARD_LIMIT_BYTES - used),
    hardLimit: HARD_LIMIT_BYTES,
    warningLimit: WARNING_LIMIT_BYTES,
    warning: used >= WARNING_LIMIT_BYTES,
    hardLimitReached: used >= HARD_LIMIT_BYTES,
    percentUsed: Math.min(100, (used / HARD_LIMIT_BYTES) * 100),
  };
}

// ---------------------------------------------------------------------------
// Reference detection
// ---------------------------------------------------------------------------

/**
 * True when a candidate string is a URL pointing at the configured R2 media
 * domain. External URLs (Google Drive, Unsplash, YouTube, arbitrary public
 * URLs) never match — they are not R2 media and must not be treated as such.
 */
export function isR2Url(value, publicBase) {
  const base = normalizeBase(publicBase);
  if (!base || typeof value !== 'string') return false;
  return value === base || value.startsWith(`${base}/`);
}

/**
 * Match candidate URLs (collected from saved site data) against the media
 * index. Only exact matches of `${MEDIA_PUBLIC_URL}/${key}` count as a
 * reference, so editing an unrelated URL field never flags foreign media.
 *
 * @param {Array<{key:string}>} records
 * @param {Iterable<string>} candidateUrls
 * @param {string} publicBase
 * @returns {Map<string, boolean>} key → referenced
 */
export function referenceMap(records, candidateUrls, publicBase) {
  const base = normalizeBase(publicBase);
  const candidates = new Set();
  for (const value of candidateUrls || []) {
    if (typeof value === 'string' && value) candidates.add(value);
  }
  const map = new Map();
  for (const record of records || []) {
    const url = base && record.key ? `${base}/${record.key}` : null;
    map.set(record.key, Boolean(url && candidates.has(url)));
  }
  return map;
}

/**
 * Human-friendly section labels for the top-level keys of the site data
 * structure (localStorage / GitHub-saved initialData model).
 */
const SECTION_LABELS = {
  settings: { zh: '基本设置', en: 'Site Settings' },
  carousel: { zh: '横幅幻灯片', en: 'Banner Slides' },
  timetable: { zh: '聚会时间表', en: 'Service Timetable' },
  ministryTimetable: { zh: '事工时间表', en: 'Ministry Timetable' },
  cellGroupTimetable: { zh: '小组时间表', en: 'Cell Group Timetable' },
  ministries: { zh: '主要事工', en: 'Ministries' },
  events: { zh: '特别活动', en: 'Events' },
  bulletins: { zh: '家事', en: 'Bulletins' },
  sermons: { zh: '讲道', en: 'Sermons' },
  services: { zh: '崇拜与敬拜', en: 'Services & Worships' },
  cellGroups: { zh: '细胞小组', en: 'Cell Groups' },
  leadership: { zh: '牧者团队', en: 'Leadership' },
  offerings: { zh: '奉献', en: 'Offerings' },
  newFriendGuide: { zh: '新朋友指南', en: 'New Friend Guide' },
  maps: { zh: '地图', en: 'Maps' },
  pageVisibility: { zh: '页面显示设置', en: 'Page Visibility' },
};

const TITLE_FIELDS = ['title', 'name', 'churchName'];

function pickTitle(entry) {
  if (!entry || typeof entry !== 'object') return null;
  for (const field of TITLE_FIELDS) {
    const value = entry[field];
    if (typeof value === 'string' && value.trim()) return { zh: value.trim(), en: value.trim() };
    if (value && typeof value === 'object') {
      const zh = typeof value.zh === 'string' ? value.zh.trim() : '';
      const en = typeof value.en === 'string' ? value.en.trim() : '';
      if (zh || en) return { zh: zh || en, en: en || zh };
    }
  }
  return null;
}

/**
 * Recursively walk the saved website data structure and collect every string
 * value that looks like a URL, with a human-readable description of where it
 * is used. This covers localStorage content, GitHub-saved content, and any
 * imported backup with the same shape. External URLs are collected too (so
 * the UI can show them), but callers use isR2Url()/referenceMap() to decide
 * what is actually R2 media.
 *
 * @param {object} siteData
 * @returns {Array<{ path: string, value: string, sectionKey: string, location: {zh:string,en:string} }>}
 */
export function collectSiteUrls(siteData) {
  const results = [];
  if (!siteData || typeof siteData !== 'object') return results;

  const looksLikeUrl = (value) =>
    typeof value === 'string' &&
    value.length <= 4096 &&
    /^https?:\/\//i.test(value);

  const walk = (node, path, sectionKey, ownerObject) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      if (looksLikeUrl(node)) {
        const labels = SECTION_LABELS[sectionKey] || { zh: sectionKey, en: sectionKey };
        const ownerTitle = pickTitle(ownerObject);
        const indexMatch = path.match(/\[(\d+)\]/);
        const itemSuffix = indexMatch ? ` #${Number(indexMatch[1]) + 1}` : '';
        const fieldKey = path.split('.').pop().replace(/\[\d+\]/g, '');
        const suffixZh = ownerTitle ? `：${ownerTitle.zh}` : itemSuffix ? ` ${itemSuffix}` : '';
        const suffixEn = ownerTitle ? `: ${ownerTitle.en}` : itemSuffix ? ` ${itemSuffix}` : '';
        results.push({
          path,
          value: node,
          sectionKey,
          location: {
            zh: `${labels.zh}${suffixZh}（${fieldKey}）`,
            en: `${labels.en}${suffixEn} (${fieldKey})`,
          },
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`, sectionKey, item));
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key, sectionKey || key, path ? ownerObject : value);
      }
    }
  };

  walk(siteData, '', '', null);
  return results;
}

/**
 * Build key → usage-location list from collected site URLs.
 *
 * @param {Array<{key:string}>} records
 * @param {Array<{value:string, location:{zh:string,en:string}}>} siteUrls
 * @param {string} publicBase
 * @returns {Map<string, Array<{zh:string,en:string}>>}
 */
export function usageLocations(records, siteUrls, publicBase) {
  const base = normalizeBase(publicBase);
  const locations = new Map();
  if (!base) return locations;
  const keyByUrl = new Map();
  for (const record of records || []) {
    keyByUrl.set(`${base}/${record.key}`, record.key);
  }
  for (const entry of siteUrls || []) {
    const key = keyByUrl.get(entry.value);
    if (!key) continue; // external or unknown URL — never treated as R2 media
    if (!locations.has(key)) locations.set(key, []);
    locations.get(key).push(entry.location);
  }
  return locations;
}

// ---------------------------------------------------------------------------
// Cleanup eligibility policy
// ---------------------------------------------------------------------------

/**
 * Whether a live upload that is not referenced by the current site data may
 * be flagged "eligible for review" (never auto-deleted).
 *
 * @param {{uploadedAt?:string, trash?:boolean, category?:string}} record
 * @param {{ now?: number, referenced?: boolean }} ctx
 */
export function isUnusedReviewEligible(record, { now = Date.now(), referenced = false } = {}) {
  if (!record || record.trash) return false;
  if (referenced) return false;
  const uploadedAt = Date.parse(record.uploadedAt || '');
  if (Number.isNaN(uploadedAt)) return false;
  return now - uploadedAt >= UNUSED_REVIEW_DAYS * DAY_MS;
}

/**
 * Permanent-deletion eligibility for a media record. Permanent deletion is
 * only ever a manual, explicitly confirmed admin action; this function only
 * decides whether the action may be offered/accepted at all.
 *
 * Rules:
 *  - The record must be in the trash (live files are never purgeable).
 *  - Files still referenced by current site content are never purgeable.
 *  - Protected categories (bulletin PDFs, historical event galleries) are
 *    only purgeable with an explicit override flag.
 *  - Trashed media must have been in the trash for at least 30 days.
 *
 * @param {{key:string, trash?:boolean, trashAt?:string, category?:string}} record
 * @param {{ now?: number, referenced?: boolean, overrideProtected?: boolean }} ctx
 * @returns {{ eligible: boolean, reason: string, eligibleAt?: string }}
 */
export function purgeEligibility(record, { now = Date.now(), referenced = false, overrideProtected = false } = {}) {
  if (!record) return { eligible: false, reason: 'Media record not found.' };
  if (!record.trash) {
    return { eligible: false, reason: 'Only trashed media can be permanently deleted. Move it to trash first.' };
  }
  if (referenced) {
    return { eligible: false, reason: 'This file is still referenced by website content and cannot be deleted.' };
  }
  if (PROTECTED_CATEGORIES.includes(record.category) && !overrideProtected) {
    return {
      eligible: false,
      reason:
        record.category === 'bulletins'
          ? 'Bulletin PDFs are archival and protected from permanent deletion.'
          : 'Historical event galleries are protected from permanent deletion.',
    };
  }
  const trashAt = Date.parse(record.trashAt || '');
  if (Number.isNaN(trashAt)) {
    // Legacy trash records without a timestamp: treat conservatively as not yet eligible.
    return { eligible: false, reason: 'Trash date is unknown; retention cannot be verified.' };
  }
  const eligibleAt = trashAt + TRASH_RETENTION_DAYS * DAY_MS;
  if (now < eligibleAt) {
    return {
      eligible: false,
      reason: `Trashed media must remain recoverable for ${TRASH_RETENTION_DAYS} days.`,
      eligibleAt: new Date(eligibleAt).toISOString(),
    };
  }
  return { eligible: true, reason: 'Eligible for permanent deletion after the 30-day trash retention period.' };
}

// ---------------------------------------------------------------------------
// Client-side listing controls (search / sort / filter)
// ---------------------------------------------------------------------------

export const SORT_MODES = ['newest', 'oldest', 'largest', 'smallest'];

/**
 * @param {Array<object>} files
 * @param {'newest'|'oldest'|'largest'|'smallest'} mode
 */
export function sortFiles(files, mode) {
  const list = [...(files || [])];
  const byDateAsc = (a, b) => Date.parse(a.uploadedAt || 0) - Date.parse(b.uploadedAt || 0);
  switch (mode) {
    case 'oldest':
      return list.sort(byDateAsc);
    case 'largest':
      return list.sort((a, b) => (b.size || 0) - (a.size || 0));
    case 'smallest':
      return list.sort((a, b) => (a.size || 0) - (b.size || 0));
    case 'newest':
    default:
      return list.sort((a, b) => -byDateAsc(a, b));
  }
}

/**
 * @param {Array<object>} files
 * @param {{ q?:string, category?:string, trash?:'all'|'live'|'trash', unusedOnly?:boolean, referenced?: Map<string,boolean>, reviewEligible?: Set<string> }} opts
 */
export function filterFiles(files, opts = {}) {
  const { q = '', category = 'all', trash = 'all', unusedOnly = false, referenced = null, reviewEligible = null } = opts;
  const query = String(q).trim().toLowerCase();
  return (files || []).filter((file) => {
    if (category !== 'all' && file.category !== category) return false;
    if (trash === 'live' && file.trash) return false;
    if (trash === 'trash' && !file.trash) return false;
    if (unusedOnly) {
      const isReferenced = referenced ? referenced.get(file.key) : false;
      if (isReferenced) return false;
      // When "review eligible" information is available, restrict to those;
      // otherwise any unreferenced file matches.
      if (reviewEligible && !file.trash && !reviewEligible.has(file.key)) return false;
    }
    if (query) {
      const haystack = `${file.key || ''} ${file.category || ''} ${file.contentType || ''}`.toLowerCase();
      // Normalize dots/slashes so a search for ".pdf" also matches "application/pdf"
      // and "uuid.webp" matches "webp".
      const normalize = (s) => s.replace(/[./]+/g, ' ').replace(/\s+/g, ' ').trim();
      const normalizedQuery = normalize(query);
      if (!haystack.includes(query) && normalizedQuery && !normalize(haystack).includes(normalizedQuery)) return false;
    }
    return true;
  });
}
