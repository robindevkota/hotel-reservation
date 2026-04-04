'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount());
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-40 transition-all duration-500',
        scrolled ? 'bg-[#0D1B3E]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(13,27,62,0.3)]' : 'bg-transparent',
      ].join(' ')}
    >
      <div className="container flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-lg tracking-widest">ROYAL</span>
          <span className="font-[Cinzel] text-[#F5ECD7] text-xs tracking-[0.5em] uppercase">Suites</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {[
            { href: '/rooms', label: 'Rooms' },
            { href: '/amenities', label: 'Amenities' },
            { href: '/contact', label: 'Contact' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-[Cinzel] text-xs tracking-widest uppercase text-[#F5ECD7]/80 hover:text-[#C9A84C] transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              {user.type === 'guest' && (
                <Link href="/guest/menu" className="relative">
                  <span className="font-[Cinzel] text-xs text-[#F5ECD7]/80 hover:text-[#C9A84C] transition-colors uppercase tracking-widest">
                    Menu
                  </span>
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-4 bg-[#C9A84C] text-[#0D1B3E] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href={user.type === 'staff' ? '/admin/dashboard' : '/guest/dashboard'}
                className="font-[Cinzel] text-xs text-[#F5ECD7]/80 hover:text-[#C9A84C] transition-colors uppercase tracking-widest"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="font-[Cinzel] text-xs text-[#F5ECD7]/60 hover:text-[#C9A84C] transition-colors uppercase tracking-widest"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/reserve">
                <Button variant="primary" size="sm">Reserve Now</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-[#F5ECD7] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0D1B3E] border-t border-[#C9A84C]/20 px-6 py-6 flex flex-col gap-4">
          {[
            { href: '/rooms', label: 'Rooms' },
            { href: '/amenities', label: 'Amenities' },
            { href: '/contact', label: 'Contact' },
            { href: '/reserve', label: 'Reserve Now' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="font-[Cinzel] text-sm tracking-widest uppercase text-[#F5ECD7]/80 hover:text-[#C9A84C] transition-colors py-2 border-b border-[#C9A84C]/10"
            >
              {label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="secondary" size="sm" className="w-full mt-2">Login</Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
