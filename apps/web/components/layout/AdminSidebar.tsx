'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',     icon: '𓂀', roles: ['admin', 'staff'] },
  { href: '/admin/reservations', label: 'Reservations',  icon: '𓏤', roles: ['admin', 'staff'] },
  { href: '/admin/rooms',        label: 'Rooms',         icon: '𓉐', roles: ['admin'] },
  { href: '/admin/orders',       label: 'Kitchen Board', icon: '𓌀', roles: ['admin', 'staff', 'kitchen', 'waiter'] },
  { href: '/admin/spa',          label: 'Spa Schedule',  icon: '𓆉', roles: ['admin', 'staff'] },
  { href: '/admin/guests',       label: 'Guests',        icon: '𓀀', roles: ['admin', 'staff'] },
  { href: '/admin/menu',         label: 'Menu',          icon: '𓌈', roles: ['admin'] },
  { href: '/admin/billing',      label: 'Billing',       icon: '𓎡', roles: ['admin', 'staff'] },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.type === 'staff' ? (user as any).role : '';

  const visibleItems = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={[
        'h-screen sticky top-0 bg-primary flex flex-col transition-all duration-300 border-r border-gold/10',
        collapsed ? 'w-16' : 'w-64',
      ].join(' ')}
    >
      {/* Logo / Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gold/20 h-20">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Royal Suites"
              width={36}
              height={36}
              className="rounded-full object-cover border border-gold"
            />
            <div>
              <p className="font-display text-primary-foreground text-xs tracking-widest">Royal Suites</p>
              <p className="font-body text-gold-light text-[10px] tracking-wider">Admin Panel</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-cream-dark/60 hover:text-gold transition-colors ml-auto flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Admin navigation">
        <ul className="space-y-1 px-2">
          {visibleItems.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 transition-all duration-200',
                    'font-display text-xs tracking-wider uppercase',
                    active
                      ? 'bg-gold/15 text-gold border-l-2 border-gold'
                      : 'text-cream-dark/60 hover:text-gold hover:bg-gold/5',
                  ].join(' ')}
                >
                  <span className="text-lg flex-shrink-0" aria-hidden="true">{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-gold/20">
        {!collapsed && user?.type === 'staff' && (
          <div className="mb-3">
            <p className="font-display text-primary-foreground text-xs truncate">{(user as any).name}</p>
            <p className="font-body text-gold text-[10px] tracking-wider uppercase">{(user as any).role}</p>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-2 text-cream-dark/40 hover:text-gold transition-colors font-display text-[10px] tracking-widest uppercase"
        >
          <span>⎋</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
