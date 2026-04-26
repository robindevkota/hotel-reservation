'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { A, StatusPill, PageHeader, adminTableCss, TableFilters, Pagination } from '../../_adminStyles';
import {
  Calendar, Clock, Users, Plus, Edit2, Trash2, X,
  ChevronLeft, ChevronRight, UserCheck, CheckCircle, AlertTriangle,
  Sparkles, Coffee, RefreshCw, TrendingUp,
  Activity, Zap, Printer,
} from 'lucide-react';
import { printReceipt } from '../../../../lib/printReceipt';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0];
}
function todayStr() { return fmtDate(new Date()); }

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const TIMELINE_START = toMin('09:00');
const TIMELINE_END   = toMin('21:00');
const TIMELINE_SPAN  = TIMELINE_END - TIMELINE_START; // 720 min

function pct(hhmm: string) {
  return Math.max(0, Math.min(100, ((toMin(hhmm) - TIMELINE_START) / TIMELINE_SPAN) * 100));
}
function durPct(start: string, end: string) {
  return Math.max(1, ((toMin(end) - toMin(start)) / TIMELINE_SPAN) * 100);
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: 'hsl(38 90% 88%)',  text: 'hsl(38 80% 30%)' },
  confirmed:   { bg: 'hsl(210 80% 88%)', text: 'hsl(210 70% 30%)' },
  arrived:     { bg: 'hsl(270 60% 88%)', text: 'hsl(270 50% 30%)' },
  in_progress: { bg: 'hsl(142 60% 85%)', text: 'hsl(142 50% 24%)' },
  completed:   { bg: 'hsl(220 15% 88%)', text: 'hsl(220 15% 35%)' },
  cancelled:   { bg: 'hsl(0 60% 90%)',   text: 'hsl(0 55% 38%)' },
};

const TABS = ['Schedule', 'All Bookings', 'Therapists', 'Services'] as const;
type Tab = typeof TABS[number];

// ── modal helper ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 8% / 0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${A.border}` }}>
        <div style={{ background: A.navy, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }}>
          <h3 style={{ fontFamily: A.cinzel, color: 'hsl(40 30% 94%)', fontSize: '0.95rem', letterSpacing: '0.05em' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(40 20% 70%)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem', border: `1px solid ${A.border}`,
  fontFamily: A.cinzel, fontSize: '0.8rem', color: A.navy, background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};

function Btn({ children, onClick, variant = 'primary', disabled, small }: any) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: A.gradGold, color: A.navy, border: 'none' },
    ghost:   { background: 'transparent', color: A.navy, border: `1px solid ${A.border}` },
    danger:  { background: 'hsl(0 65% 96%)', color: 'hsl(0 55% 40%)', border: `1px solid hsl(0 55% 80%)` },
    green:   { background: 'hsl(142 50% 92%)', color: 'hsl(142 50% 25%)', border: `1px solid hsl(142 50% 70%)` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], fontFamily: A.cinzel, fontSize: small ? '0.6rem' : '0.65rem',
      letterSpacing: '0.1em', textTransform: 'uppercase', padding: small ? '0.35rem 0.75rem' : '0.6rem 1.25rem',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    }}>{children}</button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

// Format a USD price for display based on nationality
function fmtPrice(usdAmount: number, nationality: 'foreign' | 'nepali', rate: number): string {
  if (nationality === 'nepali') {
    return `Rs. ${Math.round(usdAmount * rate).toLocaleString('en-IN')}`;
  }
  return `$${usdAmount.toFixed(2)}`;
}

// Resolve nationality from a booking (hotel guest or walk-in customer)
function bookingNationality(b: any): 'foreign' | 'nepali' {
  if (b.guest?.nationality) return b.guest.nationality;
  if (b.walkInCustomer?.nationality) return b.walkInCustomer.nationality;
  return 'foreign';
}

