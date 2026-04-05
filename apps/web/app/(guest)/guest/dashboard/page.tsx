'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../../store/authStore';
import { useBilling } from '../../../../hooks/useBilling';
import { useGuestSocket } from '../../../../hooks/useSocket';
import api from '../../../../lib/api';
import { UtensilsCrossed, Flower2, ClipboardList, Receipt, CheckCircle2, Clock } from 'lucide-react';

const GOLD = 'hsl(43 72% 55%)';
const NAVY = 'hsl(220 55% 14%)';
const CREAM = 'hsl(40 30% 96%)';

const STATUS_COLOR: Record<string, string> = {
  delivered: 'hsl(142 60% 40%)',
  cancelled: 'hsl(0 65% 55%)',
  pending: GOLD,
  preparing: GOLD,
  ready: GOLD,
  delivering: GOLD,
};

export default function GuestDashboardPage() {
  const { user } = useAuthStore();
  const { bill, loading: billLoading } = useBilling(true);
  const [orders, setOrders] = useState<any[]>([]);
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;

  useGuestSocket(guestId);

  useEffect(() => {
    if (!guestId) return;
    api.get('/orders/my').then(({ data }) => setOrders(data.orders || []));
  }, [guestId]);

  if (!user || user.type !== 'guest') return null;

  const g = user as any;
  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  const actions = [
    { href: '/guest/menu',    Icon: UtensilsCrossed, label: 'Order Food',    desc: 'In-room dining' },
    { href: '/guest/spa',     Icon: Flower2,         label: 'Book Spa',      desc: 'Ancient rituals' },
    { href: '/guest/orders',  Icon: ClipboardList,   label: 'Track Orders',  desc: 'Live status' },
    { href: '/guest/billing', Icon: Receipt,         label: 'View Bill',     desc: 'Your account' },
  ];

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>
      {/* Hero banner */}
      <div style={{ background: NAVY, padding: '2rem 1.5rem 2.5rem', textAlign: 'center', borderBottom: `1px solid ${GOLD}30` }}>
        <p style={{ fontFamily: "'Cinzel', serif", color: `${GOLD}`, fontSize: '0.6rem', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Welcome</p>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.6rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>Your Royal Stay</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50)` }} />
          <span style={{ color: GOLD, fontSize: '1rem' }}>𓂀</span>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}50)` }} />
        </div>
        <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.55)', fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>{g.roomName}</p>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '-1.25rem' }}>
          {[
            { value: orders.length, label: 'Orders' },
            { value: billLoading ? '—' : `$${bill?.grandTotal?.toFixed(0) || '0'}`, label: 'Total Bill' },
            { value: activeCount, label: 'Active' },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: '#fff', border: `1px solid ${GOLD}25`, padding: '0.875rem 0.5rem', textAlign: 'center', boxShadow: '0 2px 12px hsl(220 55% 14% / 0.08)' }}>
              <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1.25rem', lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(220 15% 50%)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.35rem' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Services</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {actions.map(({ href, Icon, label, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: `1px solid ${GOLD}20`, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 6px hsl(220 55% 14% / 0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <div style={{ width: '2.5rem', height: '2.5rem', background: `${GOLD}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <Icon size={18} color={GOLD} strokeWidth={1.5} />
                </div>
                <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</p>
                <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(220 15% 55%)', fontSize: '0.55rem', letterSpacing: '0.05em' }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Recent Orders</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {orders.slice(0, 3).map((order: any) => (
                <div key={order._id} style={{ background: '#fff', border: `1px solid hsl(220 55% 14% / 0.08)`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '2rem', height: '2rem', background: order.status === 'delivered' ? 'hsl(142 60% 40% / 0.1)' : `${GOLD}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {order.status === 'delivered'
                        ? <CheckCircle2 size={14} color="hsl(142 60% 40%)" strokeWidth={1.5} />
                        : <Clock size={14} color={GOLD} strokeWidth={1.5} />}
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.7rem' }}>{order.items?.length} item(s)</p>
                      <p style={{ color: 'hsl(220 15% 55%)', fontSize: '0.65rem' }}>{new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '0.9rem' }}>${order.totalAmount}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: STATUS_COLOR[order.status] || GOLD }}>{order.status.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
