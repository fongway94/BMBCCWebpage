// Interaction tests for the public venue booking form.
//
// A real DOM (jsdom) drives the actual React component while `fetch` is mocked,
// so the member-facing flow is verified end to end:
//   pick date/venue -> see availability -> fill in -> submit -> reference shown.
// It also proves the double-booking rules really disable/guard the form.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build, stop as stopEsbuild } from 'esbuild';
import { JSDOM } from 'jsdom';
import { initialData } from '../src/data/initialData.js';

/* ------------------------- environment + harness ------------------------- */

async function bundleFixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'bmbcc-dom-'));
  const outfile = path.join(dir, 'fixture.mjs');
  await build({
    entryPoints: [path.join(process.cwd(), 'tests/fixtures/venueBookingDom.jsx')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://bmbcc.test/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.Node = dom.window.Node;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.IS_REACT_ACT_ENVIRONMENT = true;

const { mod: harness, cleanup } = await bundleFixture();
test.after(async () => {
  // jsdom + esbuild keep timers/service handles alive; without releasing them the
  // test runner would never exit even though every assertion passed.
  dom.window.close();
  await cleanup();
  stopEsbuild();
});

const { act } = harness;

const ADVANCE_DAYS = initialData.venueBooking.advanceDays;

function isoOffset(days) {
  const myt = new Date(Date.now() + 8 * 3600 * 1000 + days * 86400000);
  return myt.toISOString().slice(0, 10);
}

const TARGET_DATE = isoOffset(ADVANCE_DAYS + 3);

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

/** Install a fetch mock that records every call. */
function mockFetch({ busy = [], postStatus = 201, postBody } = {}) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    if ((options.method || 'GET') === 'POST') {
      return jsonResponse(postStatus, postBody ?? {
        ok: true,
        booking: {
          id: 'test-1',
          ref: 'VB-TEST-0001',
          status: 'pending',
          venueId: 'jabez-hall',
          venueLabel: { zh: '雅比斯副堂', en: 'Jabez Hall' },
          date: TARGET_DATE,
          startTime: '15:00',
          endTime: '16:00',
          durationHours: 1,
          aircon: 'yes',
          name: '陈小明',
          phone: '012-3456789',
        },
      });
    }
    return jsonResponse(200, { ok: true, bookings: busy });
  };
  return calls;
}

async function mount(props = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    harness.mountPage(container, { ...initialData, ...props.data }, props.lang || 'zh');
    await Promise.resolve();
  });
  // Let the availability request resolve and re-render.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return container;
}

/* ------------------------- DOM helpers ------------------------- */

