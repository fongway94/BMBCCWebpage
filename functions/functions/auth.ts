// Cloudflare Pages route wrapper for /functions/auth.
// The shared implementation lives in ../auth.ts, which also exposes /auth.

export {
  onRequestDelete,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
} from '../auth';
