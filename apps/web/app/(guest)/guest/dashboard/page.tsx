'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../../store/authStore';
import { useBilling } from '../../../../hooks/useBilling';
import { useGuestSocket } from '../../../../hooks/useSocket';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { UtensilsCrossed, Flower2, ClipboardList, Receipt, CheckCircle2, Clock, Hourglass, XCircle, Star } from 'lucide-react';

const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 14%)';
const CREAM  = 'hsl(40 30% 96%)';
const MUTED  = 'hsl(220 15% 55%)';
const BORDER = 'hsl(220 55% 14% / 0.08)';
const CINZEL  = "'Cinzel', serif";
const CINZEL_DEC = "'Cinzel Decorative', serif";
const RALEWAY = "'Raleway', sans-serif";

const ORDER_STATUS_COLOR: Record<string, string> = {
  delivered: 'hsl(142 60% 40%)',
  cancelled: 'hsl(0 65% 55%)',
  pending: GOLD, preparing: GOLD, accepted: GOLD, ready: GOLD, delivering: GOLD,
};

const SPA_STATUS_META: Record<string, { color: string; bg: string; Icon: any }> = {
  pending:   { color: 'hsl(38 80% 38%)',  bg: 'hsl(38 90% 94%)',          Icon: Hourglass    },
  confirmed: { color: 'hsl(142 60% 38%)', bg: 'hsl(142 60% 38% / 0.1)',   Icon: CheckCircle2 },
  completed: { color: 'hsl(220 40% 50%)', bg: 'hsl(220 40% 94%)',          Icon: CheckCircle2 },
  cancelled: { color: 'hsl(0 65% 52%)',   bg: 'hsl(0 65% 52% / 0.1)',     Icon: XCircle      },
};

// Unified activity item for the combined "Recent Activity" list
type ActivityItem =
  | { kind: 'order'; data: any; sortKey: number }
  | { kind: 'spa';   data: any; sortKey: number };

// ── Inline star picker ────────────────────────────────────────────────────────
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
            size={20}
            strokeWidth={1.5}
            fill={(hovered || value) >= n ? GOLD : 'none'}
            color={(hovered || value) >= n ? GOLD : MUTED}
          />
        </button>
      ))}
    </div>
  );
}

