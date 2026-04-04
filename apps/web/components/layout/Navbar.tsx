'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const NAV_LINKS = [
  { href: '/rooms',      label: 'Rooms' },
  { href: '/amenities',  label: 'Amenities' },
  { href: '/contact',    label: 'Contact' },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount());
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-primary/95 backdrop-blur-md border-b border-gold/20 shadow-royal'
          : 'bg-primary/80 backdrop-blur-sm border-b border-gold/10',
      ].join(' ')}
    >
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Royal Suites Logo"
            width={48}
            height={48}
            className="rounded-full object-cover border-2 border-gold"
          />
          <div className="hidden sm:block">
            <p className="font-display text-sm text-primary-foreground tracking-widest">Royal Suites</p>
            <p className="text-xs text-gold-light tracking-wider">Boutique Hotel &amp; Spa</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="font-display text-xs tracking-[0.2em] uppercase text-cream-dark hover:text-gold transition-colors duration-300"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              {user.type === 'guest' && (
                <Link href="/guest/menu" className="relative font-display text-xs tracking-[0.2em] uppercase text-cream-dark hover:text-gold transition-colors">
                  Menu
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-4 bg-gradient-gold text-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href={user.type === 'staff' ? '/admin/dashboard' : '/guest/dashboard'}
                className="font-display text-xs tracking-[0.2em] uppercase text-cream-dark hover:text-gold transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="font-display text-xs tracking-[0.2em] uppercase text-cream-dark/60 hover:text-gold transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-display text-xs tracking-[0.2em] uppercase text-cream-dark hover:text-gold transition-colors"
              >
                Login
              </Link>
              <Link
                href="/reserve"
                className="bg-gradient-gold text-primary font-display text-xs tracking-[0.2em] uppercase px-6 py-2.5 hover:shadow-gold transition-all duration-300 hover:-translate-y-0.5"
              >
                Reserve Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-cream-dark p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`h-px bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-primary border-t border-gold/20 px-6 py-6 space-y-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block font-display text-sm tracking-widest uppercase text-cream-dark hover:text-gold transition-colors py-2 border-b border-gold/10"
            >
              {label}
            </Link>
          ))}
          {!user ? (
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block text-center font-display text-sm tracking-widest uppercase text-cream-dark border border-gold/40 py-3 hover:border-gold transition-colors"
              >
                Login
              </Link>
              <Link
                href="/reserve"
                onClick={() => setMenuOpen(false)}
                className="block text-center bg-gradient-gold text-primary font-display text-sm tracking-widest uppercase py-3"
              >
                Reserve Now
              </Link>
            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-3">
              <Link
                href={user.type === 'staff' ? '/admin/dashboard' : '/guest/dashboard'}
                onClick={() => setMenuOpen(false)}
                className="block font-display text-sm tracking-widest uppercase text-cream-dark hover:text-gold transition-colors py-2"
              >
                Dashboard
              </Link>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="text-left font-display text-sm tracking-widest uppercase text-cream-dark/60 hover:text-gold transition-colors py-2"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
