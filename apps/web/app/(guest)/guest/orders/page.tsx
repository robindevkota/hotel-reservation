'use client';
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useGuestSocket } from '../../../../hooks/useSocket';
import toast from 'react-hot-toast';
import { ClipboardList, CheckCircle2, XCircle, Sparkles, Hourglass, CalendarDays, Star, Ban, Shirt, Droplets, Wrench, AlarmClock, Moon, BellOff, Wind, Zap, BedDouble, Clock, Bell } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD    = 'hsl(43 72% 55%)';
const NAVY    = 'hsl(220 55% 14%)';
const CREAM   = 'hsl(40 33% 96%)';
const MUTED   = 'hsl(220 15% 45%)';
const BORDER  = 'hsl(35 25% 82%)';
const CINZEL  = "'Cinzel', serif";
const RALEWAY = "'Raleway', sans-serif";

const ORDER_STATUS_STEPS  = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
const ORDER_STEP_LABELS   = ['Placed', 'Accepted', 'Cooking', 'Ready', 'On Way', 'Done'];

const ORDER_STATUS_META: Record<string, { color: string; bg: string }> = {
  delivered:  { color: 'hsl(142 60% 38%)', bg: 'hsl(142 60% 38% / 0.1)' },
  cancelled:  { color: 'hsl(0 65% 52%)',   bg: 'hsl(0 65% 52% / 0.1)'   },
  pending:    { color: GOLD,                bg: `${GOLD}20`               },
  accepted:   { color: GOLD,                bg: `${GOLD}20`               },
  preparing:  { color: GOLD,                bg: `${GOLD}20`               },
  ready:      { color: 'hsl(200 70% 48%)', bg: 'hsl(200 70% 48% / 0.1)' },
  delivering: { color: 'hsl(200 70% 48%)', bg: 'hsl(200 70% 48% / 0.1)' },
};

const SPA_STATUS_META: Record<string, { color: string; bg: string; Icon: any; label: string }> = {
  pending:   { color: 'hsl(38 80% 38%)',  bg: 'hsl(38 90% 94%)',  Icon: Hourglass,    label: 'Pending'   },
  confirmed: { color: 'hsl(142 60% 38%)', bg: 'hsl(142 60% 94%)', Icon: CheckCircle2, label: 'Confirmed' },
  completed: { color: 'hsl(220 40% 50%)', bg: 'hsl(220 40% 94%)', Icon: CheckCircle2, label: 'Completed' },
  cancelled: { color: 'hsl(0 65% 52%)',   bg: 'hsl(0 65% 52% / 0.1)',   Icon: XCircle,      label: 'Cancelled' },
};

type Tab = 'orders' | 'spa' | 'services';

const SERVICE_TYPE_META: Record<string, { label: string; Icon: any }> = {
  laundry:          { label: 'Laundry',        Icon: Shirt      },
  towels:           { label: 'Towels',          Icon: Wind       },
  pillows:          { label: 'Pillows',         Icon: BedDouble  },
  water:            { label: 'Water',           Icon: Droplets   },
  housekeeping:     { label: 'Housekeeping',    Icon: Sparkles   },
  maintenance:      { label: 'Maintenance',     Icon: Wrench     },
  iron:             { label: 'Iron & Board',    Icon: Zap        },
  wake_up:          { label: 'Wake-Up Call',    Icon: AlarmClock },
  turndown:         { label: 'Turndown',        Icon: Moon       },
  do_not_disturb:   { label: 'Do Not Disturb',  Icon: BellOff   },
};

const SVC_STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pending:      { label: 'Pending',      color: GOLD,                  bg: `${GOLD}20`,               Icon: Hourglass    },
  acknowledged: { label: 'Acknowledged', color: 'hsl(200 70% 48%)',    bg: 'hsl(200 70% 48% / 0.1)',  Icon: Clock        },
  done:         { label: 'Done',         color: 'hsl(142 60% 38%)',    bg: 'hsl(142 60% 38% / 0.1)',  Icon: CheckCircle2 },
};

// ── Inline star rating widget ─────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem' }}
        >
          <Star
            size={18}
            strokeWidth={1.5}
            fill={(hovered || value) >= n ? GOLD : 'none'}
            color={(hovered || value) >= n ? GOLD : MUTED}
          />
        </button>
      ))}
    </div>
  );
}

