// Render smoke tests for the venue booking UI.
//
// The components are bundled with the project's own esbuild (a Vite dependency)
// and rendered with react-dom/server, so a broken render (bad prop, undefined
// helper, missing import) fails here instead of only being visible in a browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { initialData } from '../src/data/initialData.js';

async function bundleFixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'bmbcc-ssr-'));
  const outfile = path.join(dir, 'fixture.mjs');
  await build({
    entryPoints: [path.join(process.cwd(), 'tests/fixtures/venueBookingSsr.jsx')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    logLevel: 'silent',
    // react-dom/server is CommonJS and requires Node built-ins ("stream"), so the
    // ESM bundle needs a real `require` shim.
    banner: {
      js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
    },
  });
  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

const { mod: ssr, cleanup } = await bundleFixture();
test.after(cleanup);

/* ------------------------- public page ------------------------- */

test('public booking page renders the rules, venues, availability and form', () => {
  const html = ssr.renderPage(initialData, 'zh');

  assert.match(html, /场地租借申请/);
  assert.match(html, /场地申请规则/);
  assert.match(html, /雅比斯副堂/);
  assert.match(html, /爱邻社区关怀中心/);
  assert.match(html, /会议室/);
  assert.match(html, /提前两天|至少提前 2 天|需至少提前 2 天/);
  assert.match(html, /018-4663128/);
  assert.match(html, /提交申请/);
  // Leader confirmation checkboxes from the original Google Form.
  assert.match(html, /曾明强执事/);
  assert.match(html, /林美凤同工/);
  // Availability picker + duration options.
  assert.match(html, /场地使用情况/);
  assert.match(html, /一小时/);
  assert.match(html, /四小时/);
});

test('public booking page renders in English too', () => {
  const html = ssr.renderPage(initialData, 'en');
  assert.match(html, /Venue Booking Application/);
  assert.match(html, /Jabez Hall/);
  assert.match(html, /Submit application/);
  assert.match(html, /I-Sayang Community Care Centre/);
});

test('public booking page survives legacy data without a venueBooking key', () => {
  const legacy = { ...initialData };
  delete legacy.venueBooking;
  const html = ssr.renderPage(legacy, 'zh');
  assert.match(html, /场地租借申请/); // falls back to built-in copy
  assert.match(html, /提交申请/);
});

/* ------------------------- admin console ------------------------- */

test('admin console renders the application list shell and the settings editor', () => {
  const html = ssr.renderAdmin(initialData, 'zh');

  assert.match(html, /场地租借管理/);
  assert.match(html, /申请记录/);
  assert.match(html, /场地与规则设置/);
  assert.match(html, /待审核/);
  // Settings tab is rendered in the same pass (tab 2 content is part of the tree
  // when the settings tab is active, so assert the shared controls exist).
  assert.match(html, /刷新/);
});

test('admin console renders in English', () => {
  const html = ssr.renderAdmin(initialData, 'en');
  assert.match(html, /Venue Booking Manager/);
  assert.match(html, /Applications/);
  assert.match(html, /Venue &amp; Rules/);
});

test('admin console tolerates legacy data without a venueBooking key', () => {
  const legacy = { ...initialData };
  delete legacy.venueBooking;
  const html = ssr.renderAdmin(legacy, 'zh');
  assert.match(html, /场地租借管理/);
});
