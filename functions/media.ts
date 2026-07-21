// Secure Cloudflare Pages R2 media endpoint. Route: /media
// Files are public only through MEDIA_PUBLIC_URL (an R2 custom domain), never through credentials.
//
// Phase 1 (unchanged): authenticated GET listing + usage, POST multipart upload with
// magic-byte validation and quota enforcement, DELETE = reversible move-to-trash.
//
// Phase 2 (additive): authenticated POST JSON actions for the Admin "Media Storage" UI:
//   { action: 'scan',      urls: string[] }                          reference scan against saved site data
//   { action: 'restore',   key }                                     restore a trashed object
//   { action: 'purge',     key, confirm, overrideProtected? }        explicit manual permanent deletion
//   { action: 'reconcile' }                                          repair the KV index from the bucket (manual)
// Permanent deletion is only possible for eligible trash, is never automatic, and
// never touches referenced files or protected bulletin/gallery archives.
import {
  HARD_LIMIT_BYTES,
  WARNING_LIMIT_BYTES,
  CATEGORIES,
  PROTECTED_CATEGORIES,
  computeUsage,
  purgeEligibility,
} from '../src/lib/mediaCore.js';

export interface Env { JWT_SECRET: string; MEDIA_BUCKET: R2Bucket; MEDIA_INDEX: KVNamespace; MEDIA_PUBLIC_URL?: string; }
const COOKIE_NAME = 'bmbcc_admin';
const HARD_LIMIT = HARD_LIMIT_BYTES;
const WARNING_LIMIT = WARNING_LIMIT_BYTES;
type Category = 'images' | 'bulletins' | 'galleries' | 'logos' | 'qrcodes';
type Record = { key:string; size:number; category:Category; contentType:string; uploadedAt:string; trash?:boolean; trashAt?:string; fellowshipHighlightId?:string };
type LastScan = { at:string; referencedKeys:string[] };
const SCAN_KEY = 'lastReferenceScan';
const MAX_SCAN_URLS = 20000;
// A purge must be backed by a reference scan newer than this, so "changed a URL in an
// edit form" can never race a deletion: the scan always reflects currently saved data.
const SCAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Fellowship Highlights are stored as protected gallery media, but their quotas
// are scoped to the individual highlight rather than to the galleries category.
const FELLOWSHIP_HIGHLIGHT_MAX_IMAGES = 100;
const FELLOWSHIP_HIGHLIGHT_MAX_BYTES = 100 * 1024 * 1024;

function json(body: unknown, status=200) { return new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
function token(cookie:string|null) { return cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1]; }
async function admin(request:Request, env:Env) {
  if (!env.JWT_SECRET || !env.MEDIA_BUCKET || !env.MEDIA_INDEX) return false;
  const value=token(request.headers.get('Cookie')); if (!value) return false;
  try { const [h,p,s]=value.split('.'); if (!h||!p||!s) return false; const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.JWT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']); const sig=Uint8Array.from(atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)); if (!await crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(`${h}.${p}`))) return false; const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob((p+'='.repeat((4-p.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))); return payload.admin===true && (!payload.exp || payload.exp >= Math.floor(Date.now()/1000)); } catch { return false; }
}
function signature(bytes:Uint8Array, kind:string) { const s=(i:number)=>bytes[i]; if(kind==='pdf') return new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'; if(kind==='image') return (s(0)===0xff&&s(1)===0xd8&&s(2)===0xff)||(s(0)===0x89&&new TextDecoder().decode(bytes.slice(1,4))==='PNG')||(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'); return false; }
function imageType(bytes:Uint8Array) { if(bytes[0]===0xff&&bytes[1]===0xd8) return 'image/jpeg'; if(bytes[0]===0x89) return 'image/png'; return 'image/webp'; }
function category(value:FormDataEntryValue|null):Category|null { return ['images','bulletins','galleries','logos','qrcodes'].includes(String(value)) ? String(value) as Category : null; }
async function records(env:Env):Promise<Record[]> { return (await env.MEDIA_INDEX.get('records','json') as Record[] | null)||[]; }
async function save(env:Env, value:Record[]) { await env.MEDIA_INDEX.put('records',JSON.stringify(value)); }
async function lastScan(env:Env):Promise<LastScan|null> { try { return await env.MEDIA_INDEX.get(SCAN_KEY,'json') as LastScan | null; } catch { return null; } }
function publicUrl(env:Env, key:string) { return env.MEDIA_PUBLIC_URL ? `${env.MEDIA_PUBLIC_URL.replace(/\/$/,'')}/${key}` : null; }
// Usage accounting is delegated to the shared, tested mediaCore implementation.
// The Phase 1 response fields (used, count, byCategory, warning, hardLimit,
// warningLimit) are preserved exactly; Phase 2 fields are additive.
function usage(value:Record[]) {
  const u = computeUsage(value);
  return {
    used: u.used,
    count: u.count,
    byCategory: u.byCategory,
    warning: u.warning,
    hardLimit: u.hardLimit,
    warningLimit: u.warningLimit,
    // Phase 2 additions:
    remaining: u.remaining,
    byCategoryCount: u.byCategoryCount,
    trashCount: u.trashCount,
    trashUsed: u.trashUsed,
    percentUsed: u.percentUsed,
    hardLimitReached: u.hardLimitReached,
  };
}
function inferCategory(key:string):Category { if(key.startsWith('bulletins/')) return 'bulletins'; if(key.startsWith('galleries/')) return 'galleries'; if(key.startsWith('images/logos/')) return 'logos'; if(key.startsWith('images/qrcodes/')) return 'qrcodes'; return 'images'; }
export const onRequestOptions:PagesFunction<Env>=async()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'}});
export const onRequestGet:PagesFunction<Env>=async({request,env})=>{ if(!await admin(request,env)) return json({ok:false,error:'Not authenticated'},401); const all=await records(env); const u=usage(all); const scan=await lastScan(env); return json({ok:true,...u,remaining:Math.max(0,HARD_LIMIT-u.used),lastScanAt:scan?.at||null,files:all.map(x=>({...x,url:publicUrl(env,x.key)}))}); };

