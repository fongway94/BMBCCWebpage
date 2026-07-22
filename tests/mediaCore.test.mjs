// Tests for the shared media policy logic (node --test tests/).
// These validate the exact retention, quota, and reference rules enforced by
// both the admin UI and the /media Pages Function.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HARD_LIMIT_BYTES,
  WARNING_LIMIT_BYTES,
  TRASH_RETENTION_DAYS,
  UNUSED_REVIEW_DAYS,
  computeUsage,
  formatBytes,
  fileUrl,
  fileName,
  isR2Url,
  referenceMap,
  collectSiteUrls,
  usageLocations,
  isUnusedReviewEligible,
  purgeEligibility,
  sortFiles,
  filterFiles,
} from '../src/lib/mediaCore.js';

const BASE = 'https://media.example.org';
const DAY = 24 * 60 * 60 * 1000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

const rec = (overrides = {}) => ({
  key: 'images/website/2026/07/abc.webp',
  size: 1024 * 1024,
  category: 'images',
  contentType: 'image/webp',
  uploadedAt: iso(2 * DAY),
  ...overrides,
});

test('computeUsage: live-only accounting with Phase 1 fields preserved', () => {
  const records = [
    rec({ key: 'a', size: 100, category: 'images' }),
    rec({ key: 'b', size: 250, category: 'bulletins', contentType: 'application/pdf' }),
    rec({ key: 'c', size: 999, category: 'galleries', trash: true, trashAt: iso(1 * DAY) }),
  ];
  const usage = computeUsage(records);
  assert.equal(usage.used, 350);
  assert.equal(usage.count, 2);
  assert.equal(usage.byCategory.images, 100); // Phase 1 shape: bytes per category
  assert.equal(usage.byCategory.bulletins, 250);
  assert.equal(usage.byCategory.galleries, 0); // trashed not counted in quota
  assert.equal(usage.byCategoryCount.images, 1);
  assert.equal(usage.trashCount, 1);
  assert.equal(usage.trashUsed, 999);
  assert.equal(usage.hardLimit, HARD_LIMIT_BYTES);
  assert.equal(usage.warningLimit, WARNING_LIMIT_BYTES);
  assert.equal(usage.warning, false);
  assert.equal(usage.remaining, HARD_LIMIT_BYTES - 350);
});

test('computeUsage: warning state at 7 GB and hard-limit state at 9 GB', () => {
  const at5 = computeUsage([rec({ size: WARNING_LIMIT_BYTES })]);
  assert.equal(at5.warning, true);
  assert.equal(at5.hardLimitReached, false);
  const at7 = computeUsage([rec({ size: HARD_LIMIT_BYTES })]);
  assert.equal(at7.hardLimitReached, true);
  assert.equal(at7.remaining, 0);
  assert.equal(computeUsage([]).warning, false);
});

test('isR2Url: only the configured media domain matches; externals never do', () => {
  assert.equal(isR2Url(`${BASE}/images/website/2026/07/x.webp`, BASE), true);
  assert.equal(isR2Url('https://drive.google.com/thumbnail?id=123&sz=w2000', BASE), false);
  assert.equal(isR2Url('https://images.unsplash.com/photo-123', BASE), false);
  assert.equal(isR2Url('https://www.youtube.com/watch?v=abc', BASE), false);
  assert.equal(isR2Url('https://media.example.org.evil.com/x', BASE), false);
  assert.equal(isR2Url('', BASE), false);
  assert.equal(isR2Url(`${BASE}/x`, ''), false); // no base configured → nothing is R2
});

test('referenceMap: exact URL matches only', () => {
  const records = [rec({ key: 'images/website/2026/07/keep.webp' }), rec({ key: 'images/website/2026/07/unused.webp' })];
  const candidates = [
    `${BASE}/images/website/2026/07/keep.webp`,
    'https://drive.google.com/thumbnail?id=1', // external — ignored
  ];
  const map = referenceMap(records, candidates, BASE);
  assert.equal(map.get('images/website/2026/07/keep.webp'), true);
  assert.equal(map.get('images/website/2026/07/unused.webp'), false);
});

test('collectSiteUrls: walks nested bilingual data and labels locations', () => {
  const siteData = {
    settings: { headerLogo: `${BASE}/images/logos/2026/07/logo.webp`, churchName: { zh: '教会', en: 'Church' } },
    carousel: [{ id: 1, title: { zh: '欢迎', en: 'Welcome' }, image: 'https://images.unsplash.com/photo-1' }],
    events: [{ id: 7, title: { zh: '圣诞', en: 'Christmas' }, image: `${BASE}/galleries/events/2026/07/e.webp` }],
    bulletins: [{ id: 2, title: { zh: '家事', en: 'Bulletin' }, fileUrl: `${BASE}/bulletins/2026/07/b.pdf` }],
  };
  const urls = collectSiteUrls(siteData);
  const values = urls.map((u) => u.value);
  assert.ok(values.includes(`${BASE}/images/logos/2026/07/logo.webp`));
  assert.ok(values.includes('https://images.unsplash.com/photo-1'));
  const eventEntry = urls.find((u) => u.value.endsWith('e.webp'));
  assert.match(eventEntry.location.en, /Events/);
  assert.match(eventEntry.location.en, /Christmas/);

  const records = [rec({ key: 'galleries/events/2026/07/e.webp' })];
  const locations = usageLocations(records, urls, BASE);
  assert.equal(locations.get('galleries/events/2026/07/e.webp').length, 1);
});

