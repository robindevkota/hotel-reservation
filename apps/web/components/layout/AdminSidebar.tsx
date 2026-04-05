'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  UtensilsCrossed,
  Flower2,
  Users,
  BookOpen,
  Receipt,
  LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',     icon: LayoutDashboard,  roles: ['admin', 'staff'] },
  { href: '/admin/reservations', label: 'Reservations',  icon: CalendarCheck,    roles: ['admin', 'staff'] },
  { href: '/admin/rooms',        label: 'Rooms',         icon: BedDouble,        roles: ['admin'] },
  { href: '/admin/orders',       label: 'Kitchen Board', icon: UtensilsCrossed,  roles: ['admin', 'staff', 'kitchen', 'waiter'] },
  { href: '/admin/spa',          label: 'Spa Schedule',  icon: Flower2,          roles: ['admin', 'staff'] },
  { href: '/admin/guests',       label: 'Guests',        icon: Users,            roles: ['admin', 'staff'] },
  { href: '/admin/menu',         label: 'Menu',          icon: BookOpen,         roles: ['admin'] },
  { href: '/admin/billing',      label: 'Billing',       icon: Receipt,          roles: ['admin', 'staff'] },
];

export default function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const role = user?.type === 'staff' ? (user as any).role : '';

  const visibleItems = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={[
        'fixed top-16 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out w-64',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{
        height: 'calc(100vh - 4rem)',
        background: 'linear-gradient(180deg, #0D1B3E 0%, #162544 100%)',
        borderRight: '1px solid rgba(201, 168, 76, 0.1)',
      }}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Admin navigation">
        <ul className="space-y-1 px-3">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: active ? '#C9A84C' : 'rgba(245, 236, 215, 0.6)',
                    backgroundColor: active ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                    borderLeft: active ? '3px solid #C9A84C' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = '#C9A84C';
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(201, 168, 76, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(245, 236, 215, 0.6)';
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(201, 168, 76, 0.15)' }}>
        {user?.type === 'staff' && (
          <div className="mb-3 px-3">
            <p
              className="text-xs truncate"
              style={{ fontFamily: "'Cinzel', serif", color: 'rgba(245, 236, 215, 0.8)' }}
            >
              {(user as any).name}
            </p>
            <p
              className="text-[10px] tracking-wider uppercase mt-0.5"
              style={{ fontFamily: "'Cinzel', serif", color: 'rgba(201, 168, 76, 0.5)' }}
            >
              {(user as any).role}
            </p>
          </div>
        )}
        <button
          onClick={() => { logout(); onClose(); }}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg transition-colors"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(245, 236, 215, 0.3)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#C9A84C';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(201, 168, 76, 0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(245, 236, 215, 0.3)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
