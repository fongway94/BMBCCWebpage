import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOOKING_STATUS,
  addDaysISO,
  bookingInterval,
  bookingReference,
  bookingSummaryText,
  buildSlotGrid,
  buildTelLink,
  buildWhatsAppLink,
  countBookingsByDate,
  diffDaysISO,
  durationLabel,
  findConflicts,
  formatDateLong,
  formatTime12,
  intervalsOverlap,
  isValidDateISO,
  minutesToTime,
  normalizeWhatsAppNumber,
  parseTimeToMinutes,
  toPublicSlot,
  todayISO,
  validateBookingRequest,
  venueBookingsForDate,
} from '../src/lib/bookingCore.js';

/* ------------------------- time helpers ------------------------- */

test('parseTimeToMinutes accepts 24h times and rejects junk', () => {
  assert.equal(parseTimeToMinutes('08:00'), 480);
  assert.equal(parseTimeToMinutes('13:45'), 825);
  assert.equal(parseTimeToMinutes('00:00'), 0);
  assert.equal(parseTimeToMinutes('23:59'), 1439);
  assert.equal(parseTimeToMinutes('24:00'), null);
  assert.equal(parseTimeToMinutes('8:5'), null);
  assert.equal(parseTimeToMinutes('abc'), null);
  assert.equal(parseTimeToMinutes(undefined), null);
});

test('minutesToTime and formatTime12 round-trip', () => {
  assert.equal(minutesToTime(0), '00:00');
  assert.equal(minutesToTime(825), '13:45');
  assert.equal(formatTime12('00:30'), '12:30 AM');
  assert.equal(formatTime12('12:00'), '12:00 PM');
  assert.equal(formatTime12('13:45'), '1:45 PM');
  assert.equal(formatTime12('23:00'), '11:00 PM');
  assert.equal(formatTime12('nope'), 'nope');
});

test('durationLabel is bilingual', () => {
  assert.equal(durationLabel(1, 'zh'), '一小时');
  assert.equal(durationLabel(2, 'zh'), '两小时');
  assert.equal(durationLabel(3, 'zh'), '三小时');
  assert.equal(durationLabel(1, 'en'), '1 hour');
  assert.equal(durationLabel(4, 'en'), '4 hours');
});

/* ------------------------- date helpers ------------------------- */

test('dates are computed in Malaysia time (UTC+8)', () => {
  // 2026-10-05T17:30:00Z is already 2026-10-06 01:30 in Malaysia.
  assert.equal(todayISO(new Date('2026-10-05T17:30:00Z')), '2026-10-06');
  // 2026-10-05T15:59:00Z is still 2026-10-05 23:59 in Malaysia.
  assert.equal(todayISO(new Date('2026-10-05T15:59:00Z')), '2026-10-05');
});

test('date arithmetic handles month and year boundaries', () => {
  assert.equal(addDaysISO('2026-10-30', 2), '2026-11-01');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysISO('2026-03-01', -1), '2026-02-28');
  assert.equal(addDaysISO('2024-03-01', -1), '2024-02-29'); // leap year
  assert.equal(diffDaysISO('2026-10-01', '2026-10-05'), 4);
  assert.equal(diffDaysISO('2026-10-05', '2026-10-01'), -4);
});

test('isValidDateISO rejects impossible dates', () => {
  assert.equal(isValidDateISO('2026-10-05'), true);
  assert.equal(isValidDateISO('2026-02-30'), false);
  assert.equal(isValidDateISO('2026-2-5'), false);
  assert.equal(isValidDateISO('05-10-2026'), false);
});

test('formatDateLong is bilingual', () => {
  assert.equal(formatDateLong('2026-10-05', 'zh'), '2026年10月5日（星期一）');
  assert.equal(formatDateLong('2026-10-05', 'en'), 'Mon, 5 Oct 2026');
});

/* ------------------------- conflicts ------------------------- */

const approved = {
  id: 'a1',
  venueId: 'jabez-hall',
  date: '2026-10-10',
  startTime: '10:00',
  durationHours: 2,
  status: BOOKING_STATUS.APPROVED,
};

const pending = {
  id: 'p1',
  venueId: 'jabez-hall',
  date: '2026-10-10',
  startTime: '14:00',
  durationHours: 2,
  status: BOOKING_STATUS.PENDING,
};

const otherVenue = {
  id: 'a2',
  venueId: 'sanctuary',
  date: '2026-10-10',
  startTime: '10:00',
  durationHours: 2,
  status: BOOKING_STATUS.APPROVED,
};

test('intervalsOverlap uses half-open intervals', () => {
  assert.equal(intervalsOverlap(600, 720, 660, 780), true); // 10-12 vs 11-13
  assert.equal(intervalsOverlap(600, 720, 720, 780), false); // touching is fine
  assert.equal(intervalsOverlap(600, 720, 480, 600), false);
});

