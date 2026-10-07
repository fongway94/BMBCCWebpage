// Cloudflare Pages route wrapper for /functions/bookings.
// The shared implementation lives in ../bookings.ts, which also exposes /bookings.

export {
  onRequestDelete,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
  onRequestPut,
} from '../bookings';
