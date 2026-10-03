import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  AirVent,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  CheckCircle,
  ClipboardList,
  Clock,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  BOOKING_STATUS,
  buildTelLink,
  buildWhatsAppLink,
  bookingSummaryText,
  durationLabel,
  formatDateLong,
  formatTime12,
  todayISO,
} from '../lib/bookingCore';

const BOOKINGS_ENDPOINT = '/functions/bookings';

const STATUS_STYLES = {
  [BOOKING_STATUS.PENDING]: 'bg-amber-100 text-amber-800 border-amber-200',
  [BOOKING_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [BOOKING_STATUS.REJECTED]: 'bg-rose-100 text-rose-700 border-rose-200',
  [BOOKING_STATUS.COMPLETED]: 'bg-gray-200 text-gray-700 border-gray-300',
  [BOOKING_STATUS.CANCELLED]: 'bg-gray-100 text-gray-500 border-gray-200',
};

function statusLabel(status, lang) {
  const map = {
    [BOOKING_STATUS.PENDING]: { zh: '待审核', en: 'Pending' },
    [BOOKING_STATUS.APPROVED]: { zh: '已批准', en: 'Approved' },
    [BOOKING_STATUS.REJECTED]: { zh: '已拒绝', en: 'Rejected' },
    [BOOKING_STATUS.COMPLETED]: { zh: '已完成', en: 'Completed' },
    [BOOKING_STATUS.CANCELLED]: { zh: '已取消', en: 'Cancelled' },
  };
  const entry = map[status];
  if (!entry) return status;
  return lang === 'zh' ? entry.zh : entry.en;
}

const inputCls =
  'w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none';

function BilingualField({ label, value, onChange, textarea = false, rows = 3 }) {
  const v = value || { zh: '', en: '' };
  const Component = textarea ? 'textarea' : 'input';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-bold text-gray-600 mb-1">{label} (中文)</label>
        <Component
          {...(textarea ? { rows } : { type: 'text' })}
          value={v.zh || ''}
          onChange={(e) => onChange({ ...v, zh: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-600 mb-1">{label} (English)</label>
        <Component
          {...(textarea ? { rows } : { type: 'text' })}
          value={v.en || ''}
          onChange={(e) => onChange({ ...v, en: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  );
}

export default function VenueBookingAdmin({ data, lang, t, saveAllData, onToast, onPendingCountChange }) {
  const config = data?.venueBooking || {};
  const [tab, setTab] = useState('requests');

  // --- requests state ---
  const [bookings, setBookings] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | unauthenticated | unavailable | error
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [conflictPrompt, setConflictPrompt] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // --- settings draft ---
  const [draft, setDraft] = useState(config);
  const [draftDirty, setDraftDirty] = useState(false);

  useEffect(() => {
    setDraft(config);
    setDraftDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.venueBooking]);

  const loadBookings = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const res = await fetch(`${BOOKINGS_ENDPOINT}?scope=admin`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.status === 401) {
        setLoadState('unauthenticated');
        return;
      }
      if (res.status === 503 || res.status === 404) {
        // 503 = KV binding missing, 404 = Pages Functions not deployed here.
        setLoadState('unavailable');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      if (!payload?.ok) throw new Error(payload?.message || 'Unexpected response');
      const list = Array.isArray(payload.bookings) ? payload.bookings : [];
      setBookings(list);
      setLoadState('ready');
      onPendingCountChange?.(list.filter((item) => item.status === BOOKING_STATUS.PENDING).length);
    } catch (err) {
      setLoadState('error');
      setLoadError(err?.message || 'Network error');
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === BOOKING_STATUS.PENDING).length,
    [bookings]
  );

  const today = todayISO();

  const stats = useMemo(() => {
    const upcoming = bookings.filter(
      (booking) =>
        booking.date >= today &&
        [BOOKING_STATUS.APPROVED, BOOKING_STATUS.PENDING].includes(booking.status)
    );
    return {
      pending: bookings.filter((b) => b.status === BOOKING_STATUS.PENDING).length,
      approved: bookings.filter((b) => b.status === BOOKING_STATUS.APPROVED).length,
      upcoming: upcoming.length,
      total: bookings.length,
    };
  }, [bookings, today]);

  const venueOptions = useMemo(() => (Array.isArray(config.venues) ? config.venues : []), [config.venues]);

  const venueLabel = useCallback(
    (booking) => {
      const found = venueOptions.find((venue) => venue.id === booking.venueId);
      if (found) return t(found.name);
      const label = booking.venueLabel;
      if (label && (label.zh || label.en)) return t(label);
      return booking.venueId;
    },
    [venueOptions, t]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
      if (venueFilter !== 'all' && booking.venueId !== venueFilter) return false;
      if (dateFilter && booking.date !== dateFilter) return false;
      if (!query) return true;
      return [booking.ref, booking.name, booking.phone, booking.email, booking.reason, booking.venueOther]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [bookings, statusFilter, venueFilter, dateFilter, search]);

  const updateBookingInList = (updated) => {
    setBookings((prev) => {
      const next = prev.map((booking) => (booking.id === updated.id ? updated : booking));
      onPendingCountChange?.(next.filter((item) => item.status === BOOKING_STATUS.PENDING).length);
      return next;
    });
  };

  const runAction = async (booking, action, { note = '', force = false } = {}) => {
    setBusyId(booking.id);
    try {
      const res = await fetch(BOOKINGS_ENDPOINT, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: booking.id, action, note, force }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.status === 409 && payload?.error === 'conflict') {
        setConflictPrompt({ booking, conflicts: payload.conflicts || [] });
        return;
      }
      if (!res.ok || !payload?.ok) {
        onToast?.(lang === 'zh'
          ? `操作失败：${payload?.error || res.status}`
          : `Action failed: ${payload?.error || res.status}`);
        return;
      }
      updateBookingInList(payload.booking);
      const messages = {
        approve: { zh: '申请已批准', en: 'Application approved' },
        reject: { zh: '申请已拒绝', en: 'Application rejected' },
        complete: { zh: '已标记为完成', en: 'Marked as completed' },
        cancel: { zh: '申请已取消', en: 'Application cancelled' },
        reopen: { zh: '已重新设为待审核', en: 'Moved back to pending' },
        note: { zh: '备注已保存', en: 'Note saved' },
      };
      onToast?.(lang === 'zh' ? messages[action]?.zh : messages[action]?.en);
    } catch (err) {
      onToast?.(lang === 'zh' ? '网络错误，请重试' : 'Network error, please retry');
    } finally {
      setBusyId(null);
      setConflictPrompt(null);
    }
  };

  const deleteBooking = async (booking) => {
    setBusyId(booking.id);
    try {
      const res = await fetch(`${BOOKINGS_ENDPOINT}?id=${encodeURIComponent(booking.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        onToast?.(lang === 'zh' ? '删除失败' : 'Delete failed');
        return;
      }
      setBookings((prev) => {
        const next = prev.filter((item) => item.id !== booking.id);
        onPendingCountChange?.(next.filter((item) => item.status === BOOKING_STATUS.PENDING).length);
        return next;
      });
      onToast?.(lang === 'zh' ? '申请记录已删除' : 'Application deleted');
    } catch (err) {
      onToast?.(lang === 'zh' ? '网络错误，请重试' : 'Network error, please retry');
    } finally {
      setBusyId(null);
    }
  };

  const copySummary = async (booking) => {
    const text = bookingSummaryText(booking, lang);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(booking.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      onToast?.(lang === 'zh' ? '复制失败，请手动选取文字' : 'Copy failed, please select the text manually');
    }
  };

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDraftDirty(true);
  };

  const updateDraftList = (key, index, nextItem) => {
    setDraft((prev) => {
      const list = Array.isArray(prev[key]) ? [...prev[key]] : [];
      list[index] = nextItem;
      return { ...prev, [key]: list };
    });
    setDraftDirty(true);
  };

  const addDraftItem = (key, item) => {
    setDraft((prev) => ({ ...prev, [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), item] }));
    setDraftDirty(true);
  };

  const removeDraftItem = (key, index) => {
    setDraft((prev) => {
      const list = Array.isArray(prev[key]) ? [...prev[key]] : [];
      list.splice(index, 1);
      return { ...prev, [key]: list };
    });
    setDraftDirty(true);
  };

  const moveDraftItem = (key, index, direction) => {
    setDraft((prev) => {
      const list = Array.isArray(prev[key]) ? [...prev[key]] : [];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, [key]: list };
    });
    setDraftDirty(true);
  };

  const saveDraft = () => {
    saveAllData({ ...data, venueBooking: draft });
    setDraftDirty(false);
  };

  /* ------------------------------------------------------------------ */

  const renderRequests = () => {
    if (loadState === 'unavailable') {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={16} />
            <span>{lang === 'zh' ? '尚未配置申请储存空间' : 'Booking storage is not configured yet'}</span>
          </div>
          <p className="leading-relaxed">
            {lang === 'zh'
              ? '请在 Cloudflare Pages 建立一个 KV namespace，并绑定为 BOOKINGS，然后重新部署网站。绑定后，弟兄姐妹提交的申请会显示在这里，供同工审核。'
              : 'Create a KV namespace in Cloudflare Pages and bind it as BOOKINGS, then redeploy. Applications submitted by members will then appear here for review.'}
          </p>
        </div>
      );
    }

    if (loadState === 'unauthenticated') {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-700">
          {lang === 'zh' ? '登录状态已过期，请重新登录后台。' : 'Your session has expired. Please sign in again.'}
        </div>
      );
    }

    if (loadState === 'error') {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-700 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={16} />
            <span>{lang === 'zh' ? '无法载入申请记录' : 'Could not load applications'}</span>
          </div>
          <p>{loadError}</p>
          <button onClick={loadBookings} className="px-3 py-1.5 rounded bg-white border border-rose-200 font-semibold">
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'pending', label: lang === 'zh' ? '待审核' : 'Pending', value: stats.pending, tone: 'amber' },
            { key: 'approved', label: lang === 'zh' ? '已批准' : 'Approved', value: stats.approved, tone: 'emerald' },
            { key: 'upcoming', label: lang === 'zh' ? '即将使用' : 'Upcoming', value: stats.upcoming, tone: 'blue' },
            { key: 'total', label: lang === 'zh' ? '全部记录' : 'All records', value: stats.total, tone: 'gray' },
          ].map((card) => (
            <div key={card.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">{card.label}</span>
              <span className="text-2xl font-extrabold text-gray-900">{card.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: lang === 'zh' ? '全部' : 'All' },
              ...Object.values(BOOKING_STATUS).map((status) => ({ id: status, label: statusLabel(status, lang) })),
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
                  statusFilter === chip.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-primary/60'
                }`}
              >
                {chip.label}
                {chip.id === BOOKING_STATUS.PENDING && pendingCount > 0 && statusFilter !== chip.id ? ` (${pendingCount})` : ''}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} className={inputCls}>
              <option value="all">{lang === 'zh' ? '全部场地' : 'All venues'}</option>
              {venueOptions.map((venue) => (
                <option key={venue.id} value={venue.id}>{t(venue.name)}</option>
              ))}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputCls} />
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'zh' ? '搜索编号 / 姓名 / 电话' : 'Search ref / name / phone'}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
          {(statusFilter !== 'all' || venueFilter !== 'all' || dateFilter || search) && (
            <button
              onClick={() => { setStatusFilter('all'); setVenueFilter('all'); setDateFilter(''); setSearch(''); }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              {lang === 'zh' ? '清除筛选' : 'Clear filters'}
            </button>
          )}
        </div>

        {/* List */}
        {loadState === 'loading' ? (
          <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {lang === 'zh' ? '正在载入申请记录…' : 'Loading applications…'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl bg-white">
            {lang === 'zh' ? '没有符合条件的申请记录。' : 'No applications match the current filters.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking) => {
              const expanded = expandedId === booking.id;
              const busy = busyId === booking.id;
              return (
                <div key={booking.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[booking.status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
                          {statusLabel(booking.status, lang)}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-gray-500">{booking.ref}</span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(booking.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', { hour12: false })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <CalendarDays size={13} className="text-primary" />
                          {formatDateLong(booking.date, lang)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-primary" />
                          {formatTime12(booking.startTime)} - {formatTime12(booking.endTime)} · {durationLabel(booking.durationHours, lang)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ClipboardList size={13} className="text-primary" />
                          {venueLabel(booking)}{booking.venueOther ? ` (${booking.venueOther})` : ''}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-primary" />
                          {booking.name} · {booking.phone}
                        </span>
                        {booking.aircon === 'yes' && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-600">
                            <AirVent size={13} />{lang === 'zh' ? '使用冷气' : 'Air-cond'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {busy && <Loader2 size={14} className="animate-spin text-gray-400" />}
                      {booking.status === BOOKING_STATUS.PENDING && (
                        <>
                          <button
                            onClick={() => runAction(booking, 'approve')}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                          >
                            <Check size={13} />{lang === 'zh' ? '批准' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectTarget(booking); setRejectNote(''); }}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle size={13} />{lang === 'zh' ? '拒绝' : 'Reject'}
                          </button>
                        </>
                      )}
                      {booking.status === BOOKING_STATUS.APPROVED && (
                        <button
                          onClick={() => runAction(booking, 'complete')}
                          disabled={busy}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle size={13} />{lang === 'zh' ? '标记完成' : 'Complete'}
                        </button>
                      )}
                      {[BOOKING_STATUS.REJECTED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(booking.status) && (
                        <button
                          onClick={() => runAction(booking, 'reopen')}
                          disabled={busy}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw size={13} />{lang === 'zh' ? '重新审核' : 'Reopen'}
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(expanded ? null : booking.id)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-[11px] font-semibold"
                      >
                        {expanded ? (lang === 'zh' ? '收起' : 'Hide') : (lang === 'zh' ? '详情' : 'Details')}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3 text-xs text-gray-700 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p><strong>{lang === 'zh' ? '申请人：' : 'Applicant: '}</strong>{booking.name}</p>
                          <p><strong>{lang === 'zh' ? '电话：' : 'Phone: '}</strong>{booking.phone}</p>
                          {booking.email && <p><strong>{lang === 'zh' ? '电邮：' : 'Email: '}</strong>{booking.email}</p>}
                          <p><strong>{lang === 'zh' ? '用途：' : 'Purpose: '}</strong>{booking.purpose === 'meeting' ? (lang === 'zh' ? '聚会用途' : 'Meeting use') : (lang === 'zh' ? '私人用途' : 'Private use')}</p>
                          <p><strong>{lang === 'zh' ? '人数：' : 'Headcount: '}</strong>{booking.headcount || '-'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p><strong>{lang === 'zh' ? '冷气：' : 'Air conditioning: '}</strong>{booking.aircon === 'yes' ? (lang === 'zh' ? '是' : 'Yes') : (lang === 'zh' ? '否' : 'No')}</p>
                          <p><strong>{lang === 'zh' ? '已通知负责人：' : 'Leaders notified: '}</strong>
                            {(booking.leadersNotified || []).length === 0
                              ? '-'
                              : booking.leadersNotified.map((leader) => t(leader.label) || leader.id).join('、')}
                          </p>
                          {booking.adminNote && (
                            <p><strong>{lang === 'zh' ? '同工备注：' : 'Admin note: '}</strong>{booking.adminNote}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <strong>{lang === 'zh' ? '租借原因：' : 'Reason: '}</strong>
                        <p className="whitespace-pre-line mt-1 text-gray-600">{booking.reason}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                        <a
                          href={buildWhatsAppLink(booking.phone, bookingSummaryText(booking, lang))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1.5"
                        >
                          <MessageCircle size={13} />{lang === 'zh' ? 'WhatsApp 申请人' : 'WhatsApp applicant'}
                        </a>
                        <a
                          href={buildTelLink(booking.phone)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-[11px] font-semibold flex items-center gap-1.5"
                        >
                          <Phone size={13} />{lang === 'zh' ? '致电' : 'Call'}
                        </a>
                        <button
                          onClick={() => copySummary(booking)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-[11px] font-semibold flex items-center gap-1.5"
                        >
                          {copiedId === booking.id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedId === booking.id ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制详情' : 'Copy details')}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(lang === 'zh' ? `确定删除申请 ${booking.ref}？此操作无法复原。` : `Delete application ${booking.ref}? This cannot be undone.`)) {
                              deleteBooking(booking);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 text-[11px] font-semibold flex items-center gap-1.5"
                        >
                          <Trash2 size={13} />{lang === 'zh' ? '删除' : 'Delete'}
                        </button>
                        {!booking.adminNote && (
                          <button
                            onClick={() => {
                              const note = window.prompt(lang === 'zh' ? '输入给同工的备注：' : 'Admin note:');
                              if (note !== null) runAction(booking, 'note', { note });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-[11px] font-semibold flex items-center gap-1.5"
                          >
                            <Bell size={13} />{lang === 'zh' ? '添加备注' : 'Add note'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">{lang === 'zh' ? '场地租借设置' : 'Venue Booking Settings'}</h2>
          <p className="text-xs text-gray-500 font-light mt-1">
            {lang === 'zh'
              ? '调整申请规则、可借场地、服侍负责人与开放时段。所有文字同时支援中英文。'
              : 'Manage rules, venues, serving leaders and opening hours. All text supports Chinese and English.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draftDirty && (
            <span className="text-[11px] font-semibold text-amber-600">
              {lang === 'zh' ? '有未保存的修改' : 'Unsaved changes'}
            </span>
          )}
          <button
            onClick={saveDraft}
            disabled={!draftDirty}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              draftDirty ? 'bg-primary hover:bg-primary-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            {lang === 'zh' ? '保存设置' : 'Save settings'}
          </button>
        </div>
      </div>

      {/* Basics */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Settings size={14} />{lang === 'zh' ? '基本设置' : 'General'}
        </h3>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3">
          <div>
            <span className="text-xs font-bold text-gray-800 block">{lang === 'zh' ? '启用场地租借功能' : 'Enable venue booking'}</span>
            <span className="text-[10px] text-gray-500">
              {lang === 'zh' ? '关闭后，导航与页面将隐藏此功能（申请记录仍保留）。' : 'When off, the page is hidden from navigation (records are kept).'}
            </span>
          </div>
          <button
            onClick={() => updateDraft({ enabled: draft.enabled !== false ? false : true })}
            className={`relative w-12 h-6 rounded-full transition-all ${draft.enabled !== false ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${draft.enabled !== false ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '最少提前天数' : 'Min. advance days'}</label>
            <input
              type="number" min="0" max="30"
              value={draft.advanceDays ?? 2}
              onChange={(e) => updateDraft({ advanceDays: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '开放时间' : 'Opening time'}</label>
            <input type="time" value={draft.openTime || '08:00'} onChange={(e) => updateDraft({ openTime: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '关闭时间' : 'Closing time'}</label>
            <input type="time" value={draft.closeTime || '22:00'} onChange={(e) => updateDraft({ closeTime: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '最长时长（小时）' : 'Max duration (hours)'}</label>
            <input
              type="number" min="1" max="12"
              value={draft.maxDurationHours ?? 4}
              onChange={(e) => updateDraft({ maxDurationHours: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '时段间隔（分钟）' : 'Slot interval (minutes)'}</label>
            <select
              value={draft.slotMinutes ?? 30}
              onChange={(e) => updateDraft({ slotMinutes: Number(e.target.value) })}
              className={inputCls}
            >
              {[15, 30, 60].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '联络电话' : 'Contact phone'}</label>
            <input type="text" value={draft.contactPhone || ''} onChange={(e) => updateDraft({ contactPhone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? 'WhatsApp 号码' : 'WhatsApp number'}</label>
            <input type="text" value={draft.whatsapp || ''} onChange={(e) => updateDraft({ whatsapp: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'zh' ? '可借时长选项' : 'Duration options'}</label>
            <input
              type="text"
              value={(draft.durations || []).join(', ')}
              onChange={(e) => updateDraft({
                durations: e.target.value
                  .split(',')
                  .map((value) => Number(value.trim()))
                  .filter((value) => Number.isFinite(value) && value > 0),
              })}
              placeholder="1, 2, 3, 4"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Text copy */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{lang === 'zh' ? '页面文案' : 'Page copy'}</h3>
        <BilingualField label={lang === 'zh' ? '页首标签' : 'Badge'} value={draft.badge} onChange={(v) => updateDraft({ badge: v })} />
        <BilingualField label={lang === 'zh' ? '页面标题' : 'Title'} value={draft.title} onChange={(v) => updateDraft({ title: v })} />
        <BilingualField label={lang === 'zh' ? '简介' : 'Intro'} value={draft.intro} onChange={(v) => updateDraft({ intro: v })} textarea rows={3} />
        <BilingualField label={lang === 'zh' ? '规则标题' : 'Rules title'} value={draft.rulesTitle} onChange={(v) => updateDraft({ rulesTitle: v })} />
        <BilingualField label={lang === 'zh' ? '表格标题' : 'Form title'} value={draft.formTitle} onChange={(v) => updateDraft({ formTitle: v })} />
        <BilingualField label={lang === 'zh' ? '表格说明' : 'Form intro'} value={draft.formIntro} onChange={(v) => updateDraft({ formIntro: v })} textarea rows={2} />
        <BilingualField label={lang === 'zh' ? '可用时段标题' : 'Availability title'} value={draft.availabilityTitle} onChange={(v) => updateDraft({ availabilityTitle: v })} />
        <BilingualField label={lang === 'zh' ? '可用时段说明' : 'Availability hint'} value={draft.availabilityHint} onChange={(v) => updateDraft({ availabilityHint: v })} textarea rows={3} />
        <BilingualField label={lang === 'zh' ? '负责人确认标题' : 'Leader confirmation title'} value={draft.leadersTitle} onChange={(v) => updateDraft({ leadersTitle: v })} />
        <BilingualField label={lang === 'zh' ? '负责人确认说明' : 'Leader confirmation intro'} value={draft.leadersIntro} onChange={(v) => updateDraft({ leadersIntro: v })} textarea rows={2} />
        <BilingualField label={lang === 'zh' ? '提交后标题' : 'After-submit title'} value={draft.afterSubmitTitle} onChange={(v) => updateDraft({ afterSubmitTitle: v })} />
        <BilingualField label={lang === 'zh' ? '提交后说明' : 'After-submit note'} value={draft.afterSubmitNote} onChange={(v) => updateDraft({ afterSubmitNote: v })} textarea rows={2} />
        <BilingualField label={lang === 'zh' ? '联络标题' : 'Contact title'} value={draft.contactTitle} onChange={(v) => updateDraft({ contactTitle: v })} />
        <BilingualField label={lang === 'zh' ? '联络说明' : 'Contact note'} value={draft.contactNote} onChange={(v) => updateDraft({ contactNote: v })} />
        <BilingualField label={lang === 'zh' ? '场地选择标题' : 'Venue picker title'} value={draft.venuesTitle} onChange={(v) => updateDraft({ venuesTitle: v })} />
      </div>

      {/* Venues */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {lang === 'zh' ? '可借场地' : 'Venues'} ({(draft.venues || []).length})
          </h3>
          <button
            onClick={() => addDraftItem('venues', {
              id: `venue-${Date.now().toString(36)}`,
              name: { zh: '新场地', en: 'New Venue' },
              note: { zh: '', en: '' },
            })}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center gap-1"
          >
            <Plus size={13} />{lang === 'zh' ? '添加场地' : 'Add venue'}
          </button>
        </div>
        <div className="space-y-3">
          {(draft.venues || []).map((venue, index) => (
            <div key={venue.id || index} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={venue.id || ''}
                  onChange={(e) => updateDraftList('venues', index, { ...venue, id: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() })}
                  className={`${inputCls} w-40 font-mono`}
                  title="ID"
                />
                <div className="flex-1" />
                <button onClick={() => moveDraftItem('venues', index, 'up')} disabled={index === 0} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={13} /></button>
                <button onClick={() => moveDraftItem('venues', index, 'down')} disabled={index === (draft.venues || []).length - 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={13} /></button>
                <button onClick={() => removeDraftItem('venues', index)} className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
              </div>
              <BilingualField label={lang === 'zh' ? '场地名称' : 'Venue name'} value={venue.name} onChange={(v) => updateDraftList('venues', index, { ...venue, name: v })} />
              <BilingualField label={lang === 'zh' ? '场地说明' : 'Venue note'} value={venue.note} onChange={(v) => updateDraftList('venues', index, { ...venue, note: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {lang === 'zh' ? '申请规则' : 'Rules'} ({(draft.rules || []).length})
          </h3>
          <button
            onClick={() => addDraftItem('rules', {
              id: `rule-${Date.now().toString(36)}`,
              title: { zh: '新规则', en: 'New rule' },
              body: { zh: '', en: '' },
            })}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center gap-1"
          >
            <Plus size={13} />{lang === 'zh' ? '添加规则' : 'Add rule'}
          </button>
        </div>
        <div className="space-y-3">
          {(draft.rules || []).map((rule, index) => (
            <div key={rule.id || index} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400">#{index + 1}</span>
                <div className="flex-1" />
                <button onClick={() => moveDraftItem('rules', index, 'up')} disabled={index === 0} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={13} /></button>
                <button onClick={() => moveDraftItem('rules', index, 'down')} disabled={index === (draft.rules || []).length - 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={13} /></button>
                <button onClick={() => removeDraftItem('rules', index)} className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
              </div>
              <BilingualField label={lang === 'zh' ? '规则标题' : 'Rule title'} value={rule.title} onChange={(v) => updateDraftList('rules', index, { ...rule, title: v })} />
              <BilingualField label={lang === 'zh' ? '规则内容' : 'Rule body'} value={rule.body} onChange={(v) => updateDraftList('rules', index, { ...rule, body: v })} textarea rows={4} />
            </div>
          ))}
        </div>
      </div>

      {/* Leaders */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {lang === 'zh' ? '服侍负责人' : 'Serving leaders'} ({(draft.leaders || []).length})
          </h3>
          <button
            onClick={() => addDraftItem('leaders', {
              id: `leader-${Date.now().toString(36)}`,
              label: { zh: '负责人', en: 'Leader' },
              phone: '',
            })}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center gap-1"
          >
            <Plus size={13} />{lang === 'zh' ? '添加负责人' : 'Add leader'}
          </button>
        </div>
        <div className="space-y-3">
          {(draft.leaders || []).map((leader, index) => (
            <div key={leader.id || index} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={leader.phone || ''}
                  onChange={(e) => updateDraftList('leaders', index, { ...leader, phone: e.target.value })}
                  placeholder={lang === 'zh' ? '电话' : 'Phone'}
                  className={`${inputCls} w-40`}
                />
                <div className="flex-1" />
                <button onClick={() => moveDraftItem('leaders', index, 'up')} disabled={index === 0} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={13} /></button>
                <button onClick={() => moveDraftItem('leaders', index, 'down')} disabled={index === (draft.leaders || []).length - 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={13} /></button>
                <button onClick={() => removeDraftItem('leaders', index)} className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
              </div>
              <BilingualField label={lang === 'zh' ? '职称与姓名' : 'Role & name'} value={leader.label} onChange={(v) => updateDraftList('leaders', index, { ...leader, label: v })} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveDraft}
          disabled={!draftDirty}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            draftDirty ? 'bg-primary hover:bg-primary-dark text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save size={14} />
          {lang === 'zh' ? '保存设置' : 'Save settings'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">
            {lang === 'zh' ? '场地租借管理' : 'Venue Booking Manager'}
          </h2>
          <p className="text-xs text-gray-500 font-light mt-1">
            {lang === 'zh'
              ? '审核弟兄姐妹的场地申请，并管理可借场地、规则与开放时段。'
              : 'Review member applications and manage venues, rules and opening hours.'}
          </p>
        </div>
        {tab === 'requests' && (
          <button
            onClick={loadBookings}
            className="px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loadState === 'loading' ? 'animate-spin' : ''} />
            {lang === 'zh' ? '刷新' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'requests', label: lang === 'zh' ? '申请记录' : 'Applications', badge: pendingCount },
          { id: 'settings', label: lang === 'zh' ? '场地与规则设置' : 'Venue & Rules' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px flex items-center gap-2 transition-all ${
              tab === item.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.label}
            {item.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'requests' ? renderRequests() : renderSettings()}

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRejectTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-extrabold text-sm text-gray-900">
                {lang === 'zh' ? `拒绝申请 ${rejectTarget.ref}？` : `Reject application ${rejectTarget.ref}?`}
              </h3>
              <button onClick={() => setRejectTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                {lang === 'zh' ? '拒绝原因（会记录给同工参考）' : 'Reason (stored for co-workers)'}
              </label>
              <textarea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold">
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => { runAction(rejectTarget, 'reject', { note: rejectNote }); setRejectTarget(null); }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {lang === 'zh' ? '确认拒绝' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict dialog */}
      {conflictPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConflictPrompt(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">
                  {lang === 'zh' ? '此时段已有其他已批准的申请' : 'Another approved booking overlaps'}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {lang === 'zh'
                    ? '批准这份申请会造成同一场地、同一时段重复使用。若您已与申请人及同工协调好，仍可强制批准。'
                    : 'Approving would double-book the venue. If you have coordinated with both parties, you may force approve.'}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
              {conflictPrompt.conflicts.map((slot, index) => (
                <div key={`${slot.date}-${slot.startTime}-${index}`}>
                  {formatDateLong(slot.date, lang)} · {formatTime12(slot.startTime)} ({durationLabel(slot.durationHours, lang)})
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConflictPrompt(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold">
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => runAction(conflictPrompt.booking, 'approve', { force: true })}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                {lang === 'zh' ? '强制批准' : 'Force approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