test('bookingInterval converts a booking to minutes', () => {
  assert.deepEqual(bookingInterval(approved), { start: 600, end: 720 });
  assert.equal(bookingInterval({ startTime: 'bad', durationHours: 1 }), null);
  assert.equal(bookingInterval({ startTime: '10:00', durationHours: 0 }), null);
});

test('findConflicts only blocks approved bookings of the same venue/date', () => {
  const candidate = { venueId: 'jabez-hall', date: '2026-10-10', startTime: '11:00', durationHours: 1 };
  const conflicts = findConflicts(candidate, [approved, pending, otherVenue]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].id, 'a1');

  // 09:00-10:00 touches the approved slot but does not overlap it.
  const touching = { venueId: 'jabez-hall', date: '2026-10-10', startTime: '09:00', durationHours: 1 };
  assert.equal(findConflicts(touching, [approved]).length, 0);

  // 09:30-10:30 overlaps by 30 minutes.
  const overlapping = { venueId: 'jabez-hall', date: '2026-10-10', startTime: '09:30', durationHours: 1 };
  assert.equal(findConflicts(overlapping, [approved]).length, 1);

  // A different day is free.
  const nextDay = { venueId: 'jabez-hall', date: '2026-10-11', startTime: '11:00', durationHours: 1 };
  assert.equal(findConflicts(nextDay, [approved]).length, 0);

  // Pending bookings only conflict when explicitly requested.
  const pendingCandidate = { venueId: 'jabez-hall', date: '2026-10-10', startTime: '14:30', durationHours: 1 };
  assert.equal(findConflicts(pendingCandidate, [pending]).length, 0);
  assert.equal(findConflicts(pendingCandidate, [pending], [BOOKING_STATUS.PENDING]).length, 1);
});

test('venueBookingsForDate filters by venue and date', () => {
  const list = [approved, pending, otherVenue];
  assert.equal(venueBookingsForDate(list, 'jabez-hall', '2026-10-10').length, 2);
  assert.equal(venueBookingsForDate(list, 'jabez-hall', '2026-10-11').length, 0);
  assert.equal(
    venueBookingsForDate(list, 'jabez-hall', '2026-10-10', [BOOKING_STATUS.APPROVED]).length,
    1
  );
});

/* ------------------------- slot grid ------------------------- */

test('buildSlotGrid marks approved, pending and free slots', () => {
  const slots = buildSlotGrid({
    openTime: '09:00',
    closeTime: '12:00',
    slotMinutes: 60,
    durationMinutes: 60,
    busy: [{ ...approved, startTime: '09:00', durationHours: 1 }],
  });

  assert.equal(slots.length, 3);
  assert.deepEqual(slots.map((slot) => slot.startTime), ['09:00', '10:00', '11:00']);
  assert.equal(slots[0].status, BOOKING_STATUS.APPROVED);
  assert.equal(slots[1].status, 'free');
  assert.equal(slots[2].status, 'free');

  const withPending = buildSlotGrid({
    openTime: '09:00',
    closeTime: '12:00',
    slotMinutes: 60,
    durationMinutes: 60,
    busy: [{ venueId: 'x', date: '2026-10-10', startTime: '10:00', durationHours: 1, status: BOOKING_STATUS.PENDING }],
  });
  assert.equal(withPending[1].status, BOOKING_STATUS.PENDING);
  assert.equal(withPending[0].status, 'free');
});

test('buildSlotGrid respects the chosen duration', () => {
  const slots = buildSlotGrid({ openTime: '08:00', closeTime: '12:00', slotMinutes: 30, durationMinutes: 120 });
  assert.equal(slots.length, 5); // 08, 08:30, 09, 09:30, 10 (each needs 2h before 12:00)
  assert.equal(slots[slots.length - 1].endTime, '12:00');
  assert.equal(buildSlotGrid({ openTime: '22:00', closeTime: '08:00' }).length, 0);
});

test('countBookingsByDate tallies approved and pending', () => {
  const counts = countBookingsByDate([approved, pending, otherVenue]);
  assert.deepEqual(counts['2026-10-10'], { total: 3, approved: 2, pending: 1 });
});

/* ------------------------- validation ------------------------- */

const config = { advanceDays: 2, openTime: '08:00', closeTime: '22:00', maxDurationHours: 4 };

const validValues = {
  name: '陈小明',
  phone: '012-3456789',
  email: 'member@example.com',
  venueId: 'jabez-hall',
  purpose: 'meeting',
  reason: '小组聚会',
  aircon: 'yes',
  date: '2026-10-10',
  startTime: '10:00',
  durationHours: 2,
  headcount: 20,
  leadersNotified: ['worship'],
  agree: true,
};

test('validateBookingRequest accepts a complete application', () => {
  const { ok, errors } = validateBookingRequest(validValues, config, { today: '2026-10-01' });
  assert.equal(ok, true, JSON.stringify(errors));
});

