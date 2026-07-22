import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Copy,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  FileText,
  Info,
  X,
  Check,
  RefreshCw,
  HardDrive,
  RotateCcw,
  Eye,
  Database,
  Image as ImageIcon,
  Link2,
  Trash,
  Archive,
  SearchX,
} from 'lucide-react';
import {
  CATEGORIES,
  PROTECTED_CATEGORIES,
  TRASH_RETENTION_DAYS,
  UNUSED_REVIEW_DAYS,
  formatBytes,
  fileName,
  referenceMap,
  usageLocations,
  collectSiteUrls,
  isUnusedReviewEligible,
  purgeEligibility,
  sortFiles,
  filterFiles,
} from '../lib/mediaCore.js';

// ---------------------------------------------------------------------------
// Admin "Media Storage" panel (Phase 2).
//
// This component is the authenticated front-end for the secure /media Pages
// Function. It only ever talks to the same-origin /media endpoint using the
// HttpOnly admin session cookie (credentials: 'include'); it never sees R2,
// Cloudflare, GitHub, or JWT secrets. All destructive rules (30-day retention,
// referenced-file protection, protected bulletins/galleries, explicit confirm)
// are enforced again on the server, so the UI can never bypass them.
// ---------------------------------------------------------------------------

const CATEGORY_LABELS = {
  images: { zh: '网站图片', en: 'Website Images' },
  bulletins: { zh: '家事 PDF', en: 'Bulletin PDFs' },
  galleries: { zh: '活动相册', en: 'Event Galleries' },
  logos: { zh: '标志', en: 'Logos' },
  qrcodes: { zh: '二维码', en: 'QR Codes' },
};

const SORT_LABELS = {
  newest: { zh: '最新上传', en: 'Newest first' },
  oldest: { zh: '最旧上传', en: 'Oldest first' },
  largest: { zh: '最大文件', en: 'Largest first' },
  smallest: { zh: '最小文件', en: 'Smallest first' },
};

function useL(lang) {
  return useCallback((zh, en) => (lang === 'zh' ? zh : en), [lang]);
}

function formatDate(iso, lang) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return '—';
  try {
    return new Date(t).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(t).toISOString();
  }
}