function setNativeValue(element, value) {
  const proto = element.tagName === 'TEXTAREA'
    ? dom.window.HTMLTextAreaElement.prototype
    : element.tagName === 'SELECT'
    ? dom.window.HTMLSelectElement.prototype
    : dom.window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

async function click(element) {
  assert.ok(element, 'expected an element to click');
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

function field(container, name) {
  return container.querySelector(`[data-field="${name}"]`);
}

function buttonWithText(container, text) {
  return [...container.querySelectorAll('button')].find((btn) => btn.textContent.includes(text));
}

function slotButton(container, label) {
  return [...container.querySelectorAll('button')].find((btn) => btn.textContent.trim() === label);
}

async function fillForm(container, { name = '陈小明', phone = '012-3456789', reason = '小组聚会' } = {}) {
  await act(async () => {
    setNativeValue(field(container, 'name').querySelector('input'), name);
    setNativeValue(field(container, 'phone').querySelector('input'), phone);
    setNativeValue(field(container, 'reason').querySelector('textarea'), reason);
    setNativeValue(field(container, 'venueId').querySelector('select'), 'jabez-hall');
  });
  await click(buttonWithText(field(container, 'purpose'), '聚会用途'));
  await click(buttonWithText(field(container, 'aircon'), '是'));
  await act(async () => {
    setNativeValue(field(container, 'date').querySelector('input'), TARGET_DATE);
  });
}

/* ------------------------- tests ------------------------- */

test('member flow: fill the form, submit, and receive a reference number', async () => {
  const calls = mockFetch();
  const container = await mount();

  // The rules and the venue list from the Google Form are rendered.
  assert.match(container.textContent, /场地申请规则/);
  assert.match(container.textContent, /雅比斯副堂/);

  await fillForm(container);

  // Pick the 3:00 PM slot from the availability grid.
  const slot = slotButton(container, '3:00 PM');
  assert.ok(slot, 'expected a 3:00 PM slot button');
  assert.equal(slot.disabled, false);
  await click(slot);

  // Confirm the leaders were notified and agree to the rules.
  await click(field(container, 'leadersNotified').querySelector('input[type="checkbox"]'));
  await click(field(container, 'agree').querySelector('input[type="checkbox"]'));

  const submit = buttonWithText(container, '提交申请');
  assert.equal(submit.disabled, false, 'submit should be enabled once the form is valid');

  await act(async () => {
    submit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  const post = calls.find((call) => call.method === 'POST');
  assert.ok(post, 'expected a POST to the booking API');
  assert.match(post.url, /\/functions\/bookings$/);

  const payload = JSON.parse(post.body);
  assert.equal(payload.name, '陈小明');
  assert.equal(payload.phone, '012-3456789');
  assert.equal(payload.venueId, 'jabez-hall');
  assert.equal(payload.purpose, 'meeting');
  assert.equal(payload.aircon, 'yes');
  assert.equal(payload.date, TARGET_DATE);
  assert.equal(payload.startTime, '15:00');
  assert.equal(payload.durationHours, 1);
  assert.equal(payload.agree, true);
  assert.deepEqual(payload.leadersNotified.map((leader) => leader.id), ['instrument']);
  assert.equal(payload.config.advanceDays, ADVANCE_DAYS);
  // The honeypot stays empty for real members.
  assert.equal(payload.website, '');

  // Success screen with the reference number and a WhatsApp hand-off.
  assert.match(container.textContent, /申请已提交/);
  assert.match(container.textContent, /VB-TEST-0001/);
  assert.match(container.textContent, /转发给教会同工/);
});

test('the form blocks an already approved slot', async () => {
  const calls = mockFetch({
    busy: [
      {
        venueId: 'jabez-hall',
        date: TARGET_DATE,
        startTime: '15:00',
        durationHours: 3,
        status: 'approved',
      },
    ],
  });
  const container = await mount();
  await fillForm(container);

  const approvedSlot = slotButton(container, '3:00 PM');
  assert.equal(approvedSlot.disabled, true, 'approved slots must not be selectable');
  // The reason is shown in the venue card badge.
  assert.match(container.textContent, /个时段已被批准/);

  // Even forcing a click cannot select it.
  await click(approvedSlot);
  assert.equal(slotButton(container, '3:00 PM').className.includes('bg-primary text-white'), false);

  await click(field(container, 'leadersNotified').querySelector('input[type="checkbox"]'));
  await click(field(container, 'agree').querySelector('input[type="checkbox"]'));

  // Submitting without a start time stays client-side and never hits the API.
  const submit = buttonWithText(container, '提交申请');
  await act(async () => {
    submit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
  assert.match(container.textContent, /请检查标红的栏位|此栏为必填/);
});

test('a pending application only warns and asks for an acknowledgement', async () => {
  mockFetch({
    busy: [
      {
        venueId: 'jabez-hall',
        date: TARGET_DATE,
        startTime: '15:00',
        durationHours: 1,
        status: 'pending',
      },
    ],
  });
  const container = await mount();
  await fillForm(container);

  const slot = slotButton(container, '3:00 PM');
  assert.equal(slot.disabled, false, 'pending slots stay selectable');
  await click(slot);

  await click(field(container, 'leadersNotified').querySelector('input[type="checkbox"]'));
  await click(field(container, 'agree').querySelector('input[type="checkbox"]'));

  // The acknowledgement panel appears and the submit button is locked.
  assert.match(container.textContent, /我了解此时段已有其他申请/);
  const submit = buttonWithText(container, '提交申请');
  assert.equal(submit.disabled, true, 'submit is locked until the member acknowledges');

  const ack = [...container.querySelectorAll('input[type="checkbox"]')].find((input) =>
    input.closest('label')?.textContent.includes('我了解')
  );
  assert.ok(ack, 'expected the acknowledgement checkbox');
  await click(ack);

  assert.equal(buttonWithText(container, '提交申请').disabled, false);
});

test('the form refuses to submit before the required fields are filled', async () => {
  const calls = mockFetch();
  const container = await mount();

  const submit = buttonWithText(container, '提交申请');
  assert.ok(submit, 'submit button should always render');
  await act(async () => {
    submit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });

  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
  assert.match(container.textContent, /此栏为必填/);
});

test('an unavailable backend falls back to WhatsApp instead of failing silently', async () => {
  global.fetch = async () => jsonResponse(503, { ok: false, error: 'booking_storage_unavailable' });
  const container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    harness.mountPage(container, initialData, 'zh');
    await Promise.resolve();
  });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });

  assert.match(container.textContent, /线上场地申请系统暂时无法连接/);
  const fallback = [...container.querySelectorAll('a')].find((link) =>
    link.getAttribute('href')?.startsWith('https://wa.me/')
  );
  assert.ok(fallback, 'expected a WhatsApp fallback link');
  assert.match(decodeURIComponent(fallback.getAttribute('href')), /60184663128/);
});