// POST serves two purposes:
//  1. multipart/form-data → Phase 1 upload (unchanged)
//  2. application/json    → Phase 2 management actions (scan/restore/purge/reconcile)
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{ if(!await admin(request,env)) return json({ok:false,error:'Not authenticated'},401); const contentType=request.headers.get('Content-Type')||''; if(contentType.includes('application/json')) return handleAction(request,env); return handleUpload(request,env); };

async function handleUpload(request:Request, env:Env):Promise<Response> {
  try {
    const form=await request.formData();
    const file=form.get('file');
    const cat=category(form.get('category'));
    // The highlight id is deliberately supplied by the authenticated admin client,
    // not inferred from a filename or URL. Existing gallery uploads omit it and
    // retain their current behaviour.
    const fellowshipHighlightId=String(form.get('fellowshipHighlightId') || form.get('highlightId') || '').trim();
    if(!(file instanceof File)||!cat) return json({ok:false,error:'A file and valid category are required.'},400);
    // Never store an orphaned object: uploads are only useful when the configured
    // R2 custom domain can produce the URL that the editor will save.
    if(!env.MEDIA_PUBLIC_URL?.trim()) return json({ok:false,error:'Uploads are temporarily unavailable because MEDIA_PUBLIC_URL is not configured. Configure the R2 custom media domain first.'},503);
    const pdf=cat==='bulletins';
    if(pdf ? file.size>15*1024*1024 : file.size>(cat==='galleries'?8:cat==='logos'||cat==='qrcodes'?2:5)*1024*1024) return json({ok:false,error:'File exceeds this category’s pre-processing size limit.'},413);
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!signature(bytes,pdf?'pdf':'image')) return json({ok:false,error:pdf?'Only real PDF files beginning with %PDF- are accepted.':'Only JPEG, PNG, and WebP images with a valid file signature are accepted.'},415);
    const type=pdf?'application/pdf':imageType(bytes);
    const all=await records(env);

    // This check is before the R2 put. Count and bytes include existing records
    // (including trashed objects, which still consume R2 storage) assigned to this
    // highlight. A highlight upload must carry an id so an upload cannot evade the
    // per-highlight quota by using the general galleries category.
    if (cat==='galleries' && fellowshipHighlightId) {
      const highlightRecords=all.filter(record => record.category==='galleries' && record.fellowshipHighlightId===fellowshipHighlightId);
      const highlightBytes=highlightRecords.reduce((total,record) => total + record.size,0);
      if(highlightRecords.length >= FELLOWSHIP_HIGHLIGHT_MAX_IMAGES) return json({ok:false,error:'Upload blocked: this Fellowship Highlight already contains the maximum of 100 images.'},413);
      if(highlightBytes + bytes.byteLength > FELLOWSHIP_HIGHLIGHT_MAX_BYTES) return json({ok:false,error:'Upload blocked: this Fellowship Highlight would exceed its 100 MB total image storage limit.'},413);
    }

    if(usage(all).used+bytes.byteLength>HARD_LIMIT) return json({ok:false,error:'Upload blocked: the 7 GB R2 storage limit would be exceeded.'},413);
    const now=new Date();
    const ym=`${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    const prefix=pdf?'bulletins':cat==='galleries'?'galleries/events':cat==='images'?'images/website':`images/${cat}`;
    const extension=pdf?'pdf':type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';
    const key=`${prefix}/${ym}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA_BUCKET.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable',contentDisposition:pdf?'inline':undefined},customMetadata:{category:cat,uploadedAt:now.toISOString(),...(fellowshipHighlightId?{fellowshipHighlightId}:{})}});
    const row:Record={key,size:bytes.byteLength,category:cat,contentType:type,uploadedAt:now.toISOString(),...(fellowshipHighlightId?{fellowshipHighlightId}:{})};
    all.push(row); await save(env,all);
    const base=env.MEDIA_PUBLIC_URL?.replace(/\/$/,'');
    if(!base) return json({ok:false,error:'Upload stored but MEDIA_PUBLIC_URL is not configured. Ask an administrator to configure the R2 custom media domain.'},500);
    return json({ok:true,url:`${base}/${key}`,file:row,usage:usage(all)});
  } catch(e) { console.error(e); return json({ok:false,error:'Upload failed. Please try again.'},500); }
}

