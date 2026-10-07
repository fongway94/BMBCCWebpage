// Pure, dependency-free helpers for the BMBCC venue booking feature.
//
// This module is shared by:
//   - the public booking page (src/components/VenueBookingPage.jsx)
//   - the admin review console (src/components/VenueBookingAdmin.jsx)
//   - the unit tests (tests/bookingCore.test.mjs)
//
// It intentionally has no React / DOM / Cloudflare imports so it can run in the
// browser, in Node, and inside the Pages Function logic review.

/** Allowed booking states. */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** Statuses that still occupy a slot (used for availability + conflict checks). */
export const ACTIVE_BOOKING_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.APPROVED];

/** Statuses that hard-block a new application (staff already approved the slot). */
export const BLOCKING_BOOKING_STATUSES = [BOOKING_STATUS.APPROVED];

// Malaysia (UTC+8). The church is in Bukit Mertajam, Penang.
export const MYT_OFFSET_MINUTES = 8 * 60;

export const DEFAULT_BOOKING_CONFIG = {
  advanceDays: 2,
  openTime: '08:00',
  closeTime: '22:00',
  slotMinutes: 30,
  maxDurationHours: 4,
  contactPhone: '018-4663128',
  whatsapp: '60184663128',
};

/* ------------------------------------------------------------------ *
 * Time helpers
 * ------------------------------------------------------------------ */

/**
 * Parse "HH:MM" (24h) into minutes after midnight.
 * Returns null for anything malformed.
 */