// ── Rate Your Stay card ───────────────────────────────────────────────────────
function RateYourStay({ eligible, existing }: { eligible: any; existing: any }) {
  const [roomRating,   setRoomRating]   = useState<number>(existing?.roomRating ?? 0);
  const [roomFeedback, setRoomFeedback] = useState(existing?.roomFeedback ?? '');
  const [foodRating,   setFoodRating]   = useState<number>(existing?.foodRating ?? 0);
  const [foodFeedback, setFoodFeedback] = useState(existing?.foodFeedback ?? '');
  const [spaRating,    setSpaRating]    = useState<number>(existing?.spaRating ?? 0);
  const [spaFeedback,  setSpaFeedback]  = useState(existing?.spaFeedback ?? '');
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  const hasAny = roomRating > 0 || (eligible?.food && foodRating > 0) || (eligible?.spa && spaRating > 0);

  async function submit() {
    if (!hasAny) return toast.error('Please rate at least one department');
    setLoading(true);
    try {
      const body: any = {};
      if (roomRating > 0) { body.roomRating = roomRating; body.roomFeedback = roomFeedback; }
      if (eligible?.food && foodRating > 0) { body.foodRating = foodRating; body.foodFeedback = foodFeedback; }
      if (eligible?.spa  && spaRating  > 0) { body.spaRating  = spaRating;  body.spaFeedback  = spaFeedback;  }
      await api.post('/reviews', body);
      setSaved(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Could not save review');
    } finally {
      setLoading(false);
    }
  }

  if (saved || (existing && existing.roomRating && (!eligible?.food || existing.foodRating) && (!eligible?.spa || existing.spaRating))) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${GOLD}25`, padding: '1.25rem', marginBottom: '1.75rem', textAlign: 'center' }}>
        <CheckCircle2 size={22} color="hsl(142 55% 38%)" strokeWidth={1.5} style={{ margin: '0 auto 0.5rem' }} />
        <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Review Submitted</p>
        <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem', marginTop: '0.25rem' }}>Thank you for helping us improve</p>
      </div>
    );
  }

  const depts = [
    { key: 'room', label: 'Room & Hotel', eligible: true,           rating: roomRating, setRating: setRoomRating, feedback: roomFeedback, setFeedback: setRoomFeedback },
    { key: 'food', label: 'Food & Dining', eligible: eligible?.food, rating: foodRating, setRating: setFoodRating, feedback: foodFeedback, setFeedback: setFoodFeedback },
    { key: 'spa',  label: 'Spa',           eligible: eligible?.spa,  rating: spaRating,  setRating: setSpaRating,  feedback: spaFeedback,  setFeedback: setSpaFeedback  },
  ].filter(d => d.eligible);

  return (
    <div style={{ background: '#fff', border: `1px solid ${GOLD}25`, padding: '1.25rem', marginBottom: '1.75rem', boxShadow: '0 2px 12px hsl(220 55% 14% / 0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Star size={15} color={GOLD} strokeWidth={1.5} fill={GOLD} />
        <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Rate Your Stay</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {depts.map(({ key, label, rating, setRating, feedback, setFeedback }) => (
          <div key={key}>
            <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{label}</p>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback (optional)"
                rows={2}
                style={{ width: '100%', marginTop: '0.4rem', padding: '0.4rem 0.6rem', fontFamily: RALEWAY, fontSize: '0.75rem', color: NAVY, border: `1px solid ${BORDER}`, resize: 'none', background: 'hsl(40 30% 98%)', outline: 'none', boxSizing: 'border-box' }}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={loading || !hasAny}
        style={{ marginTop: '1rem', width: '100%', padding: '0.625rem', background: hasAny ? NAVY : 'hsl(220 15% 80%)', color: '#fff', fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: hasAny ? 'pointer' : 'not-allowed' }}
      >
        {loading ? 'Saving…' : 'Submit Review'}
      </button>
    </div>
  );
}

export default function GuestDashboardPage() {
  const { user } = useAuthStore();
  const { bill, loading: billLoading } = useBilling(true);
  const [orders, setOrders]           = useState<any[]>([]);
  const [spaBookings, setSpaBookings] = useState<any[]>([]);
  const [eligible, setEligible]       = useState<any>(null);
  const [existingReview, setExistingReview] = useState<any>(null);
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;

  useGuestSocket(guestId);

  useEffect(() => {
    if (!guestId) return;
    api.get('/orders/my').then(({ data }) => setOrders(data.orders || []));
    api.get('/spa/bookings/my')
      .then(({ data }) => setSpaBookings(data.bookings ?? data ?? []))
      .catch(() => setSpaBookings([]));
    api.get('/reviews/eligible')
      .then(({ data }) => { setEligible(data.eligible); setExistingReview(data.existing); })
      .catch(() => {});
  }, [guestId]);

  if (!user || user.type !== 'guest') return null;

  const g = user as any;
  const activeOrderCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const activeSpaCount   = spaBookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length;
  const activeCount      = activeOrderCount + activeSpaCount;

  // Merge + sort by date descending, take first 4
  const recentActivity: ActivityItem[] = [
    ...orders.map(o => ({ kind: 'order' as const, data: o, sortKey: new Date(o.placedAt).getTime() })),
    ...spaBookings.map(b => ({ kind: 'spa' as const, data: b, sortKey: new Date(b.createdAt ?? b.date).getTime() })),
  ]
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 4);

  const actions = [
    { href: '/guest/menu',    Icon: UtensilsCrossed, label: 'Order Food',   desc: 'In-room dining'  },
    { href: '/guest/spa',     Icon: Flower2,         label: 'Book Spa',     desc: 'Ancient rituals' },
    { href: '/guest/orders',  Icon: ClipboardList,   label: 'Track Orders', desc: 'Live status'     },
    { href: '/guest/billing', Icon: Receipt,         label: 'View Bill',    desc: 'Your account'    },
  ];

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>
      {/* Hero banner */}
      <div style={{ background: NAVY, padding: '2rem 1.5rem 2.5rem', textAlign: 'center', borderBottom: `1px solid ${GOLD}30` }}>
        <p style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.6rem', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Welcome</p>
        <h1 style={{ fontFamily: CINZEL_DEC, color: 'hsl(40 30% 94%)', fontSize: '1.6rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>Your Royal Stay</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50)` }} />
          <span style={{ color: GOLD, fontSize: '1rem' }}>𓂀</span>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}50)` }} />
        </div>
        <p style={{ fontFamily: CINZEL_DEC, color: 'hsl(40 30% 94%)', fontSize: '1rem', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{g.name}</p>
        <p style={{ fontFamily: CINZEL, color: 'hsl(40 30% 85% / 0.55)', fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{g.roomName}{g.roomNumber ? ` · Room ${g.roomNumber}` : ''}</p>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '-1.25rem' }}>
          {[
            { value: orders.length + spaBookings.length, label: 'Activity' },
            { value: billLoading ? '—' : `NPR ${bill?.grandTotal?.toFixed(0) || '0'}`, label: 'Total Bill' },
            { value: activeCount, label: 'Active' },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: '#fff', border: `1px solid ${GOLD}25`, padding: '0.875rem 0.5rem', textAlign: 'center', boxShadow: '0 2px 12px hsl(220 55% 14% / 0.08)' }}>
              <p style={{ fontFamily: CINZEL_DEC, color: GOLD, fontSize: '1.1rem', lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.35rem' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Services</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {actions.map(({ href, Icon, label, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{ background: '#fff', border: `1px solid ${GOLD}20`, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 6px hsl(220 55% 14% / 0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '2.5rem', height: '2.5rem', background: `${GOLD}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Icon size={18} color={GOLD} strokeWidth={1.5} />
                </div>
                <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</p>
                <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.55rem', letterSpacing: '0.05em' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Rate Your Stay */}
        {eligible && <RateYourStay eligible={eligible} existing={existingReview} />}

        {/* Recent Activity — food orders + spa bookings merged */}
        {recentActivity.length > 0 && (
          <div>
            <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Recent Activity</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentActivity.map((item) => {
                if (item.kind === 'order') {
                  const order = item.data;
                  const iconColor = order.status === 'delivered' ? 'hsl(142 60% 40%)' : order.status === 'cancelled' ? 'hsl(0 65% 52%)' : GOLD;
                  const iconBg   = order.status === 'delivered' ? 'hsl(142 60% 40% / 0.1)' : order.status === 'cancelled' ? 'hsl(0 65% 52% / 0.1)' : `${GOLD}15`;
                  return (
                    <div key={`order-${order._id}`} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2rem', height: '2rem', background: iconBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {order.status === 'delivered'
                            ? <CheckCircle2 size={14} color={iconColor} strokeWidth={1.5} />
                            : order.status === 'cancelled'
                              ? <XCircle size={14} color={iconColor} strokeWidth={1.5} />
                              : <Clock size={14} color={iconColor} strokeWidth={1.5} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.7rem' }}>{order.items?.length} item(s)</p>
                            <span style={{ fontFamily: CINZEL, fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(220 40% 55%)', background: 'hsl(220 40% 94%)', padding: '0.1rem 0.35rem' }}>Food</span>
                          </div>
                          <p style={{ color: MUTED, fontSize: '0.63rem', fontFamily: RALEWAY }}>{new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: CINZEL_DEC, color: GOLD, fontSize: '0.9rem' }}>NPR {order.totalAmount}</p>
                        <p style={{ fontFamily: CINZEL, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: ORDER_STATUS_COLOR[order.status] || GOLD }}>{order.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                  );
                }

                // Spa booking
                const b = item.data;
                const meta = SPA_STATUS_META[b.status] || SPA_STATUS_META.pending;
                const { Icon: SpaIcon } = meta;
                return (
                  <div key={`spa-${b._id}`} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '2rem', height: '2rem', background: meta.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SpaIcon size={14} color={meta.color} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.7rem' }}>{b.service?.name ?? 'Spa Service'}</p>
                          <span style={{ fontFamily: CINZEL, fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(280 40% 45%)', background: 'hsl(280 40% 94%)', padding: '0.1rem 0.35rem' }}>Spa</span>
                        </div>
                        <p style={{ color: MUTED, fontSize: '0.63rem', fontFamily: RALEWAY }}>
                          {new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {b.time}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {b.price != null && <p style={{ fontFamily: CINZEL_DEC, color: GOLD, fontSize: '0.9rem' }}>NPR {b.price}</p>}
                      <p style={{ fontFamily: CINZEL, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.color }}>{b.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