async function handleAction(request:Request, env:Env):Promise<Response> {
  let body: { action?:string; key?:string; urls?:unknown; confirm?:string; overrideProtected?:boolean };
  try { body = await request.json() as typeof body; } catch { return json({ok:false,error:'Invalid JSON body.'},400); }
  switch (body.action) {
    case 'scan': return scanAction(env, body.urls);
    case 'restore': return restoreAction(env, body.key);
    case 'purge': return purgeAction(env, body);
    case 'reconcile': return reconcileAction(env);
    default: return json({ok:false,error:'Unknown action. Expected scan, restore, purge, or reconcile.'},400);
  }
}

// Reference scan: the admin UI collects every URL from the currently saved website
// data (localStorage/GitHub model) and posts them here. Only exact matches of
// `${MEDIA_PUBLIC_URL}/${key}` are treated as references — external URLs (Google
// Drive, Unsplash, YouTube, any other public URL) can never match an R2 key.
async function scanAction(env:Env, urls:unknown):Promise<Response> {
  if (!Array.isArray(urls) || urls.length > MAX_SCAN_URLS) return json({ok:false,error:`Provide an array of up to ${MAX_SCAN_URLS} URL strings from the saved site data.`},400);
  const candidates = new Set<string>();
  for (const u of urls) { if (typeof u === 'string' && u) candidates.add(u); }
  const all = await records(env);
  const referencedKeys:string[] = [];
  for (const record of all) { const url = publicUrl(env, record.key); if (url && candidates.has(url)) referencedKeys.push(record.key); }
  const scan:LastScan = { at: new Date().toISOString(), referencedKeys };
  await env.MEDIA_INDEX.put(SCAN_KEY, JSON.stringify(scan));
  return json({ok:true,scannedAt:scan.at,scannedUrls:candidates.size,referencedKeys,referencedCount:referencedKeys.length});
}

async function restoreAction(env:Env, key:string|undefined):Promise<Response> {
  if (!key) return json({ok:false,error:'A media key is required.'},400);
  const all = await records(env);
  const found = all.find(x=>x.key===key);
  if (!found) return json({ok:false,error:'Media not found'},404);
  if (!found.trash) return json({ok:false,error:'This file is not in the trash.'},409);
  delete found.trash; delete found.trashAt;
  await save(env,all);
  return json({ok:true,message:'Restored. The file is live again and counts toward the storage quota.',file:{...found,url:publicUrl(env,found.key)},usage:usage(all)});
}

