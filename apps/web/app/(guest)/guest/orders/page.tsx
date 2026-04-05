'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useGuestSocket } from '../../../../hooks/useSocket';
import { ClipboardList, CheckCircle2, XCircle, Sparkles, Hourglass, CalendarDays } from 'lucide-react';

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

// ── Active tab ─────────────────────────────────────────────────────────────────
type Tab = 'orders' | 'spa';

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { orders, setOrders } = useOrderStore();
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;
  useGuestSocket(guestId);

  const [tab, setTab]           = useState<Tab>('orders');
  const [spaBookings, setSpaBookings] = useState<any[]>([]);
  const [spaLoading, setSpaLoading]   = useState(true);

  useEffect(() => {
    api.get('/orders/my').then(({ data }) => setOrders(data.orders));
  }, [setOrders]);

  useEffect(() => {
    api.get('/spa/bookings/my')
      .then(({ data }) => setSpaBookings(data.bookings ?? data))
      .catch(() => setSpaBookings([]))
      .finally(() => setSpaLoading(false));
  }, []);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders   = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const activeSpa = spaBookings.filter(b => !['completed', 'cancelled'].includes(b.status));
  const pastSpa   = spaBookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  // total active items badge counts
  const activeOrderCount = activeOrders.length;
  const activeSpaCount   = activeSpa.length;

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
            { key: 'orders', label: 'Food Orders', badge: activeOrderCount },
            { key: 'spa',    label: 'Spa Bookings', badge: activeSpaCount  },
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
                        {/* Order header */}
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
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '1rem 1.125rem' }}>
                          {/* Progress bar */}
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

                          {/* Items */}
                          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {order.items.map((item: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: MUTED, fontSize: '0.75rem', fontFamily: RALEWAY }}>{item.quantity}× {item.menuItem?.name}</span>
                                <span style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem' }}>NPR {(item.unitPrice * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
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
                      <div key={order._id} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            {order.status}
                          </p>
                        </div>
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
                {/* Active Spa Bookings */}
                {activeSpa.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Upcoming Bookings</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeSpa.map((b: any) => {
                        const meta = SPA_STATUS_META[b.status] || SPA_STATUS_META.pending;
                        const { Icon } = meta;
                        return (
                          <div key={b._id} style={{ background: '#fff', border: `1px solid ${GOLD}30`, overflow: 'hidden', boxShadow: '0 2px 16px hsl(220 55% 14% / 0.08)' }}>
                            {/* Card header */}
                            <div style={{ background: NAVY, padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Sparkles size={14} color={GOLD} strokeWidth={1.5} />
                                <p style={{ fontFamily: CINZEL, color: 'hsl(40 30% 92%)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                                  {b.service?.name ?? 'Spa Service'}
                                </p>
                              </div>
                              <span style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '0.2rem 0.6rem', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Icon size={10} strokeWidth={2} />
                                {meta.label}
                              </span>
                            </div>

                            <div style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CalendarDays size={13} color={GOLD} strokeWidth={1.5} />
                                <span style={{ fontFamily: RALEWAY, color: NAVY, fontSize: '0.78rem' }}>
                                  {new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  {' · '}{b.time}
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
                                  <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.95rem' }}>NPR {b.service.price}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Past Spa Bookings */}
                {pastSpa.length > 0 && (
                  <div>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Past Bookings</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {pastSpa.map((b: any) => {
                        const meta = SPA_STATUS_META[b.status] || SPA_STATUS_META.completed;
                        const { Icon } = meta;
                        return (
                          <div key={b._id} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                              {b.service?.price && <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.9rem' }}>NPR {b.service.price}</p>}
                              <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.color }}>{meta.label}</p>
                            </div>
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

      </div>
    </div>
  );
}