export default function AdminSpaPage() {
  const [tab, setTab]             = useState<Tab>('Schedule');
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [schedule, setSchedule]   = useState<any[]>([]);
  const [bookings, setBookings]   = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [services, setServices]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [exchangeRate, setExchangeRate] = useState(135);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Live clock — updates every minute to move the "Now" cursor
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const tick = setInterval(() => {
      const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  // Schedule filters
  const [filterService, setFilterService] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  // All Bookings tab filters
  const [bkSearch,      setBkSearch]     = useState('');
  const [bkService,     setBkService]    = useState('');
  const [bkStatus,      setBkStatus]     = useState('');
  const [bkDateFrom,    setBkDateFrom]   = useState('');
  const [bkDateTo,      setBkDateTo]     = useState('');
  const [bkSortField,   setBkSortField]  = useState<'date'|'price'>('date');
  const [bkSortDir,     setBkSortDir]    = useState<'asc'|'desc'>('desc');
  const [bkPage,        setBkPage]       = useState(1);
  const [bkPageSize,    setBkPageSize]   = useState(10);

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showWalkIn, setShowWalkIn]           = useState(false);
  const [showTherapistForm, setShowTherapistForm] = useState(false);
  const [showServiceForm, setShowServiceForm]     = useState(false);
  const [editingTherapist, setEditingTherapist]   = useState<any>(null);
  const [editingService, setEditingService]       = useState<any>(null);
  const [walkInSlot, setWalkInSlot]               = useState<{ therapistId: string; startTime: string } | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/spa/schedule?date=${scheduleDate}`);
      setSchedule(data.schedule || []);
    } catch { toast.error('Failed to load schedule'); }
    finally { setLoading(false); }
  }, [scheduleDate]);

  const fetchAll = useCallback(async () => {
    const [b, t, s] = await Promise.all([
      api.get('/spa/bookings'),
      api.get('/spa/therapists'),
      api.get('/spa/services'),
    ]);
    setBookings(b.data.bookings || []);
    setTherapists(t.data.therapists || []);
    setServices(s.data.services || []);
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    api.get('/settings/exchange-rate').then(({ data }) => {
      if (data.rate) setExchangeRate(data.rate);
    }).catch(() => {});
  }, []);

  // Auto-refresh every 30s when toggled on
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => { fetchSchedule(); fetchAll(); }, 30_000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh, fetchSchedule, fetchAll]);

  // ── booking actions ───────────────────────────────────────────────────────

  const doStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/spa/bookings/${id}/status`, { status });
      toast.success(`Booking ${status}`);
      setSelectedBooking(null);
      fetchSchedule(); fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const doArrive = async (id: string) => {
    try {
      const { data } = await api.patch(`/spa/bookings/${id}/arrive`, {});
      toast.success('Guest arrival recorded');
      if (data.warning) toast(data.warning, { icon: '⚠️' });
      setSelectedBooking(null);
      fetchSchedule(); fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const doComplete = async (id: string, paymentMethod: 'room_bill' | 'cash') => {
    try {
      await api.patch(`/spa/bookings/${id}/complete`, { paymentMethod });
      toast.success(paymentMethod === 'cash' ? 'Session completed — paid in cash' : 'Session completed & charged to room bill');
      setSelectedBooking(null);
      fetchSchedule(); fetchAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  // ── derived stats ─────────────────────────────────────────────────────────

  const todayBookings = schedule.flatMap(t => t.bookings);
  const pending      = todayBookings.filter(b => b.status === 'pending').length;
  const confirmed    = todayBookings.filter(b => b.status === 'confirmed').length;
  const active       = todayBookings.filter(b => b.status === 'in_progress').length;
  const completedToday = todayBookings.filter(b => b.status === 'completed');
  const revenueToday   = completedToday.reduce((s: number, b: any) => s + (b.price || 0), 0);
  const cancelledToday = todayBookings.filter(b => b.status === 'cancelled').length;

  // Utilisation: booked minutes / total therapist available minutes (09:00–21:00 = 720 min each)
  const availMins = schedule.length * 720;
  const bookedMins = todayBookings
    .filter(b => !['cancelled'].includes(b.status))
    .reduce((s: number, b: any) => s + (b.durationSnapshot || 60), 0);
  const utilPct = availMins > 0 ? Math.round((bookedMins / availMins) * 100) : 0;

  // Per-therapist live status
  const therapistStatus = (row: any): { label: string; color: string } => {
    const active = row.bookings.find((b: any) =>
      b.status === 'in_progress' ||
      (b.status === 'arrived' && toMin(b.actualStart || b.scheduledStart) <= nowMin)
    );
    if (active) return { label: 'In Session', color: 'hsl(142 50% 30%)' };
    // Check if in break
    const justDone = row.bookings
      .filter((b: any) => ['completed', 'arrived', 'in_progress'].includes(b.status))
      .find((b: any) => {
        const end = toMin(b.actualEnd || b.scheduledEnd);
        return nowMin >= end && nowMin < end + row.therapist.breakDuration;
      });
    if (justDone) return { label: 'On Break', color: 'hsl(38 70% 35%)' };
    return { label: 'Free', color: 'hsl(210 60% 35%)' };
  };

  // Next booking for a therapist
  const nextBooking = (row: any): string => {
    const upcoming = row.bookings
      .filter((b: any) => ['pending', 'confirmed'].includes(b.status) && toMin(b.scheduledStart) > nowMin)
      .sort((a: any, z: any) => toMin(a.scheduledStart) - toMin(z.scheduledStart));
    if (!upcoming.length) return '';
    const b = upcoming[0];
    const diff = toMin(b.scheduledStart) - nowMin;
    return `Next: ${b.scheduledStart} (${diff} min)`;
  };

  // ── filtered schedule rows ────────────────────────────────────────────────

  const filteredSchedule = schedule.map(row => {
    let bks = row.bookings;
    if (filterService) bks = bks.filter((b: any) => b.service?._id === filterService || b.service?.name === filterService);
    if (filterStatus)  bks = bks.filter((b: any) => b.status === filterStatus);
    return { ...row, bookings: bks };
  }).filter(row => !filterService && !filterStatus ? true : row.bookings.length > 0);

  // ── filtered all-bookings list ────────────────────────────────────────────

  const filteredBookings = bookings
    .filter(b => {
      if (bkSearch) {
        const q = bkSearch.toLowerCase();
        if (!b.guest?.name?.toLowerCase().includes(q) && !b.guest?.email?.toLowerCase().includes(q)) return false;
      }
      if (bkService && b.service?._id !== bkService) return false;
      if (bkStatus  && b.status !== bkStatus) return false;
      if (bkDateFrom && new Date(b.date) < new Date(bkDateFrom)) return false;
      if (bkDateTo   && new Date(b.date) > new Date(bkDateTo))   return false;
      return true;
    })
    .sort((a, b) => {
      const va = bkSortField === 'date' ? new Date(a.date).getTime() : a.price;
      const vb = bkSortField === 'date' ? new Date(b.date).getTime() : b.price;
      return bkSortDir === 'asc' ? va - vb : vb - va;
    });

  const isToday = scheduleDate === todayStr();

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{adminTableCss}{`
        .timeline-block:hover { opacity: 0.88; cursor: pointer; }
        .free-slot:hover { background: hsl(43 72% 55% / 0.12) !important; cursor: pointer; }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.5); } }
        .live-dot { animation: pulse-dot 1.4s ease-in-out infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '2rem', maxWidth: '1400px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <PageHeader eyebrow="Manage" title="Spa Schedule" />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.45rem 0.875rem', border: `1px solid ${autoRefresh ? A.gold : A.border}`, background: autoRefresh ? `${A.gold}18` : 'transparent', color: autoRefresh ? A.gold : A.muted, cursor: 'pointer' }}>
              <RefreshCw size={11} strokeWidth={2} style={autoRefresh ? { animation: 'spin 2s linear infinite' } : {}} />
              {autoRefresh ? 'Live' : 'Auto-refresh'}
            </button>
            {[
              { label: 'Pending',     count: pending,   color: 'hsl(38 80% 40%)' },
              { label: 'Confirmed',   count: confirmed, color: 'hsl(210 70% 40%)' },
              { label: 'In Progress', count: active,    color: 'hsl(142 50% 32%)' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '0.625rem 1.25rem', textAlign: 'center' }}>
                <div style={{ fontFamily: A.cinzel, fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.count}</div>
                <div style={{ fontFamily: A.cinzel, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${A.border}`, marginBottom: '2rem' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '0.75rem 1.5rem', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: tab === t ? A.navy : 'transparent',
              color: tab === t ? A.gold : A.muted,
              borderBottom: tab === t ? `2px solid ${A.gold}` : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {/* ── SCHEDULE TAB ──────────────────────────────────────────────────── */}
        {tab === 'Schedule' && (
          <div>
            {/* Date navigator + Walk-in */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <Btn variant="ghost" small onClick={() => setScheduleDate(addDays(scheduleDate, -1))}><ChevronLeft size={14} /></Btn>
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                style={{ ...inputStyle, width: '160px', padding: '0.5rem 0.75rem' }} />
              <Btn variant="ghost" small onClick={() => setScheduleDate(addDays(scheduleDate, 1))}><ChevronRight size={14} /></Btn>
              <Btn variant="ghost" small onClick={() => setScheduleDate(todayStr())}><Calendar size={13} /> Today</Btn>
              <Btn onClick={() => { setWalkInSlot(null); setShowWalkIn(true); }}><Plus size={13} /> Walk-in</Btn>
            </div>

            {/* Today's stats bar */}
            {isToday && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Total Bookings', value: todayBookings.filter(b => b.status !== 'cancelled').length, icon: <Users size={13} />, color: A.navy },
                  { label: 'Completed', value: completedToday.length, icon: <CheckCircle size={13} />, color: 'hsl(142 50% 30%)' },
                  { label: 'Revenue Today', value: `NPR ${revenueToday.toLocaleString()}`, icon: <TrendingUp size={13} />, color: A.gold },
                  { label: 'Utilisation', value: `${utilPct}%`, icon: <Activity size={13} />, color: utilPct > 70 ? 'hsl(142 50% 30%)' : utilPct > 40 ? A.gold : A.muted },
                  { label: 'Cancelled', value: cancelledToday, icon: <Zap size={13} />, color: cancelledToday > 0 ? 'hsl(0 55% 40%)' : A.muted },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <div>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.88rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.muted }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filters row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={filterService} onChange={e => setFilterService(e.target.value)}
                style={{ ...inputStyle, width: '180px', padding: '0.45rem 0.75rem', fontSize: '0.72rem' }}>
                <option value="">All Services</option>
                {services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['', 'pending', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled'].map(st => (
                  <button key={st} onClick={() => setFilterStatus(st)}
                    style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', cursor: 'pointer', border: `1px solid ${filterStatus === st ? A.gold : A.border}`, background: filterStatus === st ? `${A.gold}18` : 'transparent', color: filterStatus === st ? A.navy : A.muted, fontWeight: filterStatus === st ? 700 : 400 }}>
                    {st || 'All'}
                  </button>
                ))}
              </div>
              {(filterService || filterStatus) && (
                <button onClick={() => { setFilterService(''); setFilterStatus(''); }}
                  style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.08em', color: A.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <p style={{ fontFamily: A.cinzel, color: A.muted, fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>Loading schedule…</p>
            ) : schedule.length === 0 ? (
              <p style={{ fontFamily: A.cinzel, color: A.muted, fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>No therapists configured. Add therapists in the Therapists tab.</p>
            ) : (
              <div>
                {/* Hour ruler */}
                <div style={{ display: 'flex', marginLeft: '180px', marginBottom: '0.5rem', position: 'relative', height: '20px' }}>
                  {Array.from({ length: 13 }, (_, i) => {
                    const h = 9 + i;
                    const p = ((h * 60 - TIMELINE_START) / TIMELINE_SPAN) * 100;
                    return (
                      <div key={h} style={{ position: 'absolute', left: `${p}%`, transform: 'translateX(-50%)', fontFamily: A.cinzel, fontSize: '0.58rem', color: A.muted, letterSpacing: '0.05em' }}>
                        {String(h).padStart(2,'0')}:00
                      </div>
                    );
                  })}
                </div>

                {/* Therapist rows */}
                {filteredSchedule.map((row: any) => {
                  const tStatus = therapistStatus(row);
                  const next    = nextBooking(row);
                  return (
                    <div key={row.therapist._id} style={{ display: 'flex', alignItems: 'stretch', marginBottom: '0.625rem', minHeight: '72px' }}>
                      {/* Name column — wider to fit status pill + next countdown */}
                      <div style={{ width: '180px', flexShrink: 0, padding: '0.5rem 0.75rem 0.5rem 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.2rem' }}>
                        <div style={{ fontFamily: A.cinzel, fontSize: '0.72rem', color: A.navy, fontWeight: 600 }}>{row.therapist.name}</div>
                        {/* Live status pill */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: `${tStatus.color}18`, border: `1px solid ${tStatus.color}40`, padding: '0.15rem 0.5rem', width: 'fit-content' }}>
                          {tStatus.label === 'In Session' && (
                            <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: tStatus.color, flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: A.cinzel, fontSize: '0.52rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: tStatus.color, fontWeight: 700 }}>{tStatus.label}</span>
                        </div>
                        {next && (
                          <div style={{ fontFamily: A.cinzel, fontSize: '0.52rem', color: A.muted, letterSpacing: '0.04em' }}>{next}</div>
                        )}
                      </div>

                      {/* Timeline */}
                      <div style={{ flex: 1, position: 'relative', background: A.papyrus, border: `1px solid ${A.border}` }}>
                        {/* Hour grid lines */}
                        {Array.from({ length: 13 }, (_, i) => {
                          const p = ((i * 60) / TIMELINE_SPAN) * 100;
                          return <div key={i} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, borderLeft: `1px solid ${A.border}`, opacity: 0.5 }} />;
                        })}

                        {/* "Now" cursor — red vertical line, only for today */}
                        {isToday && nowMin >= TIMELINE_START && nowMin <= TIMELINE_END && (
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${((nowMin - TIMELINE_START) / TIMELINE_SPAN) * 100}%`, width: '2px', background: 'hsl(0 70% 52%)', zIndex: 5, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: '-6px', left: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(0 70% 52%)' }} />
                          </div>
                        )}

                        {/* Break zones */}
                        {row.bookings
                          .filter((b: any) => !['cancelled'].includes(b.status))
                          .map((b: any) => {
                            const endStr = b.actualEnd || b.scheduledEnd;
                            const breakEnd = (() => {
                              const [hh, mm] = endStr.split(':').map(Number);
                              const total = hh * 60 + mm + row.therapist.breakDuration;
                              return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
                            })();
                            return (
                              <div key={`break-${b._id}`} style={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: `${pct(endStr)}%`, width: `${durPct(endStr, breakEnd)}%`,
                                background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(38 72% 55% / 0.08) 3px, hsl(38 72% 55% / 0.08) 6px)',
                                borderLeft: `1px dashed ${A.gold}40`,
                              }} title={`Break until ${breakEnd}`} />
                            );
                          })}

                        {/* Free slots — clickable to create walk-in */}
                        {row.freeSlots.map((fs: any, i: number) => (
                          <div key={`free-${i}`} className="free-slot"
                            onClick={() => { setWalkInSlot({ therapistId: row.therapist._id, startTime: fs.startTime }); setShowWalkIn(true); }}
                            style={{
                              position: 'absolute', top: '4px', bottom: '4px',
                              left: `${pct(fs.startTime)}%`, width: `${durPct(fs.startTime, fs.endTime)}%`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s',
                            }}
                            title={`Free ${fs.startTime}–${fs.endTime} · Click to add walk-in`}>
                            {durPct(fs.startTime, fs.endTime) > 8 && (
                              <Plus size={12} color={`${A.gold}80`} strokeWidth={1.5} />
                            )}
                          </div>
                        ))}

                        {/* Booking blocks */}
                        {row.bookings.map((b: any) => {
                          const sc    = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                          const start = b.actualStart || b.scheduledStart;
                          const end   = b.actualEnd   || b.scheduledEnd;
                          const isLive = b.status === 'in_progress';
                          // Overrun: actualEnd > scheduledEnd by >5 min
                          const overrun = b.actualStart && isToday &&
                            toMin(b.actualEnd || b.scheduledEnd) > toMin(b.scheduledEnd) + 5;
                          return (
                            <div key={b._id} className="timeline-block"
                              onClick={() => setSelectedBooking(b)}
                              style={{
                                position: 'absolute', top: '4px', bottom: '4px',
                                left: `${pct(start)}%`, width: `${Math.max(1.5, durPct(start, end))}%`,
                                background: overrun ? 'hsl(38 90% 88%)' : sc.bg,
                                borderLeft: `3px solid ${overrun ? 'hsl(38 70% 45%)' : sc.text}`,
                                overflow: 'hidden', padding: '0.25rem 0.4rem',
                                transition: 'opacity 0.15s',
                              }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {isLive && (
                                  <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.text, flexShrink: 0 }} />
                                )}
                                <div style={{ fontFamily: A.cinzel, fontSize: '0.62rem', color: overrun ? 'hsl(38 70% 30%)' : sc.text, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {b.guest?.name || 'Guest'}
                                </div>
                              </div>
                              {durPct(start, end) > 6 && (
                                <div style={{ fontFamily: A.cinzel, fontSize: '0.55rem', color: sc.text, opacity: 0.8 }}>
                                  {b.scheduledStart} · {b.service?.name?.split(' ')[0]}
                                </div>
                              )}
                              {durPct(start, end) > 4 && (
                                <div style={{
                                  display: 'inline-block', marginTop: '0.15rem',
                                  fontFamily: A.cinzel, fontSize: '0.48rem', letterSpacing: '0.1em',
                                  textTransform: 'uppercase', fontWeight: 700,
                                  color: overrun ? 'hsl(38 70% 30%)' : sc.text,
                                  background: overrun ? 'hsl(38 70% 45% / 0.15)' : `${sc.text}18`,
                                  border: `1px solid ${overrun ? 'hsl(38 70% 45% / 0.4)' : `${sc.text}40`}`,
                                  padding: '0.05rem 0.35rem',
                                }}>
                                  {overrun ? 'overrun' : b.status.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {filteredSchedule.length === 0 && (filterService || filterStatus) && (
                  <p style={{ fontFamily: A.cinzel, color: A.muted, fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                    No bookings match the current filters.
                  </p>
                )}

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'cancelled').map(([status, sc]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '12px', height: '12px', background: sc.bg, borderLeft: `3px solid ${sc.text}` }} />
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', color: A.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{status.replace('_', ' ')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '12px', height: '12px', background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, hsl(38 72% 55% / 0.2) 2px, hsl(38 72% 55% / 0.2) 4px)', border: `1px dashed ${A.gold}` }} />
                    <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', color: A.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Break</span>
                  </div>
                  {isToday && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '2px', height: '12px', background: 'hsl(0 70% 52%)' }} />
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', color: A.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Now</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ALL BOOKINGS TAB ──────────────────────────────────────────────── */}
        {tab === 'All Bookings' && (
          <div>
            <TableFilters
              search={{ value: bkSearch, onChange: v => { setBkSearch(v); setBkPage(1); }, placeholder: 'Guest name or email…' }}
              selects={[{
                value: bkService, onChange: v => { setBkService(v); setBkPage(1); },
                placeholder: 'All Services', width: 200,
                options: services.map((s: any) => ({ value: s._id, label: s.name })),
              }]}
              statusPills={{
                values: ['pending','confirmed','arrived','in_progress','completed','cancelled'],
                active: bkStatus,
                onChange: v => { setBkStatus(v); setBkPage(1); },
                allLabel: 'All Statuses',
              }}
              dateRange={{
                from: bkDateFrom, onFromChange: v => { setBkDateFrom(v); setBkPage(1); },
                to: bkDateTo,     onToChange:   v => { setBkDateTo(v);   setBkPage(1); },
              }}
              sort={{
                field: bkSortField, onFieldChange: v => setBkSortField(v as 'date'|'price'),
                dir: bkSortDir,     onDirChange:   setBkSortDir,
                options: [{ value: 'date', label: 'Date' }, { value: 'price', label: 'Price' }],
              }}
              resultCount={filteredBookings.length}
              hasActiveFilters={!!(bkSearch || bkService || bkStatus || bkDateFrom || bkDateTo)}
              onClear={() => { setBkSearch(''); setBkService(''); setBkStatus(''); setBkDateFrom(''); setBkDateTo(''); setBkPage(1); }}
            />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: A.navy }}>
                    {['Guest','Service','Therapist','Date','Time','Price','Status','Walk-in','Actions'].map(h => (
                      <th key={h} style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.gold, padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', fontFamily: A.cinzel, color: A.muted, fontSize: '0.75rem' }}>No bookings match the current filters</td></tr>
                  ) : filteredBookings.slice((bkPage - 1) * bkPageSize, bkPage * bkPageSize).map((b: any, i) => (
                    <tr key={b._id} style={{ background: i % 2 === 0 ? '#fff' : A.papyrus, borderBottom: `1px solid ${A.border}` }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.navy, fontWeight: 600 }}>{b.guest?.name || b.walkInCustomer?.name}</div>
                        <div style={{ fontFamily: A.cinzel, fontSize: '0.65rem', color: A.muted }}>{b.guest?.email || (b.walkInCustomer ? 'Walk-in' : '')}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.72rem', color: A.navy }}>{b.service?.name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.72rem', color: b.therapist ? A.navy : A.muted }}>{b.therapist?.name || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.72rem' }}>{new Date(b.date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.72rem' }}>{b.scheduledStart} – {b.scheduledEnd}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.72rem', color: A.gold, fontWeight: 600 }}>{fmtPrice(b.price, bookingNationality(b), exchangeRate)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusPill status={b.status} /></td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {b.isWalkIn && <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', color: A.gold, letterSpacing: '0.08em' }}>Walk-in</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button onClick={() => setSelectedBooking(b)}
                          style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: A.navy, border: `1px solid ${A.border}`, background: 'transparent', padding: '0.3rem 0.75rem', cursor: 'pointer' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={bkPage} pageSize={bkPageSize} total={filteredBookings.length}
              onPage={setBkPage} onPageSize={s => { setBkPageSize(s); setBkPage(1); }}
            />
          </div>
        )}

        {/* ── THERAPISTS TAB ────────────────────────────────────────────────── */}
        {tab === 'Therapists' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <Btn onClick={() => { setEditingTherapist(null); setShowTherapistForm(true); }}><Plus size={13} /> Add Therapist</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {therapists.length === 0 ? (
                <p style={{ fontFamily: A.cinzel, color: A.muted, fontSize: '0.75rem', textAlign: 'center', padding: '2rem' }}>No therapists yet. Add one above.</p>
              ) : therapists.map((t: any) => (
                <div key={t._id} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.85rem', color: A.navy, fontWeight: 700 }}>{t.name}</span>
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.isActive ? 'hsl(142 50% 32%)' : 'hsl(0 55% 40%)', background: t.isActive ? 'hsl(142 60% 92%)' : 'hsl(0 60% 94%)', padding: '0.2rem 0.6rem' }}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Coffee size={11} color={A.muted} strokeWidth={1.5} />
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.62rem', color: A.muted }}>{t.breakDuration} min break</span>
                      <span style={{ color: A.border, fontSize: '0.7rem' }}>·</span>
                      {(t.specializations || []).map((s: any) => (
                        <span key={s._id || s} style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.06em', color: A.muted, background: A.papyrus, border: `1px solid ${A.border}`, padding: '0.15rem 0.5rem' }}>
                          {s.name || s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Btn variant="ghost" small onClick={() => { setEditingTherapist(t); setShowTherapistForm(true); }}><Edit2 size={12} /> Edit</Btn>
                    {t.isActive && (
                      <Btn variant="danger" small onClick={async () => {
                        await api.delete(`/spa/therapists/${t._id}`);
                        toast.success('Therapist deactivated');
                        fetchAll();
                      }}><Trash2 size={12} /> Deactivate</Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SERVICES TAB ──────────────────────────────────────────────────── */}
        {tab === 'Services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <Btn onClick={() => { setEditingService(null); setShowServiceForm(true); }}><Plus size={13} /> Add Service</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {services.map((svc: any) => (
                <div key={svc._id} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.85rem', color: A.navy, fontWeight: 700 }}>{svc.name}</span>
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.62rem', color: A.gold }}>NPR {svc.price}</span>
                      <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: svc.isAvailable ? 'hsl(142 50% 32%)' : 'hsl(0 55% 40%)', background: svc.isAvailable ? 'hsl(142 60% 92%)' : 'hsl(0 60% 94%)', padding: '0.2rem 0.6rem' }}>
                        {svc.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { icon: <Clock size={11} />, label: `${svc.duration} min` },
                        { icon: <AlertTriangle size={11} />, label: `${svc.gracePeriod ?? 15} min grace` },
                        { icon: <Clock size={11} />, label: `${svc.operatingStart ?? '09:00'} – ${svc.operatingEnd ?? '21:00'}` },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: A.muted }}>
                          {item.icon}
                          <span style={{ fontFamily: A.cinzel, fontSize: '0.62rem' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Btn variant="ghost" small onClick={() => { setEditingService(svc); setShowServiceForm(true); }}><Edit2 size={12} /> Edit</Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BOOKING DETAIL MODAL ──────────────────────────────────────────── */}
      {selectedBooking && (
        <Modal title="Booking Details" onClose={() => setSelectedBooking(null)}>
          <BookingDetailModal
            booking={selectedBooking}
            exchangeRate={exchangeRate}
            onArrive={() => doArrive(selectedBooking._id)}
            onStatus={(s: string) => doStatus(selectedBooking._id, s)}
            onComplete={(method: 'room_bill' | 'cash') => doComplete(selectedBooking._id, method)}
            onClose={() => setSelectedBooking(null)}
            onPrint={() => {
              const b = selectedBooking;
              const nat = bookingNationality(b);
              printReceipt({
                type: 'spa',
                bookingId: b._id,
                completedAt: b.actualEnd ? new Date().toISOString() : new Date().toISOString(),
                customer: b.guest?.name || b.walkInCustomer?.name || 'Guest',
                isWalkIn: !!b.walkInCustomer,
                service: b.service?.name || '',
                therapist: b.therapist?.name || '—',
                scheduledStart: b.scheduledStart,
                scheduledEnd: b.scheduledEnd,
                duration: b.durationSnapshot || b.service?.duration || 0,
                paymentMethod: b.spaPaymentMethod || 'room_bill',
                price: b.price,
                priceFormatted: fmtPrice(b.price, nat, exchangeRate),
              });
            }}
          />
        </Modal>
      )}

      {/* ── WALK-IN MODAL ─────────────────────────────────────────────────── */}
      {showWalkIn && (
        <WalkInModal
          services={services}
          therapists={therapists}
          prefill={walkInSlot}
          date={scheduleDate}
          onClose={() => { setShowWalkIn(false); setWalkInSlot(null); }}
          onSaved={() => { setShowWalkIn(false); setWalkInSlot(null); fetchSchedule(); fetchAll(); }}
        />
      )}

      {/* ── THERAPIST FORM ────────────────────────────────────────────────── */}
      {showTherapistForm && (
        <TherapistFormModal
          services={services}
          initial={editingTherapist}
          onClose={() => setShowTherapistForm(false)}
          onSaved={() => { setShowTherapistForm(false); fetchAll(); }}
        />
      )}

      {/* ── SERVICE FORM ──────────────────────────────────────────────────── */}
      {showServiceForm && (
        <ServiceFormModal
          initial={editingService}
          onClose={() => setShowServiceForm(false)}
          onSaved={() => { setShowServiceForm(false); fetchAll(); }}
        />
      )}
    </>
  );
}

// ── Booking Detail Modal ──────────────────────────────────────────────────────

function BookingDetailModal({ booking: b, exchangeRate, onArrive, onStatus, onComplete, onPrint }: any) {
  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          ['Guest', b.guest?.name || b.walkInCustomer?.name],
          ['Service', b.service?.name],
          ['Therapist', b.therapist?.name || '—'],
          ['Date', new Date(b.date).toDateString()],
          ['Scheduled', `${b.scheduledStart} – ${b.scheduledEnd}`],
          ['Actual', b.actualStart ? `${b.actualStart} – ${b.actualEnd}` : '—'],
          ['Price', fmtPrice(b.price, bookingNationality(b), exchangeRate)],
          ['Walk-in', b.isWalkIn ? 'Yes' : 'No'],
          ...(b.status === 'completed' ? [['Paid Via', b.spaPaymentMethod === 'cash' ? 'Cash (at desk)' : 'Room Bill']] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.muted, marginBottom: '0.2rem' }}>{k}</div>
            <div style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.navy, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.muted }}>Status:</span>
        <span style={{ background: sc.bg, color: sc.text, fontFamily: A.cinzel, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.7rem', fontWeight: 700 }}>{b.status.replace('_',' ')}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['pending','confirmed'].includes(b.status) && (
          <Btn variant="green" onClick={onArrive}><UserCheck size={13} /> Mark Arrived</Btn>
        )}
        {b.status === 'arrived' && (
          <Btn variant="primary" onClick={() => onStatus('in_progress')}><Sparkles size={13} /> Start Session</Btn>
        )}
        {['arrived','in_progress'].includes(b.status) && !b.walkInCustomer && (
          <Btn variant="green" onClick={() => onComplete('room_bill')}><CheckCircle size={13} /> Complete → Bill</Btn>
        )}
        {['arrived','in_progress'].includes(b.status) && (
          <Btn variant="ghost" onClick={() => onComplete('cash')}><CheckCircle size={13} /> Complete → Cash</Btn>
        )}
        {['pending','confirmed'].includes(b.status) && (
          <Btn variant="ghost" onClick={() => onStatus('confirmed')}>
            {b.status === 'pending' ? 'Confirm' : 'Re-confirm'}
          </Btn>
        )}
        {['pending','confirmed','arrived'].includes(b.status) && (
          <Btn variant="danger" onClick={() => onStatus('cancelled')}><X size={13} /> Cancel</Btn>
        )}
        {b.status === 'completed' && (
          <Btn variant="ghost" onClick={onPrint}><Printer size={13} /> Print Receipt</Btn>
        )}
      </div>
    </div>
  );
}

// ── Walk-in Modal ─────────────────────────────────────────────────────────────

type SpaCustomerMode = 'hotel_guest' | 'walk_in';

function WalkInModal({ services, therapists, prefill, date, onClose, onSaved }: any) {
  const [customerMode, setCustomerMode] = useState<SpaCustomerMode>('hotel_guest');
  const [form, setForm] = useState({
    service: '', guestId: '', date, startTime: prefill?.startTime || '',
    therapistId: prefill?.therapistId || '', note: '',
  });
  // External walk-in fields
  const [wicName, setWicName]             = useState('');
  const [wicPhone, setWicPhone]           = useState('');
  const [wicNationality, setWicNationality] = useState<'foreign' | 'nepali'>('foreign');
  const [guests, setGuests]               = useState<any[]>([]);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    api.get('/checkin/active').then(({ data }) => setGuests(data.guests || []));
  }, []);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.service || !form.date || !form.startTime) {
      toast.error('Fill all required fields'); return;
    }
    if (customerMode === 'hotel_guest' && !form.guestId) {
      toast.error('Select a checked-in guest'); return;
    }
    if (customerMode === 'walk_in' && !wicName.trim()) {
      toast.error('Enter walk-in customer name'); return;
    }
    setSaving(true);
    try {
      let walkInCustomerId: string | undefined;
      if (customerMode === 'walk_in') {
        const { data: wicData } = await api.post('/walkin-customers', {
          name: wicName.trim(),
          phone: wicPhone.trim() || undefined,
          type: 'spa',
          nationality: wicNationality,
        });
        if (!wicData.success) { toast.error('Failed to register walk-in customer'); return; }
        walkInCustomerId = wicData.customer._id;
      }

      const payload: any = {
        service: form.service,
        date: form.date,
        startTime: form.startTime,
        therapistId: form.therapistId || undefined,
        note: form.note,
      };
      if (walkInCustomerId) {
        payload.walkInCustomerId = walkInCustomerId;
      } else {
        payload.guestId = form.guestId;
      }

      await api.post('/spa/walkin', payload);
      toast.success(customerMode === 'walk_in' ? 'Walk-in booking created — cash at desk' : 'Walk-in booking created');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Walk-in Booking" onClose={onClose}>
      {/* Customer type toggle */}
      <div style={{ display: 'flex', border: `1px solid ${A.border}`, overflow: 'hidden', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setCustomerMode('hotel_guest')}
          style={{ flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: customerMode === 'hotel_guest' ? A.navy : '#fff', color: customerMode === 'hotel_guest' ? A.gold : A.muted, transition: 'background 0.2s' }}
        >
          Hotel Guest
        </button>
        <button
          onClick={() => setCustomerMode('walk_in')}
          style={{ flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: customerMode === 'walk_in' ? 'hsl(270 45% 40%)' : '#fff', color: customerMode === 'walk_in' ? '#fff' : A.muted, transition: 'background 0.2s' }}
        >
          External Walk-in
        </button>
      </div>

      {/* Hotel guest picker */}
      {customerMode === 'hotel_guest' && (
        <Field label="Guest *">
          <select value={form.guestId} onChange={f('guestId')} style={inputStyle}>
            <option value="">Select checked-in guest…</option>
            {guests.map((g: any) => <option key={g._id} value={g._id}>{g.name} — Room {g.room?.roomNumber}</option>)}
          </select>
        </Field>
      )}

      {/* External walk-in fields */}
      {customerMode === 'walk_in' && (
        <div style={{ padding: '0.875rem 1rem', background: 'hsl(270 40% 97%)', border: `1px solid hsl(270 40% 82%)`, marginBottom: '1rem' }}>
          <p style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(270 45% 40%)', marginBottom: '0.75rem' }}>External Customer — Cash Only</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Name *">
              <input type="text" value={wicName} onChange={e => setWicName(e.target.value)} placeholder="e.g. John Smith" style={inputStyle} />
            </Field>
            <Field label="Phone (optional)">
              <input type="text" value={wicPhone} onChange={e => setWicPhone(e.target.value)} placeholder="+1 555 000 0000" style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Nationality</label>
            <div style={{ display: 'flex', border: `1px solid ${A.border}`, overflow: 'hidden' }}>
              {(['foreign', 'nepali'] as const).map(n => (
                <button key={n} type="button" onClick={() => setWicNationality(n)}
                  style={{ flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: wicNationality === n ? A.navy : '#fff', color: wicNationality === n ? A.gold : A.muted, transition: 'background 0.2s' }}>
                  {n === 'foreign' ? 'Foreign' : 'Nepali'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Field label="Service *">
        <select value={form.service} onChange={f('service')} style={inputStyle}>
          <option value="">Select service…</option>
          {services.map((s: any) => <option key={s._id} value={s._id}>{s.name} ({s.duration} min)</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Date *">
          <input type="date" value={form.date} onChange={f('date')} style={inputStyle} />
        </Field>
        <Field label="Start Time *">
          <input type="time" value={form.startTime} onChange={f('startTime')} step="1800" style={inputStyle} />
        </Field>
      </div>
      <Field label="Therapist (optional — auto-assigns if blank)">
        <select value={form.therapistId} onChange={f('therapistId')} style={inputStyle}>
          <option value="">Auto-assign</option>
          {therapists.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input type="text" value={form.note} onChange={f('note')} placeholder="Optional note…" style={inputStyle} />
      </Field>

      {customerMode === 'walk_in' && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'hsl(142 40% 95%)', border: '1px solid hsl(142 40% 80%)', marginBottom: '0.75rem', fontSize: '0.78rem', fontFamily: A.raleway, color: 'hsl(142 45% 28%)' }}>
          Cash collected at point of completion — will not appear on any room bill.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Booking'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ── Therapist Form Modal ──────────────────────────────────────────────────────

function TherapistFormModal({ services, initial, onClose, onSaved }: any) {
  const [name, setName]         = useState(initial?.name || '');
  const [breakDur, setBreakDur] = useState(initial?.breakDuration ?? 15);
  const [specs, setSpecs]       = useState<string[]>(
    (initial?.specializations || []).map((s: any) => s._id || s)
  );
  const [saving, setSaving]     = useState(false);

  const toggleSpec = (id: string) =>
    setSpecs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const save = async () => {
    if (!name.trim() || !specs.length) { toast.error('Name and at least one specialization required'); return; }
    setSaving(true);
    try {
      const payload = { name, breakDuration: Number(breakDur), specializations: specs };
      if (initial) {
        await api.patch(`/spa/therapists/${initial._id}`, payload);
        toast.success('Therapist updated');
      } else {
        await api.post('/spa/therapists', payload);
        toast.success('Therapist created');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={initial ? 'Edit Therapist' : 'Add Therapist'} onClose={onClose}>
      <Field label="Name *">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Therapist name" />
      </Field>
      <Field label="Break After Session (minutes)">
        <input type="number" value={breakDur} min={0} onChange={e => setBreakDur(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Specializations *">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {services.map((s: any) => (
            <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={specs.includes(s._id)} onChange={() => toggleSpec(s._id)} />
              <span style={{ fontFamily: A.cinzel, fontSize: '0.72rem', color: A.navy }}>{s.name}</span>
            </label>
          ))}
        </div>
      </Field>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : initial ? 'Update' : 'Create'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ── Service Form Modal ────────────────────────────────────────────────────────

function ServiceFormModal({ initial, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name:           initial?.name           || '',
    description:    initial?.description    || '',
    duration:       initial?.duration       || 60,
    price:          initial?.price          || '',
    category:       initial?.category       || 'massage',
    gracePeriod:    initial?.gracePeriod    ?? 15,
    operatingStart: initial?.operatingStart || '09:00',
    operatingEnd:   initial?.operatingEnd   || '21:00',
    isAvailable:    initial?.isAvailable    ?? true,
  });
  const [saving, setSaving] = useState(false);

  const f = (k: string) => (e: any) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (initial) {
        await api.patch(`/spa/services/${initial._id}`, form);
        toast.success('Service updated');
      } else {
        await api.post('/spa/services', form);
        toast.success('Service created');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={initial ? 'Edit Service' : 'New Service'} onClose={onClose}>
      <Field label="Name *">
        <input value={form.name} onChange={f('name')} style={inputStyle} />
      </Field>
      <Field label="Description *">
        <textarea value={form.description} onChange={f('description')}
          style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Duration (min) *">
          <input type="number" value={form.duration} min={15} onChange={f('duration')} style={inputStyle} />
        </Field>
        <Field label="Price (NPR) *">
          <input type="number" value={form.price} min={0} onChange={f('price')} style={inputStyle} />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={f('category')} style={inputStyle}>
            {['massage','facial','body_wrap','hydrotherapy','couples'].map(c =>
              <option key={c} value={c}>{c.replace('_',' ')}</option>
            )}
          </select>
        </Field>
        <Field label="Grace Period (min)">
          <input type="number" value={form.gracePeriod} min={0} onChange={f('gracePeriod')} style={inputStyle} />
        </Field>
        <Field label="Opens">
          <input type="time" value={form.operatingStart} onChange={f('operatingStart')} style={inputStyle} />
        </Field>
        <Field label="Closes (sessions end by)">
          <input type="time" value={form.operatingEnd} onChange={f('operatingEnd')} style={inputStyle} />
        </Field>
      </div>
      <Field label="">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isAvailable} onChange={f('isAvailable')} />
          <span style={{ fontFamily: A.cinzel, fontSize: '0.72rem', color: A.navy }}>Available for booking</span>
        </label>
      </Field>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : initial ? 'Update' : 'Create'}</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}
