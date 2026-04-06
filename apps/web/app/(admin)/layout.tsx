'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';
import {
  LayoutDashboard, CalendarCheck, BedDouble, UtensilsCrossed,
  Flower2, Users, BookOpen, Receipt, LogOut, Menu, UserCircle,
  Package2, ShieldPlus,
} from 'lucide-react';
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
  { href: '/admin/inventory',    label: 'Inventory',    icon: Package2,        departments: ['food'] },
  { href: '/admin/spa',          label: 'Spa Schedule', icon: Flower2,         departments: ['spa'] },
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
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined} style={{
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
              {!collapsed && <span>{label}</span>}
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

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && (!user || user.type !== 'staff')) router.replace('/login');
  }, [user, router, hydrated]);

  if (!hydrated) return null;
  if (!user || user.type !== 'staff') return null;

  const sidebarW = collapsed ? '4.5rem' : '15rem';

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(38 40% 92%)' }}>
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