test('purgeEligibility: only eligible trash after 30 days, never referenced files', () => {
  const now = Date.now();
  // Live file → never purgeable
  assert.equal(purgeEligibility(rec({}), { now }).eligible, false);
  // Fresh trash → within retention window
  const fresh = purgeEligibility(rec({ trash: true, trashAt: iso(5 * DAY) }), { now });
  assert.equal(fresh.eligible, false);
  assert.match(fresh.reason, /30 days/);
  assert.ok(fresh.eligibleAt);
  // Old trash → eligible
  const old = purgeEligibility(rec({ trash: true, trashAt: iso((TRASH_RETENTION_DAYS + 1) * DAY) }), { now });
  assert.equal(old.eligible, true);
  // Referenced trash → never eligible even after retention
  const referenced = purgeEligibility(rec({ trash: true, trashAt: iso(60 * DAY) }), { now, referenced: true });
  assert.equal(referenced.eligible, false);
  assert.match(referenced.reason, /referenced/);
});

test('purgeEligibility: protected categories require explicit override', () => {
  const now = Date.now();
  const trashedBulletin = rec({ category: 'bulletins', trash: true, trashAt: iso(60 * DAY) });
  assert.equal(purgeEligibility(trashedBulletin, { now }).eligible, false);
  assert.match(purgeEligibility(trashedBulletin, { now }).reason, /archival/);
  assert.equal(purgeEligibility(trashedBulletin, { now, overrideProtected: true }).eligible, true);

  const trashedGallery = rec({ category: 'galleries', key: 'galleries/events/2026/01/x.webp', trash: true, trashAt: iso(60 * DAY) });
  assert.equal(purgeEligibility(trashedGallery, { now }).eligible, false);
  assert.equal(purgeEligibility(trashedGallery, { now, overrideProtected: true }).eligible, true);
});

test('isUnusedReviewEligible: unattached uploads flag for review after 7 days only', () => {
  const now = Date.now();
  assert.equal(isUnusedReviewEligible(rec({ uploadedAt: iso(3 * DAY) }), { now, referenced: false }), false);
  assert.equal(isUnusedReviewEligible(rec({ uploadedAt: iso((UNUSED_REVIEW_DAYS + 1) * DAY) }), { now, referenced: false }), true);
  // Referenced uploads are never flagged, however old.
  assert.equal(isUnusedReviewEligible(rec({ uploadedAt: iso(90 * DAY) }), { now, referenced: true }), false);
  // Trashed files are handled by the trash flow, not the review flag.
  assert.equal(isUnusedReviewEligible(rec({ trash: true, uploadedAt: iso(90 * DAY) }), { now, referenced: false }), false);
});

test('sortFiles: newest, oldest, largest, smallest', () => {
  const files = [
    rec({ key: 'a', size: 300, uploadedAt: iso(10 * DAY) }),
    rec({ key: 'b', size: 100, uploadedAt: iso(1 * DAY) }),
    rec({ key: 'c', size: 200, uploadedAt: iso(5 * DAY) }),
  ];
  assert.deepEqual(sortFiles(files, 'newest').map((f) => f.key), ['b', 'c', 'a']);
  assert.deepEqual(sortFiles(files, 'oldest').map((f) => f.key), ['a', 'c', 'b']);
  assert.deepEqual(sortFiles(files, 'largest').map((f) => f.key), ['a', 'c', 'b']);
  assert.deepEqual(sortFiles(files, 'smallest').map((f) => f.key), ['b', 'c', 'a']);
});

test('filterFiles: search, category, trash state, and unused-only', () => {
  const referenced = new Map([['a', true], ['b', false], ['c', false], ['d', false]]);
  const reviewEligible = new Set(['d']);
  const files = [
    rec({ key: 'a', category: 'images' }),
    rec({ key: 'b', category: 'bulletins', contentType: 'application/pdf' }),
    rec({ key: 'c', category: 'images', trash: true, trashAt: iso(1 * DAY) }),
    rec({ key: 'd', category: 'galleries', uploadedAt: iso(30 * DAY) }),
  ];
  assert.deepEqual(filterFiles(files, { q: 'bulletins' }).map((f) => f.key), ['b']);
  assert.deepEqual(filterFiles(files, { q: '.pdf' }).map((f) => f.key), ['b']);
  assert.deepEqual(filterFiles(files, { category: 'images' }).map((f) => f.key), ['a', 'c']);
  assert.deepEqual(filterFiles(files, { trash: 'live' }).map((f) => f.key), ['a', 'b', 'd']);
  assert.deepEqual(filterFiles(files, { trash: 'trash' }).map((f) => f.key), ['c']);
  // Unused-only: unreferenced live uploads eligible for review (d), plus trashed unreferenced (c).
  assert.deepEqual(filterFiles(files, { unusedOnly: true, referenced, reviewEligible }).map((f) => f.key), ['c', 'd']);
});

test('formatBytes and file helpers', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 ** 3), '5.0 GB');
  assert.equal(fileUrl(BASE, 'images/website/2026/07/x.webp'), `${BASE}/images/website/2026/07/x.webp`);
  assert.equal(fileUrl(`${BASE}/`, 'k'), `${BASE}/k`);
  assert.equal(fileUrl('', 'k'), null);
  assert.equal(fileName('images/website/2026/07/uuid.webp'), 'uuid.webp');
});
