import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  AirVent,
  Building,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import {
  BOOKING_STATUS,
  addDaysISO,
  buildSlotGrid,
  buildTelLink,
  buildWhatsAppLink,
  countBookingsByDate,
  formatDateLong,
  formatTime12,
  minutesToTime,
  parseTimeToMinutes,
  todayISO,
  durationLabel,
  findConflicts,
  bookingSummaryText,
  validateBookingRequest,
} from '../lib/bookingCore';

const BOOKINGS_ENDPOINT = '/functions/bookings';
const DAY_STRIP_LENGTH = 21;
const RANGE_DAYS = 45;

/** Form field -> error message, mirroring the codes returned by bookingCore. */
const ERROR_MESSAGES = {
  required: { zh: '此栏为必填', en: 'This field is required' },
  too_long: { zh: '内容太长，请缩短', en: 'Too long, please shorten' },
  invalid_phone: { zh: '请输入有效的联络电话', en: 'Please enter a valid phone number' },
  invalid_email: { zh: '请输入有效的电邮地址', en: 'Please enter a valid email address' },
  invalid_date: { zh: '请选择有效日期', en: 'Please pick a valid date' },
  too_soon: { zh: '需至少提前两天申请', en: 'Must be applied at least 2 days in advance' },
  too_far: { zh: '申请日期太远，请先联系同工', en: 'Date is too far ahead, please contact a co-worker' },
  invalid_time: { zh: '请选择有效时间', en: 'Please pick a valid time' },
  outside_hours: { zh: '所选时间不在开放时段内', en: 'Selected time is outside opening hours' },
  past_closing: { zh: '结束时间超过场地关闭时间', en: 'The booking would end after closing time' },
  too_long_duration: { zh: '时长超出上限', en: 'Duration exceeds the limit' },
  invalid_number: { zh: '请输入有效人数', en: 'Please enter a valid number' },
  too_many: { zh: '人数超出上限', en: 'Headcount exceeds the limit' },
  invalid: { zh: '请检查此栏', en: 'Please check this field' },
};

function errorText(code, lang) {
  const entry = ERROR_MESSAGES[code];
  if (!entry) return lang === 'zh' ? '请检查此栏' : 'Please check this field';
  return lang === 'zh' ? entry.zh : entry.en;
}

