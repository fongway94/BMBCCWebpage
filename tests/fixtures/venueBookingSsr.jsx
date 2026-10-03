// SSR entry used by tests/uiSmoke.test.mjs. esbuild bundles this file (JSX +
// React) into a temporary ES module so the booking components can be rendered
// in Node, catching component-level runtime errors without a browser.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import VenueBookingPage from '../../src/components/VenueBookingPage';
import VenueBookingAdmin from '../../src/components/VenueBookingAdmin';

const translate = (obj, key) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (key && obj[key]) return obj[key];
  if (obj.zh) return obj.zh;
  if (obj.en) return obj.en;
  return '';
};

export function renderPage(data, lang = 'zh') {
  return renderToStaticMarkup(
    <VenueBookingPage data={data} lang={lang} t={(obj) => translate(obj, lang)} />
  );
}

export function renderAdmin(data, lang = 'zh') {
  return renderToStaticMarkup(
    <VenueBookingAdmin
      data={data}
      lang={lang}
      t={(obj) => translate(obj, lang)}
      saveAllData={() => {}}
      onToast={() => {}}
    />
  );
}
