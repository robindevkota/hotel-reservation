'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, CalendarCheck, BedDouble, UtensilsCrossed,
  Flower2, Users, BookOpen, Receipt, LogOut, Menu, UserCircle,
  Package2, ShieldPlus, Bell, X, ChevronRight, Tag, UserPlus, GitMerge, SlidersHorizontal, FileBarChart2, Star,
} from 'lucide-react';
import { getSocket, connectSocket } from '../../lib/socket';
import type { Order } from '../../store/orderStore';
import toast from 'react-hot-toast';

function playOrderAlert() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch {}
}

function OrderAlertModal({ user }: { user: any }) {
  const [queue, setQueue] = useState<Order[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    connectSocket();

    const onConnect = () => { socket.emit('join:kitchen'); };
    if (socket.connected) {
      socket.emit('join:kitchen');
    } else {
      socket.on('connect', onConnect);
    }

    const onNewOrder = (order: Order) => {
      console.log('[Layout] order:new received', order);
      playOrderAlert();
      setQueue((q) => q.some((o) => o._id === order._id) ? q : [...q, order]);
    };

    socket.on('order:new', onNewOrder);
    return () => {
      socket.off('connect', onConnect);
      socket.off('order:new', onNewOrder);
    };
  }, [user]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setQueue((q) => q.slice(1));
    }, 10000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current?._id]);

  if (!current) return null;

  const remaining = queue.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(13,27,62,0.55)', backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '420px',
        border: '1px solid hsl(43 72% 55% / 0.35)',
        boxShadow: '0 20px 60px hsl(220 55% 10% / 0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'hsl(220 55% 18%)', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={16} color="hsl(43 72% 55%)" strokeWidth={2} />
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'hsl(43 72% 55%)' }}>
              New Order Received
            </span>
          </div>
          {remaining > 0 && (
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.6rem', color: 'rgba(245,236,215,0.6)', letterSpacing: '0.1em' }}>
              +{remaining} more in queue
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px solid hsl(35 25% 88%)' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', fontWeight: 700, color: 'hsl(220 55% 18%)', marginBottom: '0.2rem' }}>
              Room Order
            </p>
            <p style={{ fontFamily: "'Cinzel',serif", fontSize: '0.6rem', letterSpacing: '0.12em', color: 'hsl(220 15% 50%)', textTransform: 'uppercase' }}>
              {new Date(current.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {current.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.92rem', color: 'hsl(220 55% 18%)' }}>
                  {item.quantity}× {item.menuItem?.name}
                </span>
                <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.68rem', color: 'hsl(220 15% 50%)' }}>
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {current.notes && (
            <div style={{ background: 'hsl(43 72% 55% / 0.08)', border: '1px solid hsl(43 72% 55% / 0.2)', padding: '0.6rem 0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.88rem', color: 'hsl(220 55% 18%)', fontStyle: 'italic' }}>
                Note: {current.notes}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid hsl(35 25% 88%)' }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(220 15% 50%)' }}>Total</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.85rem', fontWeight: 700, color: 'hsl(220 55% 18%)' }}>${current.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid hsl(35 25% 88%)', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setQueue((q) => q.slice(1))}
            style={{
              flex: 1, padding: '0.65rem', border: '1px solid hsl(35 25% 82%)',
              background: 'transparent', cursor: 'pointer',
              fontFamily: "'Cinzel',serif", fontSize: '0.62rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'hsl(220 15% 45%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            <X size={12} /> Dismiss
          </button>
          {remaining > 0 && (
            <button
              onClick={() => setQueue((q) => q.slice(1))}
              style={{
                flex: 1, padding: '0.65rem', border: 'none',
                background: 'hsl(220 55% 18%)', cursor: 'pointer',
                fontFamily: "'Cinzel',serif", fontSize: '0.62rem', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'hsl(43 72% 55%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              Next <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
const SERVICE_LABEL: Record<string, string> = {
  laundry: 'Laundry', towels: 'Towels', pillows: 'Pillows', water: 'Water',
  housekeeping: 'Housekeeping', maintenance: 'Maintenance', iron: 'Iron',
  wake_up: 'Wake-up Call', turndown: 'Turndown', do_not_disturb: 'Do Not Disturb',
};

import { Department } from '../../store/authStore';

// departments: null = visible to everyone (super_admin sees all; admin sees only their dept)
const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, departments: null },
  { href: '/admin/reservations', label: 'Reservations', icon: CalendarCheck,   departments: ['front_desk'] },
  { href: '/admin/rooms',        label: 'Rooms',        icon: BedDouble,       departments: ['front_desk'] },
  { href: '/admin/guests',       label: 'Guests',       icon: Users,           departments: ['front_desk'] },
  { href: '/admin/billing',      label: 'Billing',      icon: Receipt,         departments: ['front_desk'] },
  { href: '/admin/orders',       label: 'Kitchen Board',icon: UtensilsCrossed, departments: ['food'] },
  { href: '/admin/menu',         label: 'Menu',         icon: BookOpen,        departments: ['food'] },
  { href: '/admin/inventory',    label: 'Inventory',    icon: Package2,        departments: ['food', 'front_desk'] },
  { href: '/admin/spa',              label: 'Spa Schedule',  icon: Flower2,    departments: ['spa'] },
  { href: '/admin/walkin-customers', label: 'Walk-in Log',   icon: UserPlus,   departments: ['food','spa'] },
  { href: '/admin/reviews',           label: 'Reviews',       icon: Star,              departments: null },
  { href: '/admin/channels',          label: 'Channels',      icon: GitMerge,          departments: ['__super_admin__'] },
  { href: '/admin/offers',           label: 'Offers',        icon: Tag,               departments: ['__super_admin__'] },
  { href: '/admin/audit',            label: 'Audit Report',  icon: FileBarChart2,     departments: ['__super_admin__'] },
  { href: '/admin/settings',         label: 'Settings',      icon: SlidersHorizontal, departments: ['__super_admin__'] },
  { href: '/admin/profile',      label: 'Profile',      icon: UserCircle,      departments: null },
  { href: '/register',           label: 'Add Admin',    icon: ShieldPlus,      departments: ['__super_admin__'] },
] as { href: string; label: string; icon: React.ElementType; departments: string[] | null }[];

const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 18%)';
const NAVY2  = 'hsl(220 48% 22%)';
const CREAM  = 'rgba(245,236,215,0.7)';
const CREAM2 = 'rgba(245,236,215,0.35)';
const CINZEL = "'Cinzel', serif";

function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const role = (user as any)?.role as string;
  const dept = (user as any)?.department as Department | null;
  const visible = NAV.filter(n => {
    if (n.departments === null) return true;
    if (n.departments.includes('__super_admin__')) return role === 'super_admin';
    return role === 'super_admin' || (dept !== null && n.departments.includes(dept));
  });

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      width: collapsed ? '4.5rem' : '15rem',
      background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY2} 100%)`,
      borderRight: '1px solid rgba(201,168,76,0.12)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '1.25rem 0' : '1.25rem 1rem', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: collapsed ? 'center' : 'flex-start', minHeight: '4.5rem' }}>
        <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${GOLD}`, flexShrink: 0 }}>
            <Image src="/logo.jpg" alt="Royal Suites" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontFamily: CINZEL, fontSize: '0.72rem', letterSpacing: '0.15em', color: GOLD, whiteSpace: 'nowrap' }}>Royal Suites</p>
              <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: CREAM2, whiteSpace: 'nowrap' }}>Admin Portal</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.75rem 0' }}>
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const displayLabel = href === '/admin/inventory' && dept === 'front_desk' ? 'Expenses' : label;
          return (
            <Link key={href} href={href} title={collapsed ? displayLabel : undefined} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: collapsed ? '0.75rem 0' : '0.7rem 1rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              margin: '0.1rem 0.5rem',
              fontFamily: CINZEL, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: active ? GOLD : CREAM,
              background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
              borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.18s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = GOLD; (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.07)'; } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = CREAM; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}>
              <Icon size={17} strokeWidth={active ? 2.2 : 1.6} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{displayLabel}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: collapsed ? '0.875rem 0' : '0.875rem 1rem' }}>
        {!collapsed && user && (
          <div style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            <p style={{ fontFamily: CINZEL, fontSize: '0.72rem', color: CREAM, marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(user as any).name}</p>
            <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: CREAM2 }}>{(user as any).role}</p>
          </div>
        )}
        <button onClick={logout} title={collapsed ? 'Sign Out' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          width: '100%', justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0.5rem 0' : '0.5rem 0.5rem',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: CREAM2, transition: 'color 0.18s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
        onMouseLeave={e => (e.currentTarget.style.color = CREAM2)}>
          <LogOut size={15} strokeWidth={1.8} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

    </aside>
  );
}