test('validateBookingRequest requires every mandatory field', () => {
  const { ok, errors } = validateBookingRequest({ agree: false }, config, { today: '2026-10-01' });
  assert.equal(ok, false);
  ['name', 'phone', 'venueId', 'purpose', 'reason', 'aircon', 'date', 'startTime', 'leadersNotified', 'agree']
    .forEach((field) => assert.ok(errors[field], `expected an error for ${field}`));
});

test('validateBookingRequest enforces the two-day advance rule', () => {
  const tooSoon = { ...validValues, date: '2026-10-02' };
  const { errors } = validateBookingRequest(tooSoon, config, { today: '2026-10-01' });
  assert.equal(errors.date, 'too_soon');

  const earliest = { ...validValues, date: '2026-10-03' };
  assert.equal(validateBookingRequest(earliest, config, { today: '2026-10-01' }).ok, true);
});

test('validateBookingRequest checks phone, email, duration and hours', () => {
  assert.equal(
    validateBookingRequest({ ...validValues, phone: '12' }, config, { today: '2026-10-01' }).errors.phone,
    'invalid_phone'
  );
  assert.equal(
    validateBookingRequest({ ...validValues, email: 'not-an-email' }, config, { today: '2026-10-01' }).errors.email,
    'invalid_email'
  );
  // Optional email may be empty.
  assert.equal(
    validateBookingRequest({ ...validValues, email: '' }, config, { today: '2026-10-01' }).ok,
    true
  );
  assert.equal(
    validateBookingRequest({ ...validValues, durationHours: 5 }, config, { today: '2026-10-01' }).errors.durationHours,
    'too_long'
  );
  assert.equal(
    validateBookingRequest({ ...validValues, startTime: '07:00' }, config, { today: '2026-10-01' }).errors.startTime,
    'outside_hours'
  );
  assert.equal(
    validateBookingRequest({ ...validValues, startTime: '21:00' }, config, { today: '2026-10-01' }).errors.durationHours,
    'past_closing'
  );
});

test('validateBookingRequest rejects an empty leader confirmation and long reasons', () => {
  assert.equal(
    validateBookingRequest({ ...validValues, leadersNotified: [] }, config, { today: '2026-10-01' }).errors.leadersNotified,
    'required'
  );
  assert.equal(
    validateBookingRequest({ ...validValues, reason: 'x'.repeat(501) }, config, { today: '2026-10-01' }).errors.reason,
    'too_long'
  );
});

test('validateBookingRequest honours an admin configured advance window', () => {
  const sameDay = { ...validValues, date: '2026-10-01' };
  assert.equal(validateBookingRequest(sameDay, { ...config, advanceDays: 0 }, { today: '2026-10-01' }).ok, true);
  assert.equal(validateBookingRequest(sameDay, { ...config, advanceDays: 2 }, { today: '2026-10-01' }).ok, false);
});

/* ------------------------- references & links ------------------------- */

test('bookingReference is stable in shape and unique-ish', () => {
  const ref = bookingReference('2026-10-05', () => 0);
  assert.equal(ref, 'VB-20261005-AAAA');
  assert.match(bookingReference('2026-10-05'), /^VB-\d{8}-[A-Z2-9]{4}$/);
});

test('normalizeWhatsAppNumber converts Malaysian numbers', () => {
  assert.equal(normalizeWhatsAppNumber('018-4663128'), '60184663128');
  assert.equal(normalizeWhatsAppNumber('+60 18-466 3128'), '60184663128');
  assert.equal(normalizeWhatsAppNumber('60184663128'), '60184663128');
  assert.equal(normalizeWhatsAppNumber(''), '');
});

test('buildWhatsAppLink and buildTelLink build usable links', () => {
  assert.equal(buildWhatsAppLink('018-4663128', 'Hi'), 'https://wa.me/60184663128?text=Hi');
  assert.equal(buildWhatsAppLink(''), '');
  assert.equal(buildTelLink('018-4663128'), 'tel:0184663128');
});

test('bookingSummaryText includes the key details', () => {
  const booking = {
    ...validValues,
    ref: 'VB-20261010-ABCD',
    venueLabel: { zh: '雅比斯副堂', en: 'Jabez Hall' },
    startTime: '10:00',
    durationHours: 2,
  };
  const zh = bookingSummaryText(booking, 'zh');
  assert.match(zh, /VB-20261010-ABCD/);
  assert.match(zh, /雅比斯副堂/);
  assert.match(zh, /10:00 AM - 12:00 PM/);
  const en = bookingSummaryText(booking, 'en');
  assert.match(en, /Jabez Hall/);
  assert.match(en, /Sat, 10 Oct 2026/);
});

test('toPublicSlot strips personal data', () => {
  const slot = toPublicSlot({ ...approved, name: 'Secret', phone: '0123456789', email: 'a@b.c' });
  assert.deepEqual(Object.keys(slot).sort(), ['date', 'durationHours', 'startTime', 'status', 'venueId']);
  assert.equal(slot.name, undefined);
  assert.equal(slot.phone, undefined);
});
