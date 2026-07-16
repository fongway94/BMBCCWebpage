// Cloudflare Pages route wrapper for /functions/github-settings.
// The shared implementation lives in ../github-settings.ts, which also exposes /github-settings.

export {
  onRequestDelete,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
} from '../github-settings';