function timeAgo(iso, L) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return L('刚刚', 'just now');
  if (mins < 60) return L(`${mins} 分钟前`, `${mins}m ago`);
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return L(`${hrs} 小时前`, `${hrs}h ago`);
  const days = Math.round(hrs / 24);
  return L(`${days} 天前`, `${days}d ago`);
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast, onClose]);
  if (!toast) return null;
  const success = toast.kind === 'success';
  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-2 animate-fade-in ${
        success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
      <span className="leading-relaxed">{toast.message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function StorageMeter({ meta, L }) {
  const used = meta?.used || 0;
  const hardLimit = meta?.hardLimit || 9 * 1024 ** 3;
  const warningLimit = meta?.warningLimit || 7 * 1024 ** 3;
  const remaining = Math.max(0, hardLimit - used);
  const percent = Math.min(100, (used / hardLimit) * 100);
  const hard = used >= hardLimit;
  const warn = used >= warningLimit;
  const barColor = hard ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-emerald-500';
  const stateLabel = hard
    ? L('已达 9 GB 上限：上传已被阻止', '9 GB hard limit reached: uploads are blocked')
    : warn
    ? L('已超过 7 GB 警告线', 'Past the 7 GB warning threshold')
    : L('存储空间正常', 'Storage healthy');
  const stateStyle = hard
    ? 'bg-red-50 text-red-700 border-red-200'
    : warn
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-primary" />
          <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
            {L('云端媒体存储用量', 'Cloud Media Storage Usage')}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${stateStyle}`}>{stateLabel}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-extrabold text-gray-900">{formatBytes(used)}</span>
          <span className="text-xs text-gray-400 font-semibold"> / {formatBytes(hardLimit)}</span>
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {L('剩余', 'Remaining')} <span className="text-gray-800 font-bold">{formatBytes(remaining)}</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
        <span>{percent.toFixed(1)}% {L('已用', 'used')}</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> {L('7 GB 警告', '7 GB warn')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {L('9 GB 上限', '9 GB limit')}
        </span>
      </div>
    </div>
  );
}

function StatCards({ meta, L }) {
  const cards = [
    { label: L('在用文件', 'Live files'), value: meta?.count ?? 0, icon: ImageIcon, tone: 'text-emerald-600 bg-emerald-50' },
    { label: L('回收站文件', 'In trash'), value: meta?.trashCount ?? 0, icon: Trash, tone: 'text-amber-600 bg-amber-50' },
    { label: L('回收站占用', 'Trash size'), value: formatBytes(meta?.trashUsed || 0), icon: Archive, tone: 'text-gray-600 bg-gray-100' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${c.tone}`}>
            <c.icon size={18} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-gray-900 leading-none">{c.value}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ meta, L }) {
  const byBytes = meta?.byCategory || {};
  const byCount = meta?.byCategoryCount || {};
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={15} className="text-primary" />
        <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
          {L('按分类统计（在用）', 'By category (live)')}
        </span>
      </div>
      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">{CATEGORY_LABELS[cat][lang2(L)]}</span>
            <span className="font-bold text-gray-800">
              {byCount[cat] || 0} · {formatBytes(byBytes[cat] || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resolve 'zh'/'en' from the L helper by probing it once.
function lang2(L) {
  return L('zh', 'en') === 'zh' ? 'zh' : 'en';
}

function MediaThumb({ file, L }) {
  const isImage = (file.contentType || '').startsWith('image/');
  const isPdf = file.contentType === 'application/pdf';
  const [broken, setBroken] = useState(false);
  if (isImage && file.url && !broken) {
    return (
      <img
        src={file.url}
        alt={fileName(file.key)}
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-14 h-14 object-cover rounded-lg border border-gray-200 bg-gray-50"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
      {isPdf ? <FileText size={20} className="text-rose-500" /> : <ImageIcon size={20} />}
      <span className="text-[8px] font-bold mt-0.5 uppercase">{isPdf ? 'PDF' : 'IMG'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation dialogs
// ---------------------------------------------------------------------------

function ModalShell({ title, icon: Icon, tone = 'gray', children, onClose }) {
  const toneMap = {
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border ${toneMap[tone]}`}>{Icon ? <Icon size={20} /> : null}</div>
          <div className="flex-1">
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ config, L, onCancel, onConfirm, busy }) {
  if (!config) return null;
  const { kind, file } = config;
  if (kind === 'trash') {
    return (
      <ModalShell title={L('移到回收站', 'Move to trash')} icon={Trash2} tone="amber" onClose={onCancel}>
        <p className="text-xs text-gray-600 leading-relaxed">
          {L('此文件会被移到回收站，文件仍然保留并可随时恢复，至少保存 30 天。此操作不会立即删除文件。', 'This file will be moved to the trash. It stays recoverable for at least 30 days and is not deleted immediately.')}
        </p>
        <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-mono break-all text-gray-700">{file.key}</div>
        {file.category && PROTECTED_CATEGORIES.includes(file.category) && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5" />
            {L('这是受保护的存档分类（家事/活动相册）。移入回收站后，永久删除仍需额外确认。', 'This is a protected archival category (bulletins/galleries). Even after trashing, permanent deletion needs extra confirmation.')}
          </p>
        )}
        <DialogButtons onCancel={onCancel} busy={busy} cancelLabel={L('取消', 'Cancel')} confirmLabel={L('移到回收站', 'Move to trash')} confirmClass="bg-amber-500 hover:bg-amber-600" onConfirm={onConfirm} />
      </ModalShell>
    );
  }
  if (kind === 'reconcile') {
    return (
      <ModalShell title={L('重建媒体索引', 'Reconcile media index')} icon={Database} tone="gray" onClose={onCancel}>
        <p className="text-xs text-gray-600 leading-relaxed">
          {L(
            '这会完整列出云端媒体存储并修复元数据索引（补回缺失记录、移除已不存在的记录）。这是一次较重的操作，仅在索引与存储不一致时手动使用。',
            'This lists all cloud media storage objects to repair the metadata index (re-adds missing records, drops records whose objects are gone). It is a heavier operation — use it only when the index and storage are out of sync.'
          )}
        </p>
        <DialogButtons onCancel={onCancel} busy={busy} cancelLabel={L('取消', 'Cancel')} confirmLabel={L('开始重建', 'Reconcile now')} confirmClass="bg-primary hover:bg-primary-dark" onConfirm={onConfirm} />
      </ModalShell>
    );
  }
  return null;
}

function PurgeDialog({ file, referenced, L, onCancel, onConfirm, busy }) {
  const [typed, setTyped] = useState('');
  const [override, setOverride] = useState(false);
  if (!file) return null;
  const isProtected = PROTECTED_CATEGORIES.includes(file.category);
  const eligibility = purgeEligibility(file, { referenced: !!referenced, overrideProtected: override });
  const typedOk = typed === file.key;
  const canConfirm = eligibility.eligible && typedOk && (!isProtected || override);
  return (
    <ModalShell title={L('永久删除', 'Permanently delete')} icon={AlertTriangle} tone="red" onClose={onCancel}>
      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 leading-relaxed">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        {L('此操作不可撤销。文件将从云端媒体存储和媒体索引中永久删除。', 'This is irreversible. The object will be permanently removed from cloud media storage and the media index.')}
      </p>

      <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-mono break-all text-gray-700">{file.key}</div>

      {/* Live policy feedback, identical to the server-side rule. */}
      <div
        className={`text-[11px] rounded-lg p-2.5 border flex items-start gap-1.5 ${
          eligibility.eligible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {eligibility.eligible ? <Check size={13} className="shrink-0 mt-0.5" /> : <Info size={13} className="shrink-0 mt-0.5" />}
        <span className="leading-relaxed">
          {eligibility.reason}
          {eligibility.eligibleAt ? ` (${L('可删除时间', 'eligible at')}: ${formatDate(eligibility.eligibleAt)})` : ''}
        </span>
      </div>

      {isProtected && (
        <label className="flex items-start gap-2 text-[11px] text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 cursor-pointer">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5" />
          <span className="leading-relaxed">
            {L(
              '我确认要永久删除这个受保护的存档文件（家事 PDF / 活动相册）。此分类默认禁止永久删除。',
              'I confirm I want to permanently delete this protected archival file (bulletin PDF / event gallery). This category is protected by default.'
            )}
          </span>
        </label>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
          {L('输入完整文件 key 以确认：', 'Type the full object key to confirm:')}
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={file.key}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono focus:ring-1 focus:ring-red-400 focus:outline-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold">
          {L('取消', 'Cancel')}
        </button>
        <button
          onClick={() => onConfirm(override)}
          disabled={!canConfirm || busy}
          className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {L('永久删除', 'Permanently delete')}
        </button>
      </div>
    </ModalShell>
  );
}

function DialogButtons({ onCancel, onConfirm, busy, confirmLabel, confirmClass, cancelLabel = 'Cancel' }) {
  return (
    <div className="flex gap-3 pt-1">
      <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold">
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={busy}
        className={`flex-1 py-2.5 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 ${confirmClass}`}
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        {confirmLabel}
      </button>
    </div>
  );
}

function WhereUsedModal({ file, locations, L, onClose }) {
  if (!file) return null;
  const lang = lang2(L);
  const list = locations || [];
  return (
    <ModalShell title={L('使用位置', 'Where this file is used')} icon={Link2} tone="gray" onClose={onClose}>
      <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-mono break-all text-gray-700">{file.key}</div>
      {list.length === 0 ? (
        <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <SearchX size={14} className="shrink-0 mt-0.5" />
          {L('当前保存的网站内容中没有引用此文件。它可能是未使用的上传。', 'No currently saved website content references this file. It may be an unused upload.')}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-500">
            {L(`在保存的网站数据中共找到 ${list.length} 处引用：`, `Found ${list.length} reference(s) in the saved site data:`)}
          </p>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {list.map((loc, i) => (
              <li key={i} className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <CheckCircle size={13} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{loc[lang]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={onClose} className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold">
        {L('关闭', 'Close')}
      </button>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MediaStorageManager({
  siteData,
  lang,
  mediaEndpoint = '/media',
  uploadsEnabled = false,
  onUploadsEnabledChange,
}) {
  const L = useL(lang);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState(null);
  const [lastScanAt, setLastScanAt] = useState(null);
  const [scanInfo, setScanInfo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters / listing controls
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('all');
  const [trashFilter, setTrashFilter] = useState('all'); // all | live | trash
  const [unusedOnly, setUnusedOnly] = useState(false);

  // Dialogs
  const [confirm, setConfirm] = useState(null); // { kind: 'trash'|'reconcile', file }
  const [purgeFile, setPurgeFile] = useState(null);
  const [whereUsedFile, setWhereUsedFile] = useState(null);

  // Every URL in the currently saved site data (localStorage / GitHub model).
  const siteUrls = useMemo(() => collectSiteUrls(siteData), [siteData]);

  // The configured public media base, derived from the returned file URLs.
  const base = useMemo(() => {
    for (const f of files) {
      if (f.url && f.key && f.url.endsWith(`/${f.key}`)) {
        return f.url.slice(0, f.url.length - f.key.length - 1);
      }
    }
    return '';
  }, [files]);

  // Client-side reference resolution (exact URL matches only — externals never match).
  const referenced = useMemo(
    () => referenceMap(files, siteUrls.map((u) => u.value), base),
    [files, siteUrls, base]
  );
  const locations = useMemo(() => usageLocations(files, siteUrls, base), [files, siteUrls, base]);
  const reviewEligible = useMemo(
    () => new Set(files.filter((f) => isUnusedReviewEligible(f, { referenced: referenced.get(f.key) })).map((f) => f.key)),
    [files, referenced]
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(mediaEndpoint, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFiles(Array.isArray(data.files) ? data.files : []);
      setMeta(data);
      setLastScanAt(data.lastScanAt || null);
      setStatus('ready');
      return data.files || [];
    } catch (e) {
      setError(e.message || L('加载媒体列表失败。', 'Failed to load the media list.'));
      setStatus('error');
      return [];
    }
  }, [mediaEndpoint, L]);

  // Refresh the server-side reference scan so purge protection reflects current
  // saved data. Cheap: it only reads the KV index, never lists R2.
  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(mediaEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', urls: siteUrls.map((u) => u.value) }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setScanInfo({ at: data.scannedAt, referencedCount: data.referencedCount, scannedUrls: data.scannedUrls });
        setLastScanAt(data.scannedAt);
      } else {
        setScanInfo({ error: data.error || L('引用扫描失败。', 'Reference scan failed.') });
      }
    } catch {
      setScanInfo({ error: L('引用扫描失败（网络错误）。', 'Reference scan failed (network error).') });
    } finally {
      setScanning(false);
    }
  }, [mediaEndpoint, siteUrls, L]);

  useEffect(() => {
    (async () => {
      const list = await load();
      if (list.length) runScan();
    })();
    // Run once on mount; siteUrls/base changes are handled by the memoized maps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (kind, message) => setToast({ kind, message });

  // ---- Actions -----------------------------------------------------------

  const moveToTrash = async (file) => {
    setBusy(true);
    try {
      const res = await fetch(mediaEndpoint, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: file.key }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', data.message || L('已移到回收站。', 'Moved to trash.'));
      setConfirm(null);
      await load();
    } catch (e) {
      notify('error', e.message || L('操作失败。', 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file) => {
    setBusy(true);
    try {
      const res = await fetch(mediaEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', key: file.key }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', data.message || L('已恢复。', 'Restored.'));
      await load();
    } catch (e) {
      notify('error', e.message || L('恢复失败。', 'Restore failed.'));
    } finally {
      setBusy(false);
    }
  };

  const purge = async (file, overrideProtected) => {
    setBusy(true);
    try {
      const res = await fetch(mediaEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge', key: file.key, confirm: file.key, overrideProtected: !!overrideProtected }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', data.message || L('已永久删除。', 'Permanently deleted.'));
      setPurgeFile(null);
      await load();
      runScan();
    } catch (e) {
      notify('error', e.message || L('永久删除失败。', 'Permanent deletion failed.'));
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    setBusy(true);
    try {
      const res = await fetch(mediaEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify(
        'success',
        `${data.message || L('索引已重建。', 'Index reconciled.')} (+${data.added}/-${data.removed})`
      );
      setConfirm(null);
      await load();
    } catch (e) {
      notify('error', e.message || L('重建失败。', 'Reconcile failed.'));
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (file) => {
    if (!file.url) {
      notify('error', L('此文件没有公开 URL（未配置 MEDIA_PUBLIC_URL）。', 'This file has no public URL (MEDIA_PUBLIC_URL not configured).'));
      return;
    }
    try {
      await navigator.clipboard.writeText(file.url);
      notify('success', L('已复制不可变媒体 URL。', 'Immutable media URL copied.'));
    } catch {
      notify('error', L('复制失败，请手动复制。', 'Copy failed — please copy manually.'));
    }
  };

  // ---- Derived listing ---------------------------------------------------

  const visibleFiles = useMemo(() => {
    const filtered = filterFiles(files, { q, category, trash: trashFilter, unusedOnly, referenced, reviewEligible });
    return sortFiles(filtered, sort);
  }, [files, q, category, trashFilter, unusedOnly, referenced, reviewEligible, sort]);

  const noMediaBase = !base && status === 'ready' && files.length > 0;

  // ---- Render ------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">{L('媒体存储管理', 'Media Storage')}</h2>
        <p className="text-xs text-gray-500 font-light mt-1 leading-relaxed">
          {L(
            '管理上传到云端媒体存储的图片与家事 PDF。外部链接（Google Drive、Unsplash、YouTube 等）不受此处管理，也不会被误判为云端媒体。',
            'Manage images and bulletin PDFs uploaded to cloud media storage. External links (Google Drive, Unsplash, YouTube, etc.) are not managed here and are never treated as cloud media.'
          )}
        </p>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <section className={`rounded-xl border p-4 ${uploadsEnabled ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/70'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
              <HardDrive size={15} className={uploadsEnabled ? 'text-emerald-600' : 'text-amber-600'} />
              {L('媒体上传功能', 'Media Uploads')}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${uploadsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {uploadsEnabled ? L('已启用', 'Enabled') : L('暂时停用', 'Temporarily disabled')}
              </span>
            </h3>
            <p className="text-[11px] text-gray-600 leading-relaxed max-w-2xl">
              {uploadsEnabled
                ? L('媒体上传已启用。请确认 Cloudflare Pages 的 MEDIA_PUBLIC_URL 已指向可用的云端媒体域名。', 'Media uploads are enabled. Confirm that Cloudflare Pages MEDIA_PUBLIC_URL points to a working public media domain.')
                : L('在媒体域名准备好前，所有编辑表单的“上传文件”按钮都会保持停用；粘贴现有或外部公开 URL 不受影响。', 'Until the media domain is ready, every editor’s “Upload file” button stays disabled. Pasting existing or external public URLs is unaffected.')}
            </p>
          </div>
          <label className="inline-flex items-center gap-3 cursor-pointer shrink-0">
            <span className="text-xs font-bold text-gray-700">{L('启用媒体上传', 'Enable Media Uploads')}</span>
            <input
              type="checkbox"
              checked={uploadsEnabled}
              onChange={(event) => onUploadsEnabledChange?.(event.target.checked)}
              disabled={!onUploadsEnabledChange}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-emerald-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </section>

      {status === 'error' && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-xs font-semibold flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" /> {error}
          </span>
          <button onClick={load} className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5">
            <RefreshCw size={13} /> {L('重试', 'Retry')}
          </button>
        </div>
      )}

      {noMediaBase && (
        <div className="bg-amber-50 text-amber-700 border border-amber-200 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2">
          <Info size={15} className="shrink-0 mt-0.5" />
          {L(
            '未配置 MEDIA_PUBLIC_URL，文件没有公开 URL，引用检测与复制 URL 已停用。请在 Cloudflare Pages 配置云端媒体自定义域名。',
            'MEDIA_PUBLIC_URL is not configured, so files have no public URL and reference detection / copy-URL are disabled. Configure the custom public media domain in Cloudflare Pages.'
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw size={24} className="animate-spin" />
          <span className="text-xs font-semibold">{L('正在加载媒体存储…', 'Loading media storage…')}</span>
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <StorageMeter meta={meta} L={L} />
              <StatCards meta={meta} L={L} />
            </div>
            <div className="space-y-4">
              <CategoryBreakdown meta={meta} L={L} />
              {/* Reference scan status */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 size={15} className="text-primary" />
                  <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    {L('引用检查', 'Reference check')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {L(
                    '比对当前保存的网站内容，识别哪些云端媒体文件正在被使用。受引用文件永远不会被永久删除。',
                    'Compares the currently saved site content to detect which cloud media files are in use. Referenced files can never be permanently deleted.'
                  )}
                </p>
                <div className="text-[11px] text-gray-600 space-y-1">
                  <div>
                    {L('最近扫描', 'Last scan')}:{' '}
                    <span className="font-semibold text-gray-800">{lastScanAt ? `${formatDate(lastScanAt, lang)} (${timeAgo(lastScanAt, L)})` : L('尚未扫描', 'not yet')}</span>
                  </div>
                  {scanInfo?.referencedCount !== undefined && (
                    <div>
                      {L('被引用文件', 'Referenced files')}:{' '}
                      <span className="font-semibold text-emerald-700">{scanInfo.referencedCount}</span>
                      <span className="text-gray-400"> / {files.length}</span>
                    </div>
                  )}
                  {scanInfo?.error && <div className="text-red-600 font-semibold">{scanInfo.error}</div>}
                </div>
                <button
                  onClick={runScan}
                  disabled={scanning}
                  className="w-full py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
                  {scanning ? L('扫描中…', 'Scanning…') : L('重新扫描引用', 'Re-scan references')}
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={L('搜索文件名、key、类型…', 'Search filename, key, type…')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                  {Object.keys(SORT_LABELS).map((m) => (
                    <option key={m} value={m}>{SORT_LABELS[m][lang2(L)]}</option>
                  ))}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">{L('全部分类', 'All categories')}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c][lang2(L)]}</option>
                  ))}
                </select>
                <select value={trashFilter} onChange={(e) => setTrashFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">{L('全部状态', 'All states')}</option>
                  <option value="live">{L('在用', 'Live')}</option>
                  <option value="trash">{L('回收站', 'Trash')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setUnusedOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                  unusedOnly ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <SearchX size={13} />
                {L('仅显示未使用', 'Find unused uploads')}
              </button>
              <span className="text-[11px] text-gray-400 font-semibold ml-auto">
                {L(`显示 ${visibleFiles.length} / ${files.length} 个文件`, `Showing ${visibleFiles.length} of ${files.length} files`)}
              </span>
              <button
                onClick={() => setConfirm({ kind: 'reconcile' })}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Database size={13} />
                {L('重建索引', 'Reconcile index')}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {L(
                `未使用的上传（超过 ${UNUSED_REVIEW_DAYS} 天且未被引用）仅会被标记供人工检查，绝不会自动删除。回收站文件至少保留 ${TRASH_RETENTION_DAYS} 天。`,
                `Unused uploads (older than ${UNUSED_REVIEW_DAYS} days and unreferenced) are only flagged for manual review — never auto-deleted. Trashed files are kept for at least ${TRASH_RETENTION_DAYS} days.`
              )}
            </p>
          </div>

          {/* File list */}
          {visibleFiles.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center gap-3 text-gray-400 text-center">
              <Archive size={28} />
              <p className="text-xs font-semibold">
                {files.length === 0
                  ? L('还没有上传任何媒体。在任意编辑表单中使用“Upload file”即可上传到云端媒体存储。', 'No media uploaded yet. Use “Upload file” in any edit form to upload to cloud media storage.')
                  : L('没有符合当前筛选条件的文件。', 'No files match the current filters.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleFiles.map((file) => {
                const isReferenced = referenced.get(file.key);
                const isReview = reviewEligible.has(file.key);
                const isProtected = PROTECTED_CATEGORIES.includes(file.category);
                const usedList = locations.get(file.key) || [];
                return (
                  <div
                    key={file.key}
                    className={`bg-white rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center gap-3 ${
                      file.trash ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
                    }`}
                  >
                    <MediaThumb file={file} L={L} />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-800 break-all">{fileName(file.key)}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{file.category}</span>
                        {file.trash ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Trash size={10} /> {L('回收站', 'Trash')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{L('在用', 'Live')}</span>
                        )}
                        {isReferenced ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1" title={L('正在被网站内容引用', 'Referenced by site content')}>
                            <Link2 size={10} /> {L('被引用', 'Referenced')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{L('未引用', 'Unreferenced')}</span>
                        )}
                        {isReview && !file.trash && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1" title={L('超过 7 天未使用的上传，供人工检查', 'Unused upload older than 7 days — for manual review')}>
                            <Info size={10} /> {L('可检查', 'Review')}
                          </span>
                        )}
                        {isProtected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 flex items-center gap-1" title={L('受保护的存档分类', 'Protected archival category')}>
                            <Archive size={10} /> {L('受保护', 'Protected')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 break-all">{file.key}</div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{formatBytes(file.size)}</span>
                        <span>·</span>
                        <span>{L('上传于', 'Uploaded')} {formatDate(file.uploadedAt, lang)}</span>
                        {file.trash && file.trashAt && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600">{L('移入回收站', 'Trashed')} {formatDate(file.trashAt, lang)}</span>
                          </>
                        )}
                        {usedList.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-blue-600">{L(`${usedList.length} 处使用`, `${usedList.length} use(s)`)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyUrl(file)}
                        disabled={!file.url}
                        title={L('复制不可变媒体 URL', 'Copy immutable media URL')}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Copy size={14} />
                      </button>
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          title={L('在新标签打开', 'Open in new tab')}
                          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => setWhereUsedFile(file)}
                        title={L('查看使用位置', 'View where used')}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <Eye size={14} />
                      </button>
                      {file.trash ? (
                        <>
                          <button
                            onClick={() => restore(file)}
                            disabled={busy}
                            title={L('恢复文件', 'Restore file')}
                            className="p-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => setPurgeFile(file)}
                            disabled={busy}
                            title={L('永久删除（需确认）', 'Permanently delete (requires confirmation)')}
                            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirm({ kind: 'trash', file })}
                          disabled={busy}
                          title={L('移到回收站', 'Move to trash')}
                          className="p-2 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        config={confirm}
        L={L}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === 'trash') moveToTrash(confirm.file);
          else if (confirm?.kind === 'reconcile') reconcile();
        }}
      />
      <PurgeDialog
        file={purgeFile}
        referenced={purgeFile ? referenced.get(purgeFile.key) : false}
        L={L}
        busy={busy}
        onCancel={() => setPurgeFile(null)}
        onConfirm={(override) => purge(purgeFile, override)}
      />
      <WhereUsedModal
        file={whereUsedFile}
        locations={whereUsedFile ? locations.get(whereUsedFile.key) : []}
        L={L}
        onClose={() => setWhereUsedFile(null)}
      />
    </div>
  );
}