// ── Rating panel shown after a delivered order ────────────────────────────────
function FoodRatingPrompt({ existingReview }: { existingReview: any }) {
  const [rating, setRating]     = useState<number>(existingReview?.foodRating ?? 0);
  const [feedback, setFeedback] = useState(existingReview?.foodFeedback ?? '');
  const [saved, setSaved]       = useState(!!existingReview?.foodRating);
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (!rating) return toast.error('Please select a star rating');
    setLoading(true);
    try {
      await api.post('/reviews', { foodRating: rating, foodFeedback: feedback });
      setSaved(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Could not save rating');
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: 'hsl(142 40% 96%)', border: '1px solid hsl(142 40% 80%)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckCircle2 size={14} color="hsl(142 55% 38%)" strokeWidth={1.5} />
        <span style={{ fontFamily: CINZEL, color: 'hsl(142 55% 28%)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Food rated {rating}/5 — thank you!
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '0.875rem', borderTop: `1px solid ${BORDER}`, paddingTop: '0.875rem' }}>
      <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Rate your meal</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Any comments? (optional)"
        rows={2}
        style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontFamily: RALEWAY, fontSize: '0.78rem', color: NAVY, border: `1px solid ${BORDER}`, resize: 'none', background: 'hsl(40 30% 98%)', outline: 'none', boxSizing: 'border-box' }}
      />
      <button
        onClick={submit}
        disabled={loading || !rating}
        style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', background: rating ? NAVY : 'hsl(220 15% 80%)', color: '#fff', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', border: 'none', cursor: rating ? 'pointer' : 'not-allowed' }}
      >
        {loading ? 'Saving…' : 'Submit'}
      </button>
    </div>
  );
}

// ── Spa rating prompt ─────────────────────────────────────────────────────────
function SpaRatingPrompt({ existingReview }: { existingReview: any }) {
  const [rating, setRating]     = useState<number>(existingReview?.spaRating ?? 0);
  const [feedback, setFeedback] = useState(existingReview?.spaFeedback ?? '');
  const [saved, setSaved]       = useState(!!existingReview?.spaRating);
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (!rating) return toast.error('Please select a star rating');
    setLoading(true);
    try {
      await api.post('/reviews', { spaRating: rating, spaFeedback: feedback });
      setSaved(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Could not save rating');
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: 'hsl(142 40% 96%)', border: '1px solid hsl(142 40% 80%)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckCircle2 size={14} color="hsl(142 55% 38%)" strokeWidth={1.5} />
        <span style={{ fontFamily: CINZEL, color: 'hsl(142 55% 28%)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Spa rated {rating}/5 — thank you!
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '0.875rem', borderTop: `1px solid ${BORDER}`, paddingTop: '0.875rem' }}>
      <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Rate this session</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Any comments? (optional)"
        rows={2}
        style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontFamily: RALEWAY, fontSize: '0.78rem', color: NAVY, border: `1px solid ${BORDER}`, resize: 'none', background: 'hsl(40 30% 98%)', outline: 'none', boxSizing: 'border-box' }}
      />
      <button
        onClick={submit}
        disabled={loading || !rating}
        style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', background: rating ? NAVY : 'hsl(220 15% 80%)', color: '#fff', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', border: 'none', cursor: rating ? 'pointer' : 'not-allowed' }}
      >
        {loading ? 'Saving…' : 'Submit'}
      </button>
    </div>
  );
}