function Topbar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Derive page title from pathname
  const segment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 90,
      height: '3.5rem',
      background: '#fff',
      borderBottom: '1px solid hsl(35 25% 82%)',
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem',
      gap: '1rem',
      boxShadow: '0 1px 6px hsl(220 55% 18% / 0.06)',
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '2rem', height: '2rem',
          background: 'none', border: `1px solid hsl(35 25% 82%)`,
          cursor: 'pointer', color: NAVY, flexShrink: 0,
          transition: 'background 0.18s, color 0.18s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(43 72% 55% / 0.1)'; (e.currentTarget as HTMLElement).style.color = GOLD; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = NAVY; }}
      >
        <Menu size={16} strokeWidth={2} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '1.25rem', background: 'hsl(35 25% 82%)' }} />

      {/* Page title */}
      <span style={{ fontFamily: CINZEL, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: NAVY, fontWeight: 600 }}>
        {pageTitle}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User badge */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: CINZEL, fontSize: '0.68rem', color: NAVY, lineHeight: 1.2 }}>{(user as any).name}</p>
            <p style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(220 15% 55%)', lineHeight: 1.2 }}>{(user as any).role}</p>
          </div>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: CINZEL, fontSize: '0.7rem', fontWeight: 700, color: NAVY }}>
              {((user as any).name as string)?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [fdQueue, setFdQueue] = useState<any[]>([]);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && (!user || user.type !== 'staff')) router.replace('/login');
  }, [user, router, hydrated]);

  // Admin socket: join room + notifications + front-desk order alert
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    connectSocket();

    const dept = (user as any)?.department;
    const role = (user as any)?.role;
    const isFrontDesk = dept === 'front_desk' || role === 'super_admin';

    const onConnect = () => { socket.emit('join:admin'); };
    if (socket.connected) socket.emit('join:admin');
    else socket.on('connect', onConnect);

    const onNotification = ({ message }: { message: string }) => {
      toast(message, {
        duration: 6000,
        style: { fontFamily: "'Cinzel', serif", fontSize: '0.75rem', background: 'hsl(38 90% 94%)', color: 'hsl(38 80% 25%)', border: '1px solid hsl(38 80% 70%)', borderRadius: '2px' },
        icon: '⚠️',
      });
    };

    const onServiceNew = (req: any) => {
      if (!isFrontDesk) return;
      playOrderAlert();
      setFdQueue(q => q.some(o => o._id === req._id) ? q : [...q, req]);
    };

    socket.on('notification:general', onNotification);
    socket.on('service:new', onServiceNew);

    return () => {
      socket.off('connect', onConnect);
      socket.off('notification:general', onNotification);
      socket.off('service:new', onServiceNew);
    };
  }, [user]);

  if (!hydrated) return null;
  if (!user || user.type !== 'staff') return null;

  const sidebarW = collapsed ? '4.5rem' : '15rem';
  const fdCurrent  = fdQueue[0] ?? null;
  const fdRemaining = fdQueue.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(38 40% 92%)' }}>
      {(user as any).department === 'food' && <OrderAlertModal user={user} />}

      {/* ── Front-desk service request modal ── */}
      {fdCurrent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,27,62,0.65)', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '440px', border: '2px solid hsl(43 72% 55%)', boxShadow: '0 24px 64px hsl(220 55% 10% / 0.4)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: 'hsl(220 55% 18%)', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Bell size={16} color="hsl(43 72% 55%)" strokeWidth={2} />
                <div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(43 72% 55% / 0.65)', marginBottom: '0.1rem' }}>Front Desk</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(43 72% 55%)' }}>New Service Request</div>
                </div>
              </div>
              {fdRemaining > 0 && (
                <span style={{ background: 'hsl(43 72% 55%)', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel',serif", fontSize: '0.6rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>
                  +{fdRemaining} more
                </span>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px solid hsl(35 25% 88%)' }}>
                <p style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1rem', fontWeight: 700, color: 'hsl(220 55% 18%)', marginBottom: '0.25rem' }}>
                  {SERVICE_LABEL[fdCurrent.type] ?? fdCurrent.type}
                </p>
                <p style={{ fontFamily: "'Cinzel',serif", fontSize: '0.62rem', letterSpacing: '0.12em', color: 'hsl(220 15% 45%)', textTransform: 'uppercase' }}>
                  Room {fdCurrent.room?.roomNumber ?? '—'}{fdCurrent.guest?.name ? ` · ${fdCurrent.guest.name}` : ''}
                </p>
                <p style={{ fontFamily: "'Cinzel',serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'hsl(220 15% 60%)', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                  {new Date(fdCurrent.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {fdCurrent.notes && (
                <div style={{ background: 'hsl(43 72% 55% / 0.08)', border: '1px solid hsl(43 72% 55% / 0.2)', padding: '0.7rem 0.875rem' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '0.95rem', color: 'hsl(220 55% 18%)', fontStyle: 'italic' }}>
                    "{fdCurrent.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid hsl(35 25% 88%)', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setFdQueue(q => q.slice(1))}
                style={{ flex: 1, padding: '0.7rem', border: '1px solid hsl(35 25% 82%)', background: 'transparent', cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(220 15% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <X size={11} /> Dismiss
              </button>
              <button
                onClick={() => { setFdQueue([]); router.push('/admin/guests?live=1'); }}
                style={{ flex: 2, padding: '0.7rem', border: 'none', background: 'hsl(220 55% 18%)', cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(43 72% 55%)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                Go to Live Operations <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar collapsed={collapsed} />
      <div style={{ marginLeft: sidebarW, minHeight: '100vh', transition: 'margin-left 0.25s ease', display: 'flex', flexDirection: 'column' }}>
        <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main style={{ flex: 1, background: 'hsl(38 30% 93%)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