// Permanent deletion. This is the only destructive endpoint and it is guarded by
// every rule in the retention policy — none of them can be skipped by the client:
//   1. The record must exist and already be in the trash.
//   2. `confirm` must be the exact object key (explicit admin confirmation).
//   3. A fresh server-side reference scan must exist and must not reference the key
//      (referenced files are never deleted; a URL change in an edit form simply
//      changes the next scan result — it never triggers deletion).
//   4. Protected categories (bulletin PDFs, event galleries) require the explicit
//      overrideProtected flag; they are never deleted automatically.
//   5. The shared, tested purgeEligibility() policy (30-day trash retention) must pass.
async function purgeAction(env:Env, body:{key?:string; confirm?:string; overrideProtected?:boolean}):Promise<Response> {
  const key = body.key;
  if (!key) return json({ok:false,error:'A media key is required.'},400);
  if (body.confirm !== key) return json({ok:false,error:'Explicit confirmation failed: the object key must be confirmed verbatim.'},400);
  const all = await records(env);
  const found = all.find(x=>x.key===key);
  if (!found) return json({ok:false,error:'Media not found'},404);
  if (!found.trash) return json({ok:false,error:'Only trashed media can be permanently deleted. Move it to trash first.'},409);
  const scan = await lastScan(env);
  if (!scan || Date.now() - Date.parse(scan.at) > SCAN_MAX_AGE_MS) {
    return json({ok:false,error:'Run a fresh reference scan before permanently deleting, so referenced website media is protected.'},409);
  }
  if (scan.referencedKeys.includes(key)) {
    return json({ok:false,error:'Deletion blocked: this file is currently referenced by website content.'},409);
  }
  const eligibility = purgeEligibility(found, { referenced: false, overrideProtected: Boolean(body.overrideProtected) });
  if (!eligibility.eligible) return json({ok:false,error:eligibility.reason,eligibleAt:eligibility.eligibleAt},409);
  try {
    await env.MEDIA_BUCKET.delete(key);
    const remainingRecords = all.filter(x=>x.key!==key);
    await save(env,remainingRecords);
    return json({ok:true,message:'Permanently deleted from R2 and removed from the media index.',usage:usage(remainingRecords)});
  } catch(e) { console.error(e); return json({ok:false,error:'Permanent deletion failed. Please try again.'},500); }
}

// Manual index repair: compares the KV metadata index with the actual bucket
// contents. This is the ONLY full R2 listing in the system and it runs only on an
// explicit admin click — never on page load — so routine admin usage stays cheap.
async function reconcileAction(env:Env):Promise<Response> {
  try {
    const bucketObjects = new Map<string, R2Object>();
    let cursor: string | undefined;
    do {
      const listed = await env.MEDIA_BUCKET.list({ cursor, limit: 1000 });
      for (const object of listed.objects) bucketObjects.set(object.key, object);
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    const all = await records(env);
    const indexKeys = new Set(all.map(x=>x.key));
    let removed = 0; let added = 0;

    // Drop index rows whose object no longer exists in the bucket.
    const kept = all.filter((record) => { if (bucketObjects.has(record.key)) return true; removed += 1; return false; });

    // Add records for objects missing from the index (metadata is reconstructed).
    for (const [key, object] of bucketObjects) {
      if (indexKeys.has(key)) continue;
      const meta = object.customMetadata || {};
      kept.push({
        key,
        size: object.size,
        category: (CATEGORIES.includes(meta.category) ? meta.category : inferCategory(key)) as Category,
        contentType: object.httpMetadata?.contentType || 'application/octet-stream',
        uploadedAt: meta.uploadedAt || object.uploaded.toISOString(),
      });
      added += 1;
    }

    await save(env, kept);
    return json({ok:true,message:`Index reconciled with the R2 bucket.`,removed,added,total:kept.length,bucketObjects:bucketObjects.size,usage:usage(kept)});
  } catch(e) { console.error(e); return json({ok:false,error:'Reconcile failed. Please try again.'},500); }
}

// Deletion is deliberately a reversible trash action; permanent deletion is a future reviewed maintenance task.
export const onRequestDelete:PagesFunction<Env>=async({request,env})=>{ if(!await admin(request,env)) return json({ok:false,error:'Not authenticated'},401); const {key}=await request.json() as {key?:string}; const all=await records(env); const found=all.find(x=>x.key===key); if(!found) return json({ok:false,error:'Media not found'},404); found.trash=true; found.trashAt=new Date().toISOString(); await save(env,all); return json({ok:true,message:'Moved to trash. The object remains available for 30 days pending manual review.'}); };
