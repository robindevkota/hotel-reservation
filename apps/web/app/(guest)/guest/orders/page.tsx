'use client';
import React, { useEffect } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useGuestSocket } from '../../../../hooks/useSocket';
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react';

const GOLD = 'hsl(43 72% 55%)';
const NAVY = 'hsl(220 55% 14%)';
const CREAM = 'hsl(40 30% 96%)';

const STATUS_STEPS = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
const STEP_LABELS = ['Placed', 'Accepted', 'Cooking', 'Ready', 'On Way', 'Done'];

const STATUS_META: Record<string, { color: string; bg: string }> = {
  delivered:  { color: 'hsl(142 60% 38%)', bg: 'hsl(142 60% 38% / 0.1)' },
  cancelled:  { color: 'hsl(0 65% 52%)',   bg: 'hsl(0 65% 52% / 0.1)' },
  pending:    { color: GOLD,                bg: `${GOLD}15` },
  accepted:   { color: GOLD,                bg: `${GOLD}15` },
  preparing:  { color: GOLD,                bg: `${GOLD}15` },
  ready:      { color: 'hsl(200 70% 48%)', bg: 'hsl(200 70% 48% / 0.1)' },
  delivering: { color: 'hsl(200 70% 48%)', bg: 'hsl(200 70% 48% / 0.1)' },
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { orders, setOrders } = useOrderStore();
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;
  useGuestSocket(guestId);

  useEffect(() => {
    api.get('/orders/my').then(({ data }) => setOrders(data.orders));
  }, [setOrders]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders   = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: NAVY, padding: '2rem 1.5rem 2rem', textAlign: 'center', borderBottom: `1px solid ${GOLD}30` }}>
        <p style={{ fontFamily: "'Cinzel', serif", color: GOLD, fontSize: '0.6rem', letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Live Tracking</p>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.4rem' }}>My Orders</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}40)` }} />
          <span style={{ color: GOLD }}>𓏤</span>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}40)` }} />
        </div>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto' }}>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Active Orders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeOrders.map((order: any) => {
                const stepIdx = STATUS_STEPS.indexOf(order.status);
                const meta = STATUS_META[order.status] || STATUS_META.pending;
                return (
                  <div key={order._id} style={{ background: '#fff', border: `1px solid ${GOLD}30`, overflow: 'hidden', boxShadow: '0 2px 16px hsl(220 55% 14% / 0.08)' }}>
                    {/* Order header */}
                    <div style={{ background: NAVY, padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 92%)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                          Order #{String(order._id).slice(-6).toUpperCase()}
                        </p>
                        <p style={{ color: 'hsl(40 30% 85% / 0.4)', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                          {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1rem' }}>${order.totalAmount}</p>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '0.15rem 0.5rem', display: 'inline-block', marginTop: '0.2rem' }}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1rem 1.125rem' }}>
                      {/* Progress bar */}
                      <div style={{ marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', gap: '3px', marginBottom: '0.4rem' }}>
                          {STATUS_STEPS.slice(0, -1).map((s, i) => (
                            <div key={s} style={{ flex: 1, height: '3px', background: i < stepIdx ? GOLD : i === stepIdx ? `${GOLD}50` : 'hsl(220 15% 88%)', borderRadius: '2px', transition: 'background 0.3s' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          {STEP_LABELS.slice(0, -1).map((label, i) => (
                            <span key={label} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: i <= stepIdx ? GOLD : 'hsl(220 15% 65%)' }}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ borderTop: '1px solid hsl(220 15% 92%)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {order.items.map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'hsl(220 15% 45%)', fontSize: '0.75rem' }}>{item.quantity}× {item.menuItem?.name}</span>
                            <span style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.72rem' }}>${(item.unitPrice * item.quantity).toFixed(2)}</span>
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
            <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Past Orders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pastOrders.map((order: any) => {
                const delivered = order.status === 'delivered';
                return (
                  <div key={order._id} style={{ background: '#fff', border: '1px solid hsl(220 15% 90%)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: delivered ? 'hsl(142 60% 38% / 0.1)' : 'hsl(0 65% 52% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {delivered
                          ? <CheckCircle2 size={14} color="hsl(142 60% 38%)" strokeWidth={1.5} />
                          : <XCircle size={14} color="hsl(0 65% 52%)" strokeWidth={1.5} />}
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.7rem', letterSpacing: '0.05em' }}>#{String(order._id).slice(-6).toUpperCase()} · {order.items.length} item(s)</p>
                        <p style={{ color: 'hsl(220 15% 55%)', fontSize: '0.63rem', marginTop: '0.1rem' }}>{new Date(order.placedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.9rem' }}>${order.totalAmount}</p>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: delivered ? 'hsl(142 60% 38%)' : 'hsl(0 65% 52%)' }}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ width: '4rem', height: '4rem', background: `${GOLD}12`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <ClipboardList size={24} color={GOLD} strokeWidth={1.5} />
            </div>
            <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>No orders yet</p>
            <p style={{ color: 'hsl(220 15% 55%)', fontSize: '0.8rem' }}>Visit the Menu to place your first order</p>
          </div>
        )}
      </div>
    </div>
  );
}
