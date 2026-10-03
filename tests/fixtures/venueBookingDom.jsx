// DOM test harness for the venue booking page. esbuild bundles this file so the
// interaction tests can drive the real component with a real DOM (jsdom).
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

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

function render(element, container) {
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return root;
}

export function mountPage(container, data, lang = 'zh') {
  return render(
    <VenueBookingPage data={data} lang={lang} t={(obj) => translate(obj, lang)} />,
    container
  );
}

export function mountAdmin(container, data, lang = 'zh', handlers = {}) {
  return render(
    <VenueBookingAdmin
      data={data}
      lang={lang}
      t={(obj) => translate(obj, lang)}
      saveAllData={handlers.saveAllData || (() => {})}
      onToast={handlers.onToast || (() => {})}
      onPendingCountChange={handlers.onPendingCountChange}
    />,
    container
  );
}

export { act, React };