function FieldLabel({ children, required = true, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

function inputStateClass(hasError) {
  return `${inputClass} ${hasError ? 'border-rose-300 bg-rose-50/40' : 'border-gray-300 bg-white'}`;
}

export default function VenueBookingPage({ data, lang, t }) {
  const config = data?.venueBooking || {};
  const venues = useMemo(() => (Array.isArray(config.venues) ? config.venues : []), [config.venues]);
  const purposeOptions = useMemo(
    () => (Array.isArray(config.purposeOptions) && config.purposeOptions.length
      ? config.purposeOptions
      : [
          { id: 'private', label: { zh: '私人用途', en: 'For Private Use' } },
          { id: 'meeting', label: { zh: '聚会用途', en: 'For Meeting Use' } },
        ]),
    [config.purposeOptions]
  );
  const durations = useMemo(
    () => (Array.isArray(config.durations) && config.durations.length ? config.durations : [1, 2, 3, 4]),
    [config.durations]
  );

  const today = useMemo(() => todayISO(), []);
  const advanceDays = Number.isFinite(Number(config.advanceDays)) ? Math.max(0, Number(config.advanceDays)) : 2;
  const minDate = useMemo(() => addDaysISO(today, advanceDays), [today, advanceDays]);

  const [rulesOpen, setRulesOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(minDate);
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id || '');
  const [busySlots, setBusySlots] = useState([]);
  const [availabilityState, setAvailabilityState] = useState('loading'); // loading | ready | unavailable | error
  const [availabilityError, setAvailabilityError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    venueId: venues[0]?.id || '',
    venueOther: '',
    purpose: purposeOptions[0]?.id || 'private',
    reason: '',
    aircon: '',
    date: minDate,
    startTime: '',
    durationHours: durations[0] || 1,
    headcount: '',
    leadersNotified: [],
    agree: false,
    website: '',
  });
  const [errors, setErrors] = useState({});
  const [pendingAck, setPendingAck] = useState(false);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [submitError, setSubmitError] = useState('');
  const [serverConflicts, setServerConflicts] = useState([]);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);
  const successRef = useRef(null);

  /* ---------------- availability fetching ---------------- */

  const loadAvailability = useCallback(async () => {
    setAvailabilityState('loading');
    setAvailabilityError('');
    try {
      const from = today;
      const to = addDaysISO(today, RANGE_DAYS);
      const res = await fetch(`${BOOKINGS_ENDPOINT}?from=${from}&to=${to}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.status === 503 || res.status === 404) {
        // 503 = KV binding missing, 404 = Pages Functions not deployed at all
        // (for example on GitHub Pages or a plain `npm run dev` session).
        setAvailabilityState('unavailable');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      if (!payload?.ok) throw new Error(payload?.message || 'Unexpected response');
      setBusySlots(Array.isArray(payload.bookings) ? payload.bookings : []);
      setAvailabilityState('ready');
    } catch (err) {
      setAvailabilityState('error');
      setAvailabilityError(err?.message || 'Network error');
    }
  }, [today]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability, refreshKey]);

  const countsByDate = useMemo(() => countBookingsByDate(busySlots), [busySlots]);

  const dayStrip = useMemo(() => {
    const days = [];
    for (let i = 0; i < DAY_STRIP_LENGTH; i += 1) {
      const iso = addDaysISO(today, i);
      days.push({
        iso,
        available: iso >= minDate,
        counts: countsByDate[iso] || { total: 0, approved: 0, pending: 0 },
      });
    }
    return days;
  }, [today, minDate, countsByDate]);

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) || null;
  const venueSlots = useMemo(
    () => busySlots.filter((slot) => slot.venueId === selectedVenueId && slot.date === selectedDate),
    [busySlots, selectedVenueId, selectedDate]
  );

  const durationMinutes = Number(values.durationHours) * 60;
  const slotGrid = useMemo(
    () =>
      buildSlotGrid({
        openTime: config.openTime || '08:00',
        closeTime: config.closeTime || '22:00',
        slotMinutes: config.slotMinutes || 30,
        durationMinutes,
        busy: venueSlots,
      }),
    [config.openTime, config.closeTime, config.slotMinutes, durationMinutes, venueSlots]
  );

  const candidate = { venueId: selectedVenueId, date: values.date, startTime: values.startTime, durationHours: Number(values.durationHours) };
  const approvedConflicts = useMemo(
    () => findConflicts(candidate, busySlots, [BOOKING_STATUS.APPROVED]),
    [candidate.venueId, candidate.date, candidate.startTime, candidate.durationHours, busySlots]
  );
  const pendingConflicts = useMemo(
    () => findConflicts(candidate, busySlots, [BOOKING_STATUS.PENDING]),
    [candidate.venueId, candidate.date, candidate.startTime, candidate.durationHours, busySlots]
  );

  useEffect(() => {
    // A fresh slot selection resets the "I understand" acknowledgement.
    setPendingAck(false);
  }, [values.startTime, values.date, selectedVenueId, values.durationHours]);

  /* ---------------- form helpers ---------------- */

  const updateValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const selectDate = (iso) => {
    setSelectedDate(iso);
    updateValue('date', iso);
    updateValue('startTime', '');
  };

  const selectVenue = (venueId) => {
    setSelectedVenueId(venueId);
    updateValue('venueId', venueId);
    updateValue('startTime', '');
  };

  const selectSlot = (slot) => {
    if (slot.status === BOOKING_STATUS.APPROVED) return;
    updateValue('startTime', slot.startTime);
  };

  const toggleLeader = (leaderId) => {
    setValues((prev) => {
      const current = Array.isArray(prev.leadersNotified) ? prev.leadersNotified : [];
      const next = current.includes(leaderId)
        ? current.filter((id) => id !== leaderId)
        : [...current, leaderId];
      return { ...prev, leadersNotified: next };
    });
    setErrors((prev) => (prev.leadersNotified ? { ...prev, leadersNotified: undefined } : prev));
  };

  const selectedLeaderObjects = useMemo(() => {
    const list = Array.isArray(config.leaders) ? config.leaders : [];
    return list.filter((leader) => values.leadersNotified.includes(leader.id));
  }, [config.leaders, values.leadersNotified]);

  const endTimeLabel = useMemo(() => {
    const start = parseTimeToMinutes(values.startTime);
    if (start === null) return '';
    return formatTime12(minutesToTime(start + durationMinutes));
  }, [values.startTime, durationMinutes]);

  const blockingConflict = approvedConflicts.length > 0;
  const needsPendingAck = !blockingConflict && pendingConflicts.length > 0;
  const canSubmit =
    submitState !== 'submitting' &&
    !blockingConflict &&
    (!needsPendingAck || pendingAck);

  const validationPreview = useMemo(
    () => validateBookingRequest({ ...values, agree: values.agree === true }, config, { today }),
    [values, config, today]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitState === 'submitting') return;

    const { ok, errors: validationErrors } = validateBookingRequest(values, config, { today });
    if (!ok) {
      setErrors(validationErrors);
      setSubmitError(lang === 'zh' ? '请检查标红的栏位后再提交。' : 'Please check the highlighted fields before submitting.');
      setSubmitState('error');
      const firstKey = Object.keys(validationErrors)[0];
      if (firstKey && formRef.current) {
        const node = formRef.current.querySelector(`[data-field="${firstKey}"]`);
        if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (blockingConflict) {
      setSubmitState('error');
      setSubmitError(lang === 'zh'
        ? '此时段已被批准使用，请选择其他时间。'
        : 'This slot is already approved. Please choose another time.');
      return;
    }
    if (needsPendingAck && !pendingAck) {
      setSubmitState('error');
      setSubmitError(lang === 'zh'
        ? '请先确认您了解此时段已有其他申请。'
        : 'Please acknowledge that another application exists for this slot.');
      return;
    }

    setSubmitState('submitting');
    setSubmitError('');
    setServerConflicts([]);

    const payload = {
      ...values,
      headcount: values.headcount === '' ? null : Number(values.headcount),
      venueLabel: selectedVenue?.name || { zh: selectedVenueId, en: selectedVenueId },
      venueOther: values.venueId === 'other' ? values.venueOther : '',
      leadersNotified: selectedLeaderObjects.map((leader) => ({
        id: leader.id,
        label: leader.label,
        phone: leader.phone,
      })),
      lang,
      config: {
        advanceDays,
        openTime: config.openTime || '08:00',
        closeTime: config.closeTime || '22:00',
        maxDurationHours: config.maxDurationHours || 4,
        slotMinutes: config.slotMinutes || 30,
        contactPhone: config.contactPhone || '',
        whatsapp: config.whatsapp || '',
      },
    };

    try {
      const res = await fetch(BOOKINGS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 503 || res.status === 404) {
        setSubmitState('error');
        setAvailabilityState('unavailable');
        setSubmitError(lang === 'zh'
          ? '线上申请系统暂时无法使用，请直接通过 WhatsApp 或电话联系教会同工。'
          : 'The online application system is unavailable. Please contact a church co-worker directly by WhatsApp or phone.');
        return;
      }

      if (res.status === 409) {
        setSubmitState('error');
        setServerConflicts(Array.isArray(body?.conflicts) ? body.conflicts : []);
        setSubmitError(lang === 'zh'
          ? '抱歉，此时段刚被批准使用，请重新选择时间。'
          : 'Sorry, this slot has just been approved. Please choose another time.');
        setRefreshKey((key) => key + 1);
        return;
      }

      if (res.status === 400 && body?.errors) {
        setSubmitState('error');
        setErrors(body.errors);
        setSubmitError(lang === 'zh'
          ? '提交资料有误，请检查标红的栏位。'
          : 'Some details are invalid, please check the highlighted fields.');
        return;
      }

      if (!res.ok || !body?.ok) {
        setSubmitState('error');
        setSubmitError(body?.message || (lang === 'zh' ? '提交失败，请稍后再试或联系教会同工。' : 'Submission failed. Please try again or contact a co-worker.'));
        return;
      }

      setResult(body.booking);
      setSubmitState('success');
      setRefreshKey((key) => key + 1);
      setTimeout(() => {
        if (successRef.current?.scrollIntoView) {
          successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    } catch (err) {
      setSubmitState('error');
      setSubmitError(lang === 'zh'
        ? '网络连接失败，请检查网络后重试，或直接联系教会同工。'
        : 'Network error. Please check your connection or contact a co-worker directly.');
    }
  };

  const resetForm = () => {
    setValues({
      name: '',
      phone: '',
      email: '',
      venueId: venues[0]?.id || '',
      venueOther: '',
      purpose: purposeOptions[0]?.id || 'private',
      reason: '',
      aircon: '',
      date: minDate,
      startTime: '',
      durationHours: durations[0] || 1,
      headcount: '',
      leadersNotified: [],
      agree: false,
      website: '',
    });
    setErrors({});
    setResult(null);
    setSubmitState('idle');
    setSubmitError('');
    setServerConflicts([]);
    setSelectedDate(minDate);
    setSelectedVenueId(venues[0]?.id || '');
    setPendingAck(false);
  };

  const whatsappNumber = config.whatsapp || config.contactPhone || data?.settings?.contactPhone || '';

  // Summary of the half-filled form, used when the member has to fall back to
  // WhatsApp because the online booking API is not reachable.
  const draftBooking = {
    ...values,
    ref: lang === 'zh' ? '（WhatsApp 提交）' : '(submitted via WhatsApp)',
    venueLabel: selectedVenue?.name || { zh: values.venueId, en: values.venueId },
    durationHours: Number(values.durationHours),
  };
  const contactPhone = config.contactPhone || data?.settings?.contactPhone || '';

  const whatsappMessage = result
    ? bookingSummaryText(result, lang) + (lang === 'zh' ? '\n\n请同工审核，谢谢！' : '\n\nPlease review, thank you!')
    : '';
  const whatsappLink = buildWhatsAppLink(whatsappNumber, whatsappMessage);
  const telLink = buildTelLink(contactPhone);

  const statusText = (status) => {
    if (status === BOOKING_STATUS.APPROVED) return lang === 'zh' ? '已被批准' : 'Approved';
    if (status === BOOKING_STATUS.PENDING) return lang === 'zh' ? '已有申请待审核' : 'Pending application';
    return lang === 'zh' ? '可申请' : 'Available';
  };

  /* ---------------- render: success panel ---------------- */

  if (submitState === 'success' && result) {
    return (
      <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto" ref={successRef}>
        <SectionCard className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {t(config.afterSubmitTitle) || (lang === 'zh' ? '申请已提交，等待同工审核' : 'Application submitted — pending review')}
          </h1>
          <p className="text-sm text-gray-600 font-light mt-3 max-w-2xl mx-auto">
            {t(config.afterSubmitNote) || (lang === 'zh'
              ? '场地是否批准，以教会同工的最终确认为准。'
              : 'Approval is subject to final confirmation by a church co-worker.')}
          </p>

          <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
              {lang === 'zh' ? '申请编号' : 'Reference number'}
            </span>
            <span className="text-xl font-extrabold text-gray-900 tracking-wider">{result.ref}</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5 mt-1">
              {lang === 'zh' ? '待审核' : 'Pending review'}
            </span>
          </div>

          <div className="mt-8 text-left rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                <strong>{lang === 'zh' ? '场地：' : 'Venue: '}</strong>
                {t(result.venueLabel) || result.venueId}
                {result.venueOther ? ` (${result.venueOther})` : ''}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                <strong>{lang === 'zh' ? '日期：' : 'Date: '}</strong>
                {formatDateLong(result.date, lang)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                <strong>{lang === 'zh' ? '时间：' : 'Time: '}</strong>
                {formatTime12(result.startTime)} - {formatTime12(result.endTime)} ({durationLabel(result.durationHours, lang)})
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AirVent size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                <strong>{lang === 'zh' ? '冷气：' : 'Air conditioning: '}</strong>
                {result.aircon === 'yes' ? (lang === 'zh' ? '使用' : 'Yes') : (lang === 'zh' ? '不使用' : 'No')}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Users size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                <strong>{lang === 'zh' ? '申请人：' : 'Applicant: '}</strong>
                {result.name} · {result.phone}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle size={16} />
                <span>{lang === 'zh' ? '转发给教会同工 (WhatsApp)' : 'Forward to co-worker (WhatsApp)'}</span>
              </a>
            )}
            {telLink && (
              <a
                href={telLink}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Phone size={16} />
                <span>{contactPhone}</span>
              </a>
            )}
            <button
              onClick={resetForm}
              className="px-5 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw size={16} />
              <span>{lang === 'zh' ? '提交另一份申请' : 'Submit another application'}</span>
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  /* ---------------- render: availability + form ---------------- */

  return (
    <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <span className="text-primary font-bold uppercase tracking-wider text-xs">
          {t(config.badge) || (lang === 'zh' ? '场地与设备借用' : 'Venue & Equipment Booking')}
        </span>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3">
          <Building className="text-primary" size={36} />
          <span>{t(config.title) || (lang === 'zh' ? '场地租借申请' : 'Venue Booking Application')}</span>
        </h1>
        <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">{t(config.intro)}</p>
      </div>

      <div className="space-y-8">
        {/* Rules */}
        <SectionCard>
          <button
            type="button"
            onClick={() => setRulesOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <span className="text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Info className="text-primary" size={20} />
              {t(config.rulesTitle) || (lang === 'zh' ? '📌 场地申请规则' : '📌 Venue Application Rules')}
            </span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
          </button>

          {rulesOpen && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(config.rules || []).map((rule, index) => (
                <div key={rule.id || index} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                  <h3 className="font-bold text-sm text-gray-900 mb-1.5">{t(rule.title)}</h3>
                  <p className="text-xs text-gray-600 font-light leading-relaxed whitespace-pre-line">{t(rule.body)}</p>
                </div>
              ))}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:col-span-2">
                <h3 className="font-bold text-sm text-gray-900 mb-1.5">
                  {t(config.contactTitle) || (lang === 'zh' ? '若有任何疑问，可联系：' : 'For any enquiries, please contact:')}
                </h3>
                <p className="text-xs text-gray-600 font-light mb-3">
                  {t(config.contactNote) || (lang === 'zh' ? '将会有相关教会同工与您对接。' : 'A church co-worker will follow up with you.')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {telLink && (
                    <a href={telLink} className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all">
                      <Phone size={14} />
                      <span>{contactPhone}</span>
                    </a>
                  )}
                  {whatsappNumber && (
                    <a
                      href={buildWhatsAppLink(whatsappNumber, lang === 'zh' ? '你好，我想询问场地租借的事宜。' : 'Hello, I would like to enquire about venue booking.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle size={14} />
                      <span>{lang === 'zh' ? 'WhatsApp 询问' : 'Ask via WhatsApp'}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Availability */}
        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <CalendarDays className="text-primary" size={20} />
                {t(config.availabilityTitle) || (lang === 'zh' ? '场地使用情况' : 'Venue Availability')}
              </h2>
              <p className="text-xs text-gray-500 font-light mt-1.5 max-w-3xl leading-relaxed">
                {t(config.availabilityHint)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={13} className={availabilityState === 'loading' ? 'animate-spin' : ''} />
              <span>{lang === 'zh' ? '刷新' : 'Refresh'}</span>
            </button>
          </div>

          {availabilityState === 'unavailable' && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  {lang === 'zh'
                    ? '线上场地申请系统暂时无法连接。您仍可填写下方表格后，改用 WhatsApp 直接把申请发给教会同工；同工将以电话与您确认时间是否可用。'
                    : 'The online booking system cannot be reached right now. You can still fill in the form below and send it to a church co-worker through WhatsApp; a co-worker will confirm the slot by phone.'}
                </span>
              </div>
              {whatsappNumber && (
                <a
                  href={buildWhatsAppLink(whatsappNumber, bookingSummaryText(draftBooking, lang))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <MessageCircle size={14} />
                  <span>{lang === 'zh' ? '用 WhatsApp 提交这份申请' : 'Send this application via WhatsApp'}</span>
                </a>
              )}
            </div>
          )}
          {availabilityState === 'error' && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                {lang === 'zh' ? '无法载入场地使用情况：' : 'Could not load availability: '}
                {availabilityError}
              </span>
            </div>
          )}

          {/* Date strip */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {lang === 'zh' ? '1. 选择日期' : '1. Pick a date'}
              </span>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-primary inline-block" />{lang === 'zh' ? '可申请' : 'Available'}</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{lang === 'zh' ? '待审核' : 'Pending'}</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{lang === 'zh' ? '已批准' : 'Approved'}</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dayStrip.map((day) => {
                const disabled = !day.available;
                const isSelected = day.iso === selectedDate;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDate(day.iso)}
                    className={`shrink-0 w-[74px] rounded-xl border px-2 py-2.5 text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : disabled
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary/60'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold">
                      {lang === 'zh'
                        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(`${day.iso}T00:00:00Z`).getUTCDay()]
                        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${day.iso}T00:00:00Z`).getUTCDay()]}
                    </span>
                    <span className="block text-base font-extrabold leading-tight">
                      {Number(day.iso.slice(8, 10))}
                    </span>
                    <span className={`block text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                      {lang === 'zh'
                        ? `${Number(day.iso.slice(5, 7))}月`
                        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(day.iso.slice(5, 7)) - 1]}
                    </span>
                    <span className="mt-1 flex items-center justify-center gap-0.5 h-1.5">
                      {day.counts.approved > 0 && <i className={`w-1.5 h-1.5 rounded-full inline-block ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />}
                      {day.counts.pending > 0 && <i className={`w-1.5 h-1.5 rounded-full inline-block ${isSelected ? 'bg-white/70' : 'bg-amber-400'}`} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venue picker */}
          <div className="mb-6">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">
              {lang === 'zh' ? '2. 选择场地' : '2. Pick a venue'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {venues.map((venue) => {
                const dayVenueBookings = busySlots.filter((slot) => slot.venueId === venue.id && slot.date === selectedDate);
                const approvedCount = dayVenueBookings.filter((slot) => slot.status === BOOKING_STATUS.APPROVED).length;
                const pendingCount = dayVenueBookings.filter((slot) => slot.status === BOOKING_STATUS.PENDING).length;
                const isSelected = venue.id === selectedVenueId;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => selectVenue(venue.id)}
                    className={`text-left rounded-xl border p-3.5 transition-all ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{t(venue.name)}</span>
                      {isSelected && <Check size={14} className="text-primary shrink-0 mt-0.5" />}
                    </div>
                    {venue.note && (
                      <p className="text-[11px] text-gray-500 font-light mt-1 leading-snug">{t(venue.note)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {approvedCount > 0 && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 rounded-full px-2 py-0.5">
                          {lang === 'zh' ? `${approvedCount} 个时段已被批准` : `${approvedCount} approved`}
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          {lang === 'zh' ? `${pendingCount} 个待审核` : `${pendingCount} pending`}
                        </span>
                      )}
                      {approvedCount === 0 && pendingCount === 0 && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                          {lang === 'zh' ? '此时段空闲' : 'Free'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot grid */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {lang === 'zh' ? '3. 选择开始时间与时长' : '3. Pick start time & duration'}
              </span>
              {values.startTime && (
                <span className="text-[11px] font-semibold text-primary">
                  {formatTime12(values.startTime)} - {endTimeLabel} · {durationLabel(values.durationHours, lang)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {durations.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => updateValue('durationHours', hours)}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    Number(values.durationHours) === Number(hours)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-primary/60'
                  }`}
                >
                  {durationLabel(hours, lang)}
                </button>
              ))}
            </div>

            {availabilityState === 'loading' && slotGrid.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                {lang === 'zh' ? '正在载入场地时段…' : 'Loading slots…'}
              </div>
            ) : slotGrid.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl">
                {lang === 'zh' ? '此时长超出场地开放时间，请改选较短时长。' : 'This duration exceeds opening hours. Please pick a shorter duration.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {slotGrid.map((slot) => {
                  const isSelected = values.startTime === slot.startTime;
                  const approved = slot.status === BOOKING_STATUS.APPROVED;
                  const pending = slot.status === BOOKING_STATUS.PENDING;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={approved}
                      onClick={() => selectSlot(slot)}
                      title={statusText(slot.status)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : approved
                          ? 'border-rose-200 bg-rose-50 text-rose-400 cursor-not-allowed line-through'
                          : pending
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-500'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary/60'
                      }`}
                    >
                      {formatTime12(slot.startTime)}
                    </button>
                  );
                })}
              </div>
            )}

            {blockingConflict && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  {lang === 'zh'
                    ? '此时段已被批准使用，无法重复申请。请选择其他时间。'
                    : 'This time slot has already been approved and cannot be double-booked. Please choose another time.'}
                </span>
              </div>
            )}
            {needsPendingAck && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    {lang === 'zh'
                      ? '此时段已有其他弟兄姐妹提交申请，仍在等待同工审核。您仍可提交，同工将按先后次序处理。'
                      : 'Another member has already applied for this slot and it is still pending review. You may still apply — applications are handled in order.'}
                  </span>
                </div>
                <label className="flex items-start gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingAck}
                    onChange={(event) => setPendingAck(event.target.checked)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <span>{lang === 'zh' ? '我了解此时段已有其他申请，仍要提交申请。' : 'I understand another application exists for this slot and wish to submit anyway.'}</span>
                </label>
              </div>
            )}
            {serverConflicts.length > 0 && (
              <div className="mt-3 text-[11px] text-rose-600">
                {lang === 'zh' ? '冲突时段：' : 'Conflicting slots: '}
                {serverConflicts.map((slot, index) => (
                  <span key={`${slot.date}-${slot.startTime}-${index}`}>
                    {index > 0 ? '、' : ''}
                    {formatTime12(slot.startTime)} ({durationLabel(slot.durationHours, lang)})
                  </span>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Application form */}
        <SectionCard>
          <h2 className="text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Send className="text-primary" size={20} />
            {t(config.formTitle) || (lang === 'zh' ? '填写租借申请' : 'Booking Application Form')}
          </h2>
          <p className="text-xs text-gray-500 font-light mt-1.5 mb-6">{t(config.formIntro)}</p>

          {submitState === 'error' && submitError && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
              {availabilityState === 'unavailable' && whatsappNumber && (
                <a
                  href={buildWhatsAppLink(whatsappNumber, bookingSummaryText(draftBooking, lang))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <MessageCircle size={14} />
                  <span>{lang === 'zh' ? '用 WhatsApp 提交这份申请' : 'Send this application via WhatsApp'}</span>
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} ref={formRef} className="space-y-6" noValidate>
            {/* honeypot */}
            <input
              type="text"
              name="website"
              value={values.website}
              onChange={(event) => updateValue('website', event.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div data-field="name">
                <FieldLabel htmlFor="booking-name">{lang === 'zh' ? '名字' : 'Name'}</FieldLabel>
                <input
                  type="text"
                  id="booking-name"
                  value={values.name}
                  onChange={(event) => updateValue('name', event.target.value)}
                  placeholder={lang === 'zh' ? '请输入您的名字' : 'Your name'}
                  className={inputStateClass(errors.name)}
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.name, lang)}</p>}
              </div>

              <div data-field="phone">
                <FieldLabel htmlFor="booking-phone">{lang === 'zh' ? '联络电话' : 'Phone number'}</FieldLabel>
                <input
                  type="tel"
                  id="booking-phone"
                  value={values.phone}
                  onChange={(event) => updateValue('phone', event.target.value)}
                  placeholder={lang === 'zh' ? '例如 012-3456789' : 'e.g. 012-3456789'}
                  className={inputStateClass(errors.phone)}
                />
                {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.phone, lang)}</p>}
              </div>

              <div data-field="email">
                <FieldLabel required={false} htmlFor="booking-email">{lang === 'zh' ? '电邮（选填）' : 'Email (optional)'}</FieldLabel>
                <input
                  type="email"
                  id="booking-email"
                  value={values.email}
                  onChange={(event) => updateValue('email', event.target.value)}
                  placeholder={lang === 'zh' ? '方便同工以电邮联系' : 'So a co-worker can email you'}
                  className={inputStateClass(errors.email)}
                />
                {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.email, lang)}</p>}
              </div>

              <div data-field="headcount">
                <FieldLabel required={false} htmlFor="booking-headcount">{lang === 'zh' ? '预计人数' : 'Expected headcount'}</FieldLabel>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  id="booking-headcount"
                  value={values.headcount}
                  onChange={(event) => updateValue('headcount', event.target.value)}
                  placeholder={lang === 'zh' ? '例如 20' : 'e.g. 20'}
                  className={inputStateClass(errors.headcount)}
                />
                {errors.headcount && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.headcount, lang)}</p>}
              </div>

              <div data-field="venueId" className="md:col-span-2">
                <FieldLabel htmlFor="booking-venue">{t(config.venuesTitle) || (lang === 'zh' ? '请选择要租借的场地' : 'Please select the venue')}</FieldLabel>
                <select
                  id="booking-venue"
                  value={values.venueId}
                  onChange={(event) => selectVenue(event.target.value)}
                  className={inputStateClass(errors.venueId)}
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>{t(venue.name)}</option>
                  ))}
                </select>
                {errors.venueId && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.venueId, lang)}</p>}
                {values.venueId === 'other' && (
                  <div className="mt-3" data-field="venueOther">
                    <FieldLabel htmlFor="booking-venue-other">{lang === 'zh' ? '请注明场地 / 设备' : 'Please specify the venue / equipment'}</FieldLabel>
                    <input
                      type="text"
                      id="booking-venue-other"
                      value={values.venueOther}
                      onChange={(event) => updateValue('venueOther', event.target.value)}
                      placeholder={lang === 'zh' ? '例如：户外空地、音响设备' : 'e.g. outdoor area, sound system'}
                      className={inputStateClass(false)}
                    />
                  </div>
                )}
              </div>

              <div data-field="purpose">
                <FieldLabel>{lang === 'zh' ? '租借用途' : 'Purpose of rental'}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {purposeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updateValue('purpose', option.id)}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        values.purpose === option.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-primary/60'
                      }`}
                    >
                      {t(option.label)}
                    </button>
                  ))}
                </div>
                {errors.purpose && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.purpose, lang)}</p>}
              </div>

              <div data-field="aircon">
                <FieldLabel>{lang === 'zh' ? '是否要使用冷气？' : 'Will air conditioning be used?'}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'yes', label: lang === 'zh' ? '是' : 'Yes' },
                    { value: 'no', label: lang === 'zh' ? '否' : 'No' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateValue('aircon', option.value)}
                      className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        values.aircon === option.value
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-primary/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.aircon && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.aircon, lang)}</p>}
              </div>

              <div data-field="date">
                <FieldLabel htmlFor="booking-date">{lang === 'zh' ? '租借日期' : 'Rental date'}</FieldLabel>
                <input
                  type="date"
                  min={minDate}
                  id="booking-date"
                  value={values.date}
                  onChange={(event) => selectDate(event.target.value)}
                  className={inputStateClass(errors.date)}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {lang === 'zh'
                    ? `需至少提前 ${advanceDays} 天申请，最早可申请 ${formatDateLong(minDate, 'zh')}`
                    : `At least ${advanceDays} days in advance. Earliest date: ${formatDateLong(minDate, 'en')}`}
                </p>
                {errors.date && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.date, lang)}</p>}
              </div>

              <div data-field="startTime">
                <FieldLabel htmlFor="booking-start">{lang === 'zh' ? '租借时间（开始）' : 'Rental start time'}</FieldLabel>
                <input
                  type="time"
                  step={(config.slotMinutes || 30) * 60}
                  min={config.openTime || '08:00'}
                  max={config.closeTime || '22:00'}
                  id="booking-start"
                  value={values.startTime}
                  onChange={(event) => updateValue('startTime', event.target.value)}
                  className={inputStateClass(errors.startTime)}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {lang === 'zh'
                    ? `开放时段：${formatTime12(config.openTime || '08:00')} - ${formatTime12(config.closeTime || '22:00')}`
                    : `Opening hours: ${formatTime12(config.openTime || '08:00')} - ${formatTime12(config.closeTime || '22:00')}`}
                </p>
                {errors.startTime && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.startTime, lang)}</p>}
              </div>

              <div data-field="durationHours">
                <FieldLabel>{lang === 'zh' ? '租借时长' : 'Duration'}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {durations.map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => updateValue('durationHours', hours)}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        Number(values.durationHours) === Number(hours)
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-primary/60'
                      }`}
                    >
                      {durationLabel(hours, lang)}
                    </button>
                  ))}
                </div>
                {errors.durationHours && <p className="text-[11px] text-rose-600 mt-1">{errorText(errors.durationHours, lang)}</p>}
              </div>

              <div data-field="reason" className="md:col-span-2">
                <FieldLabel htmlFor="booking-reason">{lang === 'zh' ? '租借原因' : 'Reason for rental'}</FieldLabel>
                <textarea
                  rows={4}
                  maxLength={500}
                  id="booking-reason"
                  value={values.reason}
                  onChange={(event) => updateValue('reason', event.target.value)}
                  placeholder={lang === 'zh' ? '请简单说明用途，例如：小组聚会、生日会、练习…' : 'Briefly describe the purpose, e.g. cell group meeting, birthday celebration, practice…'}
                  className={inputStateClass(errors.reason)}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{values.reason.length}/500</span>
                  {errors.reason && <p className="text-[11px] text-rose-600">{errorText(errors.reason, lang)}</p>}
                </div>
              </div>
            </div>

            {/* Leaders */}
            <div data-field="leadersNotified" className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <h3 className="font-bold text-sm text-gray-900">
                {t(config.leadersTitle) || (lang === 'zh' ? '确认已通知相关服侍负责人' : 'Confirm the serving leader has been notified')}
              </h3>
              <p className="text-[11px] text-gray-600 font-light mt-1.5 mb-3 leading-relaxed">{t(config.leadersIntro)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(config.leaders || []).map((leader) => {
                  const checked = values.leadersNotified.includes(leader.id);
                  return (
                    <label
                      key={leader.id}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${
                        checked ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLeader(leader.id)}
                        className="mt-0.5 accent-primary"
                      />
                      <span className="text-xs text-gray-700 leading-snug">
                        <span className="font-semibold block">{t(leader.label)}</span>
                        {leader.phone && <span className="text-gray-500">{leader.phone}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.leadersNotified && (
                <p className="text-[11px] text-rose-600 mt-2">{errorText(errors.leadersNotified, lang)}</p>
              )}
            </div>

            {/* Agreement */}
            <div data-field="agree" className="rounded-xl border border-gray-200 bg-white p-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.agree}
                  onChange={(event) => updateValue('agree', event.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  {lang === 'zh'
                    ? '我已阅读并同意以上场地申请规则，并会在使用后清理场地、关闭灯源，并将照片转发给教会同工。'
                    : 'I have read and agree to the venue rules above, and will clean up, switch off the lights, and send the photo to a church co-worker after use.'}
                </span>
              </label>
              {errors.agree && <p className="text-[11px] text-rose-600 mt-2">{errorText(errors.agree, lang)}</p>}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  canSubmit
                    ? 'bg-primary hover:bg-primary-dark text-white shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {submitState === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{lang === 'zh' ? '正在提交…' : 'Submitting…'}</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>{lang === 'zh' ? '提交申请' : 'Submit application'}</span>
                  </>
                )}
              </button>
              {!validationPreview.ok && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Info size={13} />
                  {lang === 'zh' ? '请填妥所有必填栏位后提交。' : 'Please complete all required fields.'}
                </span>
              )}
              {blockingConflict && (
                <span className="text-[11px] text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  {lang === 'zh' ? '所选时段已被批准使用。' : 'Selected slot is already approved.'}
                </span>
              )}
              {needsPendingAck && !pendingAck && (
                <span className="text-[11px] text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  {lang === 'zh' ? '请勾选确认以继续。' : 'Please tick the acknowledgement to continue.'}
                </span>
              )}
            </div>
          </form>
        </SectionCard>

        {/* Contact footer */}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-6 text-center">
          <h3 className="text-sm font-extrabold text-gray-900 mb-2">
            {lang === 'zh' ? '不确定场地是否可用？' : 'Not sure if a venue is available?'}
          </h3>
          <p className="text-xs text-gray-600 font-light mb-4">
            {lang === 'zh' ? '欢迎直接联系教会同工，我们会尽力协助安排。' : 'Contact a church co-worker and we will be glad to help arrange it.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {telLink && (
              <a href={telLink} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-2 transition-all">
                <Phone size={15} />
                <span>{contactPhone}</span>
              </a>
            )}
            {whatsappNumber && (
              <a
                href={buildWhatsAppLink(whatsappNumber, lang === 'zh' ? '你好，我想询问场地租借的事宜。' : 'Hello, I would like to enquire about venue booking.')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