// ── Shared cancel confirmation modal ─────────────────────────────────────────
function CancelConfirmModal({
  title, message, onConfirm, onClose, loading,
}: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 8% / 0.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '360px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ background: NAVY, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: CINZEL, color: 'hsl(0 65% 72%)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(40 20% 60%)', cursor: 'pointer', lineHeight: 1, padding: '0.1rem' }}>✕</button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontFamily: RALEWAY, color: NAVY, fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, padding: '0.625rem', background: '#fff', border: `1px solid ${BORDER}`, fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, cursor: 'pointer' }}
            >
              Keep
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ flex: 1, padding: '0.625rem', background: 'hsl(0 65% 48%)', border: 'none', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Cancelling…' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2-min countdown cancel button for food orders ─────────────────────────────
const CANCEL_WINDOW_MS = 2 * 60 * 1000;

function CancelOrderButton({ order, onCancelled }: { order: any; onCancelled: () => void }) {
  const [secsLeft, setSecsLeft] = useState(() => {
    const elapsed = Date.now() - new Date(order.placedAt).getTime();
    return Math.max(0, Math.ceil((CANCEL_WINDOW_MS - elapsed) / 1000));
  });
  const [loading, setLoading]     = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (secsLeft <= 0) return;
    const id = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secsLeft]);

  if (secsLeft <= 0 || !['pending', 'accepted'].includes(order.status)) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await api.patch(`/orders/${order._id}/cancel/guest`);
      toast.success('Order cancelled');
      setShowModal(false);
      onCancelled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not cancel order');
    } finally {
      setLoading(false);
    }
  }

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const timeLabel = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <>
      <div style={{ marginTop: '0.75rem', borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.7rem' }}>
          Cancel within <span style={{ color: 'hsl(0 65% 52%)', fontWeight: 600 }}>{timeLabel}</span>
        </span>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.875rem', background: 'transparent', border: '1px solid hsl(0 65% 52%)', color: 'hsl(0 65% 52%)', fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          <Ban size={11} strokeWidth={1.5} /> Cancel
        </button>
      </div>
      {showModal && (
        <CancelConfirmModal
          title="Cancel Order"
          message="Are you sure you want to cancel this order? This cannot be undone."
          loading={loading}
          onConfirm={handleConfirm}
          onClose={() => !loading && setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { user } = useAuthStore();
  const isNepali = user?.type === 'guest' && (user as any).nationality === 'nepali';
  const [exchangeRate, setExchangeRate] = useState(133);
  useEffect(() => {
    api.get('/settings/exchange-rate').then(({ data }) => { if (data.rate) setExchangeRate(data.rate); }).catch(() => {});
  }, []);
  const fmtSpa = (usd: number) =>
    isNepali ? `NPR ${Math.round(usd * exchangeRate).toLocaleString()}` : `$${usd}`;
  const { orders, setOrders } = useOrderStore();
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;

  const [tab, setTab]                 = useState<Tab>('orders');
  const [spaBookings, setSpaBookings] = useState<any[]>([]);
  const [spaLoading, setSpaLoading]   = useState(true);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [cancellingSpa, setCancellingSpa]     = useState<string | null>(null);
  const [spaModalTarget, setSpaModalTarget]   = useState<string | null>(null);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [svcLoading, setSvcLoading]           = useState(true);

  const onServiceUpdated = useCallback((updated: any) => {
    setServiceRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
  }, []);

  const onSpaRefresh = useCallback(() => { fetchSpa(); }, []);

  useGuestSocket(guestId, onServiceUpdated, onSpaRefresh, onSpaRefresh);

  useEffect(() => {
    api.get('/orders/my').then(({ data }) => setOrders(data.orders));
  }, [setOrders]);

  function fetchSpa() {
    setSpaLoading(true);
    api.get('/spa/bookings/my')
      .then(({ data }) => setSpaBookings(data.bookings ?? data))
      .catch(() => setSpaBookings([]))
      .finally(() => setSpaLoading(false));
  }

  useEffect(() => { fetchSpa(); }, []);

  useEffect(() => {
    api.get('/service-requests/my')
      .then(({ data }) => setServiceRequests(data.requests ?? []))
      .catch(() => setServiceRequests([]))
      .finally(() => setSvcLoading(false));
  }, []);

  useEffect(() => {
    api.get('/reviews/eligible')
      .then(({ data }) => setExistingReview(data.existing))
      .catch(() => {});
  }, []);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders   = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const activeSpa = spaBookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const pastSpa   = spaBookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const completedSpa = spaBookings.filter(b => b.status === 'completed');

  const activeOrderCount = activeOrders.length;
  const activeSpaCount   = activeSpa.length;
  const activeSvcCount   = serviceRequests.filter(r => r.status !== 'done').length;

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ background: NAVY, padding: '2rem 1.5rem 0', textAlign: 'center', borderBottom: `1px solid ${GOLD}30` }}>
        <p style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.6rem', letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Live Tracking</p>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.4rem' }}>My Activity</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', margin: '1rem 0 1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}40)` }} />
          <span style={{ color: GOLD }}>𓏤</span>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}40)` }} />
        </div>

        {/* ── Tab strip ── */}
        <div style={{ display: 'flex', borderTop: `1px solid ${GOLD}20` }}>
          {([
            { key: 'orders',   label: 'Food Orders',  badge: activeOrderCount },
            { key: 'spa',      label: 'Spa',          badge: activeSpaCount   },
            { key: 'services', label: 'Services',     badge: activeSvcCount   },
          ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: '0.875rem 0.5rem',
                  fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: active ? GOLD : 'hsl(40 30% 70%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'color 0.2s',
                }}
              >
                {label}
                {badge > 0 && (
                  <span style={{ background: GOLD, color: NAVY, fontSize: '0.5rem', fontFamily: RALEWAY, fontWeight: 700, borderRadius: '999px', minWidth: '1.1rem', height: '1.1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.2rem' }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto' }}>

        {/* ════════════════════════════════════════════════════════════════
            FOOD ORDERS TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Active Orders</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeOrders.map((order: any) => {
                    const stepIdx = ORDER_STATUS_STEPS.indexOf(order.status);
                    const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
                    return (
                      <div key={order._id} style={{ background: '#fff', border: `1px solid ${GOLD}30`, overflow: 'hidden', boxShadow: '0 2px 16px hsl(220 55% 14% / 0.08)' }}>
                        <div style={{ background: NAVY, padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontFamily: CINZEL, color: 'hsl(40 30% 92%)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                              Order #{String(order._id).slice(-6).toUpperCase()}
                            </p>
                            <p style={{ color: 'hsl(40 30% 85% / 0.4)', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                              {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1rem' }}>NPR {order.totalAmount}</p>
                            <span style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '0.15rem 0.5rem', display: 'inline-block', marginTop: '0.2rem' }}>
                              {order.status === 'pending' ? 'Placed' : order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '1rem 1.125rem' }}>
                          <div style={{ marginBottom: '0.875rem' }}>
                            <div style={{ display: 'flex', gap: '3px', marginBottom: '0.4rem' }}>
                              {ORDER_STATUS_STEPS.slice(0, -1).map((s, i) => (
                                <div key={s} style={{ flex: 1, height: '3px', background: i < stepIdx ? GOLD : i === stepIdx ? `${GOLD}50` : 'hsl(220 15% 88%)', borderRadius: '2px', transition: 'background 0.3s' }} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              {ORDER_STEP_LABELS.slice(0, -1).map((label, i) => (
                                <span key={label} style={{ fontFamily: CINZEL, fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: i <= stepIdx ? GOLD : 'hsl(220 15% 65%)' }}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {order.items.map((item: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: MUTED, fontSize: '0.75rem', fontFamily: RALEWAY }}>{item.quantity}× {item.menuItem?.name}</span>
                                <span style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem' }}>NPR {(item.unitPrice * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                          <CancelOrderButton
                            order={order}
                            onCancelled={() => api.get('/orders/my').then(({ data }) => setOrders(data.orders))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <div>
                <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Past Orders</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pastOrders.map((order: any) => {
                    const delivered = order.status === 'delivered';
                    return (
                      <div key={order._id} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: delivered ? 'hsl(142 60% 38% / 0.1)' : 'hsl(0 65% 52% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {delivered
                                ? <CheckCircle2 size={14} color="hsl(142 60% 38%)" strokeWidth={1.5} />
                                : <XCircle size={14} color="hsl(0 65% 52%)" strokeWidth={1.5} />}
                            </div>
                            <div>
                              <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.7rem', letterSpacing: '0.05em' }}>#{String(order._id).slice(-6).toUpperCase()} · {order.items.length} item(s)</p>
                              <p style={{ color: MUTED, fontSize: '0.63rem', marginTop: '0.1rem', fontFamily: RALEWAY }}>{new Date(order.placedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.9rem' }}>NPR {order.totalAmount}</p>
                            <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: delivered ? 'hsl(142 60% 38%)' : 'hsl(0 65% 52%)' }}>
                              {order.status.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        {/* Rating prompt — shown on the FIRST delivered order only */}
                        {delivered && order._id === deliveredOrders[0]?._id && (
                          <FoodRatingPrompt existingReview={existingReview} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div style={{ width: '4rem', height: '4rem', background: `${GOLD}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <ClipboardList size={24} color={GOLD} strokeWidth={1.5} />
                </div>
                <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>No food orders yet</p>
                <p style={{ color: MUTED, fontSize: '0.8rem', fontFamily: RALEWAY }}>Visit the Menu to place your first order</p>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SPA BOOKINGS TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'spa' && (
          <>
            {spaLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: MUTED, fontFamily: RALEWAY, fontSize: '0.85rem' }}>Loading bookings…</div>
            ) : (
              <>
                {activeSpa.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Upcoming Bookings</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeSpa.map((b: any) => {
                        const meta = SPA_STATUS_META[b.status] || SPA_STATUS_META.pending;
                        const { Icon } = meta;
                        return (
                          <div key={b._id} style={{ background: '#fff', border: `1px solid ${GOLD}30`, overflow: 'hidden', boxShadow: '0 2px 16px hsl(220 55% 14% / 0.08)' }}>
                            <div style={{ background: NAVY, padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Sparkles size={14} color={GOLD} strokeWidth={1.5} />
                                <p style={{ fontFamily: CINZEL, color: 'hsl(40 30% 92%)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>{b.service?.name ?? 'Spa Service'}</p>
                              </div>
                              <span style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Icon size={10} strokeWidth={2} />{meta.label}
                              </span>
                            </div>
                            <div style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CalendarDays size={13} color={GOLD} strokeWidth={1.5} />
                                <span style={{ fontFamily: RALEWAY, color: NAVY, fontSize: '0.78rem' }}>
                                  {new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{' · '}{b.time}
                                </span>
                              </div>
                              {b.service?.duration && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Hourglass size={13} color={MUTED} strokeWidth={1.5} />
                                  <span style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem' }}>{b.service.duration} min session</span>
                                </div>
                              )}
                              {b.service?.price && (
                                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                  <span style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Session Price</span>
                                  <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.95rem' }}>{fmtSpa(b.service.price)}</span>
                                </div>
                              )}
                              {['pending', 'confirmed', 'arrived'].includes(b.status) && (
                                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.625rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => setSpaModalTarget(b._id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.875rem', background: 'transparent', border: '1px solid hsl(0 65% 52%)', color: 'hsl(0 65% 52%)', fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                                  >
                                    <Ban size={11} strokeWidth={1.5} /> Cancel Booking
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pastSpa.length > 0 && (
                  <div>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Past Bookings</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {pastSpa.map((b: any) => {
                        const meta = SPA_STATUS_META[b.status] || SPA_STATUS_META.completed;
                        const { Icon } = meta;
                        const isCompleted = b.status === 'completed';
                        return (
                          <div key={b._id} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Icon size={14} color={meta.color} strokeWidth={1.5} />
                                </div>
                                <div>
                                  <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.7rem', letterSpacing: '0.05em' }}>{b.service?.name ?? 'Spa Service'}</p>
                                  <p style={{ color: MUTED, fontSize: '0.63rem', marginTop: '0.1rem', fontFamily: RALEWAY }}>
                                    {new Date(b.date).toLocaleDateString()} · {b.time}
                                  </p>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {b.service?.price && <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.9rem' }}>{fmtSpa(b.service.price)}</p>}
                                <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.color }}>{meta.label}</p>
                              </div>
                            </div>
                            {/* Rating prompt — only on the first completed booking */}
                            {isCompleted && b._id === completedSpa[0]?._id && (
                              <SpaRatingPrompt existingReview={existingReview} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {spaBookings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ width: '4rem', height: '4rem', background: `${GOLD}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                      <Sparkles size={24} color={GOLD} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>No spa bookings yet</p>
                    <p style={{ color: MUTED, fontSize: '0.8rem', fontFamily: RALEWAY }}>Visit Book Spa to schedule your session</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SERVICES TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'services' && (
          <>
            {svcLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: MUTED, fontFamily: RALEWAY, fontSize: '0.85rem' }}>Loading requests…</div>
            ) : serviceRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div style={{ width: '4rem', height: '4rem', background: `${GOLD}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Bell size={24} color={GOLD} strokeWidth={1.5} />
                </div>
                <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>No service requests yet</p>
                <p style={{ color: MUTED, fontSize: '0.8rem', fontFamily: RALEWAY }}>Use Quick Services on the dashboard to request assistance</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {serviceRequests.map((req: any) => {
                  const typeMeta  = SERVICE_TYPE_META[req.type]  || { label: req.type, Icon: Bell };
                  const statMeta  = SVC_STATUS_META[req.status]  || SVC_STATUS_META.pending;
                  const { Icon: TypeIcon } = typeMeta;
                  const { Icon: StatIcon } = statMeta;
                  return (
                    <div key={req._id} style={{ background: '#fff', border: `1px solid ${req.status === 'done' ? BORDER : GOLD + '30'}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: req.status === 'done' ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', background: statMeta.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TypeIcon size={14} color={statMeta.color} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem', letterSpacing: '0.06em' }}>{typeMeta.label}</p>
                          <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.63rem', marginTop: '0.1rem' }}>
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' · '}{new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: CINZEL, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: statMeta.color, background: statMeta.bg, padding: '0.2rem 0.5rem' }}>
                        <StatIcon size={10} strokeWidth={2} />{statMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {spaModalTarget && (
        <CancelConfirmModal
          title="Cancel Booking"
          message="Are you sure you want to cancel this spa booking? This cannot be undone."
          loading={cancellingSpa === spaModalTarget}
          onConfirm={async () => {
            const id = spaModalTarget;
            setCancellingSpa(id);
            try {
              await api.patch(`/spa/bookings/${id}/cancel`);
              toast.success('Booking cancelled');
              setSpaModalTarget(null);
              fetchSpa();
            } catch (e: any) {
              toast.error(e?.response?.data?.message || 'Could not cancel booking');
            } finally {
              setCancellingSpa(null);
            }
          }}
          onClose={() => { if (!cancellingSpa) setSpaModalTarget(null); }}
        />
      )}
    </div>
  );
}