export function parseTimeToMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes after midnight -> "HH:MM" (24h). */
export function minutesToTime(totalMinutes) {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(Number(totalMinutes) || 0)));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "13:30" -> "1:30 PM". Invalid input is returned unchanged. */
export function formatTime12(value) {
  const mins = parseTimeToMinutes(value);
  if (mins === null) return String(value ?? '');
  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** Duration radio label, e.g. 2 -> "2 hours / 两小时". */
export function durationLabel(hours, lang = 'zh') {
  const value = Number(hours);
  if (!Number.isFinite(value)) return '';
  const zhNumbers = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' };
  if (lang === 'zh') {
    const zh = zhNumbers[value] || value;
    return `${zh}小时`;
  }
  return value === 1 ? '1 hour' : `${value} hours`;
}

/* ------------------------------------------------------------------ *
 * Date helpers (all date-only math is done in MYT / UTC to avoid drift)
 * ------------------------------------------------------------------ */

/** Date object -> MYT calendar date "YYYY-MM-DD". */
export function toDateISO(date = new Date()) {
  const shifted = new Date(date.getTime() + MYT_OFFSET_MINUTES * 60000);
  return shifted.toISOString().slice(0, 10);
}

/** MYT "today" as "YYYY-MM-DD". */
export function todayISO(now = new Date()) {
  return toDateISO(now);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateISO(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Add (or subtract) whole days to an ISO date string. */
export function addDaysISO(iso, days) {
  if (!isValidDateISO(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  return dt.toISOString().slice(0, 10);
}

/** Whole days from `fromISO` to `toISO` (positive when `toISO` is later). */
export function diffDaysISO(fromISO, toISO) {
  if (!isValidDateISO(fromISO) || !isValidDateISO(toISO)) return NaN;
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

const ZH_WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekdayIndex(iso) {
  if (!isValidDateISO(iso)) return 0;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "星期一" / "Mon". */
export function weekdayShort(iso, lang = 'zh') {
  const index = weekdayIndex(iso);
  return lang === 'zh' ? ZH_WEEKDAYS[index] : EN_WEEKDAYS[index];
}

/** "2026年10月5日（星期一）" / "Mon, 5 Oct 2026". */
export function formatDateLong(iso, lang = 'zh') {
  if (!isValidDateISO(iso)) return String(iso ?? '');
  const [y, m, d] = iso.split('-').map(Number);
  if (lang === 'zh') {
    return `${y}年${m}月${d}日（${ZH_WEEKDAYS[weekdayIndex(iso)]}）`;
  }
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${EN_WEEKDAYS[weekdayIndex(iso)]}, ${d} ${enMonths[m - 1]} ${y}`;
}

/** Short chip label: "10/5 星期一" / "Oct 5 Mon". */
export function formatDateChip(iso, lang = 'zh') {
  if (!isValidDateISO(iso)) return String(iso ?? '');
  const [, m, d] = iso.split('-').map(Number);
  if (lang === 'zh') return `${m}/${d} ${weekdayShort(iso, 'zh').replace('星期', '周')}`;
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${enMonths[m - 1]} ${d} ${weekdayShort(iso, 'en')}`;
}

/* ------------------------------------------------------------------ *
 * Interval / conflict helpers
 * ------------------------------------------------------------------ */

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** Booking -> { start, end } in minutes after midnight (null when unusable). */
export function bookingInterval(booking) {
  const start = parseTimeToMinutes(booking?.startTime);
  const durationHours = Number(booking?.durationHours);
  if (start === null || !Number.isFinite(durationHours) || durationHours <= 0) return null;
  return { start, end: start + Math.round(durationHours * 60) };
}

/** Candidate { startTime, durationHours } -> { start, end } minutes. */
export function candidateInterval(startTime, durationHours) {
  const start = parseTimeToMinutes(startTime);
  const hours = Number(durationHours);
  if (start === null || !Number.isFinite(hours) || hours <= 0) return null;
  return { start, end: start + Math.round(hours * 60) };
}

/**
 * Find bookings that clash with a candidate slot.
 * `statuses` defaults to approved-only blocking slots.
 */
export function findConflicts(candidate, bookings = [], statuses = BLOCKING_BOOKING_STATUSES) {
  const target = candidateInterval(candidate?.startTime, candidate?.durationHours);
  if (!target) return [];
  return bookings.filter((booking) => {
    if (!booking) return false;
    if (!statuses.includes(booking.status)) return false;
    if (candidate.venueId && booking.venueId !== candidate.venueId) return false;
    if (candidate.date && booking.date !== candidate.date) return false;
    const other = bookingInterval(booking);
    if (!other) return false;
    return intervalsOverlap(target.start, target.end, other.start, other.end);
  });
}

/** Bookings for one venue on one date (active statuses only by default). */
export function venueBookingsForDate(bookings = [], venueId, date, statuses = ACTIVE_BOOKING_STATUSES) {
  return bookings.filter(
    (booking) =>
      booking &&
      booking.venueId === venueId &&
      booking.date === date &&
      statuses.includes(booking.status)
  );
}

/* ------------------------------------------------------------------ *
 * Slot grid (used by the public availability calendar)
 * ------------------------------------------------------------------ */

/**
 * Build the 30-minute slot grid for one venue/day and tag each slot with the
 * worst status it touches: `approved` > `pending` > `free`.
 */
export function buildSlotGrid({ openTime, closeTime, slotMinutes = 30, durationMinutes = 60, busy = [] } = {}) {
  const open = parseTimeToMinutes(openTime);
  const close = parseTimeToMinutes(closeTime);
  const step = Math.max(15, Math.round(Number(slotMinutes) || 30));
  const duration = Math.max(step, Math.round(Number(durationMinutes) || 60));
  if (open === null || close === null || close <= open) return [];

  const approvedRanges = busy
    .filter((b) => b.status === BOOKING_STATUS.APPROVED)
    .map((b) => bookingInterval(b))
    .filter(Boolean);
  const pendingRanges = busy
    .filter((b) => b.status === BOOKING_STATUS.PENDING)
    .map((b) => bookingInterval(b))
    .filter(Boolean);

  const slots = [];
  for (let start = open; start + duration <= close; start += step) {
    const end = start + duration;
    const taken = approvedRanges.some((r) => intervalsOverlap(start, end, r.start, r.end));
    const waiting = !taken && pendingRanges.some((r) => intervalsOverlap(start, end, r.start, r.end));
    slots.push({
      start,
      end,
      startTime: minutesToTime(start),
      endTime: minutesToTime(end),
      label: `${formatTime12(minutesToTime(start))} - ${formatTime12(minutesToTime(end))}`,
      status: taken ? BOOKING_STATUS.APPROVED : waiting ? BOOKING_STATUS.PENDING : 'free',
    });
  }
  return slots;
}

/** Quick count of active bookings per date, for the day strip badges. */
export function countBookingsByDate(bookings = [], statuses = ACTIVE_BOOKING_STATUSES) {
  const counts = {};
  bookings.forEach((booking) => {
    if (!booking || !isValidDateISO(booking.date)) return;
    if (!statuses.includes(booking.status)) return;
    if (!counts[booking.date]) counts[booking.date] = { total: 0, approved: 0, pending: 0 };
    counts[booking.date].total += 1;
    if (booking.status === BOOKING_STATUS.APPROVED) counts[booking.date].approved += 1;
    if (booking.status === BOOKING_STATUS.PENDING) counts[booking.date].pending += 1;
  });
  return counts;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const PHONE_ALLOWED_RE = /^[+()\-\s\d]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate the public application form.
 * Returns { ok, errors } where errors is a map of field -> message code.
 * Message codes are rendered (and translated) by the form component.
 */
export function validateBookingRequest(values = {}, config = {}, { today = todayISO() } = {}) {
  const errors = {};
  const cfg = { ...DEFAULT_BOOKING_CONFIG, ...(config || {}) };
  const advanceDays = Math.max(0, Math.min(60, Number(cfg.advanceDays ?? 2)));
  const maxDuration = Math.max(1, Math.min(12, Number(cfg.maxDurationHours ?? 4)));

  const name = String(values.name ?? '').trim();
  if (!name) errors.name = 'required';
  else if (name.length > 80) errors.name = 'too_long';

  const phone = String(values.phone ?? '').trim();
  if (!phone) errors.phone = 'required';
  else if (!PHONE_ALLOWED_RE.test(phone) || phone.replace(/\D/g, '').length < 7) errors.phone = 'invalid_phone';

  const email = String(values.email ?? '').trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'invalid_email';
  if (email.length > 120) errors.email = 'too_long';

  const venueId = String(values.venueId ?? '').trim();
  if (!venueId) errors.venueId = 'required';

  const purpose = String(values.purpose ?? '').trim();
  if (!purpose) errors.purpose = 'required';

  const reason = String(values.reason ?? '').trim();
  if (!reason) errors.reason = 'required';
  else if (reason.length > 500) errors.reason = 'too_long';

  if (!['yes', 'no'].includes(values.aircon)) errors.aircon = 'required';

  const date = String(values.date ?? '').trim();
  if (!date) errors.date = 'required';
  else if (!isValidDateISO(date)) errors.date = 'invalid_date';
  else if (diffDaysISO(today, date) < advanceDays) errors.date = 'too_soon';
  else if (diffDaysISO(today, date) > 365) errors.date = 'too_far';

  const start = parseTimeToMinutes(values.startTime);
  const open = parseTimeToMinutes(cfg.openTime) ?? 0;
  const close = parseTimeToMinutes(cfg.closeTime) ?? 24 * 60 - 1;
  if (!values.startTime) errors.startTime = 'required';
  else if (start === null) errors.startTime = 'invalid_time';
  else if (start < open || start >= close) errors.startTime = 'outside_hours';

  const durationHours = Number(values.durationHours);
  if (!Number.isFinite(durationHours) || durationHours <= 0) errors.durationHours = 'required';
  else if (durationHours > maxDuration) errors.durationHours = 'too_long';
  else if (start !== null && start + durationHours * 60 > close) errors.durationHours = 'past_closing';

  if (values.headcount !== undefined && values.headcount !== '' && values.headcount !== null) {
    const headcount = Number(values.headcount);
    if (!Number.isFinite(headcount) || headcount < 1) errors.headcount = 'invalid_number';
    else if (headcount > 2000) errors.headcount = 'too_many';
  }

  const leadersNotified = Array.isArray(values.leadersNotified)
    ? values.leadersNotified.filter(Boolean)
    : [];
  if (leadersNotified.length === 0) errors.leadersNotified = 'required';

  if (values.agree !== true) errors.agree = 'required';

  return { ok: Object.keys(errors).length === 0, errors, advanceDays, maxDuration };
}

/* ------------------------------------------------------------------ *
 * Reference numbers
 * ------------------------------------------------------------------ */

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Human friendly reference, e.g. "VB-20261005-7K3M".
 * `random` can be injected for deterministic tests.
 */
export function bookingReference(dateISO = todayISO(), random = Math.random) {
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length) % REF_ALPHABET.length];
  }
  const compact = String(dateISO).replace(/-/g, '');
  return `VB-${compact}-${suffix}`;
}

/* ------------------------------------------------------------------ *
 * Messaging helpers (WhatsApp / tel links, used by the success panel and admin)
 * ------------------------------------------------------------------ */

/** Keep digits only, so a local 01x number becomes a wa.me compatible 60xxxxxxx. */
export function normalizeWhatsAppNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return `6${digits}`;
  return digits;
}

export function buildWhatsAppLink(number, message = '') {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return '';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

export function buildTelLink(number) {
  const digits = String(number ?? '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

/** Read { zh, en } labels safely (records may also carry flat legacy keys). */
function bilingualLabel(label, lang) {
  if (!label) return '';
  if (typeof label === 'string') return label;
  return label[lang] || label.zh || label.en || '';
}

/** Plain-text summary of one booking (used in WhatsApp messages + admin copy). */
export function bookingSummaryText(booking = {}, lang = 'zh') {
  const lines = lang === 'zh'
    ? [
        '【BMBCC 场地租借申请】',
        `编号：${booking.ref || '-'}`,
        `场地：${bilingualLabel(booking.venueLabel, 'zh') || booking.venueLabel_zh || booking.venueId || '-'}`,
        `日期：${formatDateLong(booking.date, 'zh')}`,
        `时间：${formatTime12(booking.startTime)} - ${formatTime12(minutesToTime((parseTimeToMinutes(booking.startTime) || 0) + Number(booking.durationHours || 0) * 60))}`,
        `时长：${durationLabel(booking.durationHours, 'zh')}`,
        `用途：${booking.purpose === 'meeting' ? '聚会用途' : '私人用途'}`,
        `冷气：${booking.aircon === 'yes' ? '是' : '否'}`,
        `人数：${booking.headcount || '-'}`,
        `申请人：${booking.name || '-'}`,
        `联络：${booking.phone || '-'}`,
        `原因：${booking.reason || '-'}`,
      ]
    : [
        '[BMBCC Venue Booking Application]',
        `Reference: ${booking.ref || '-'}`,
        `Venue: ${bilingualLabel(booking.venueLabel, 'en') || booking.venueLabel_en || booking.venueId || '-'}`,
        `Date: ${formatDateLong(booking.date, 'en')}`,
        `Time: ${formatTime12(booking.startTime)} - ${formatTime12(minutesToTime((parseTimeToMinutes(booking.startTime) || 0) + Number(booking.durationHours || 0) * 60))}`,
        `Duration: ${durationLabel(booking.durationHours, 'en')}`,
        `Purpose: ${booking.purpose === 'meeting' ? 'Meeting use' : 'Private use'}`,
        `Air conditioning: ${booking.aircon === 'yes' ? 'Yes' : 'No'}`,
        `Headcount: ${booking.headcount || '-'}`,
        `Applicant: ${booking.name || '-'}`,
        `Contact: ${booking.phone || '-'}`,
        `Reason: ${booking.reason || '-'}`,
      ];
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * Server payload sanitising (also used to keep public responses PII-free)
 * ------------------------------------------------------------------ */

/** Strip everything except slot information — safe to expose publicly. */
export function toPublicSlot(booking = {}) {
  return {
    venueId: booking.venueId,
    date: booking.date,
    startTime: booking.startTime,
    durationHours: Number(booking.durationHours) || 0,
    status: booking.status,
  };
}
