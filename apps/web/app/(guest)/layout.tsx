'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const NAV = [
  { href: '/guest/dashboard', label: 'My Stay',  icon: '𓂀' },
  { href: '/guest/menu',      label: 'Menu',      icon: '𓌀' },
  { href: '/guest/spa',       label: 'Spa',       icon: '𓆉' },
  { href: '/guest/orders',    label: 'Orders',    icon: '𓏤' },
  { href: '/guest/billing',   label: 'My Bill',   icon: '𓎛' },
];

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <div className="min-h-screen bg-[#F5ECD7] flex flex-col">
      {/* Header */}
      <header className="bg-[#0D1B3E] sticky top-0 z-40 shadow-lg">
        <div className="container flex items-center justify-between h-16">
          <div>
            <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-base leading-tight">ROYAL SUITES</p>
            {user?.type === 'guest' && (
              <p className="font-[Cinzel] text-[#F5ECD7]/40 text-[10px] tracking-widest uppercase">
                {(user as any).roomName}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="font-[Cinzel] text-[#F5ECD7]/40 hover:text-[#C9A84C] text-[10px] tracking-widest uppercase transition-colors"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation (mobile-first) */}
      <nav className="sticky bottom-0 bg-[#0D1B3E] border-t border-[#C9A84C]/20 z-40" aria-label="Guest navigation">
        <div className="flex">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            const isMenu = href === '/guest/menu';
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative',
                  'transition-colors duration-200',
                  active ? 'text-[#C9A84C]' : 'text-[#F5ECD7]/50 hover:text-[#C9A84C]',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg">{icon}</span>
                <span className="font-[Cinzel] text-[9px] tracking-widest uppercase">{label}</span>
                {isMenu && itemCount > 0 && (
                  <span className="absolute top-1 right-4 bg-[#C9A84C] text-[#0D1B3E] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {itemCount}
                  </span>
                )}
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#C9A84C]" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
