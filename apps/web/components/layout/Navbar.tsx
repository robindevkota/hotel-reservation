'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const NAV_LINKS = [
  { href: '/',           label: 'Home' },
  { href: '/rooms',      label: 'Rooms' },
  { href: '/amenities',  label: 'Amenities' },
  { href: '/reserve',    label: 'Reserve' },
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
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        transition: 'all 0.5s ease',
        background: scrolled ? 'hsl(220 55% 18% / 0.97)' : 'hsl(220 55% 18% / 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid hsl(43 72% 55% / 0.25)' : '1px solid hsl(43 72% 55% / 0.12)',
        boxShadow: scrolled ? '0 4px 24px -4px hsl(220 55% 8% / 0.4)' : 'none',
      }}
    >
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: 'hsl(43 72% 55%)' }}>
            <Image
              src="/logo.jpg"
              alt="Royal Suites Logo"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'hsl(43 65% 72%)', letterSpacing: '0.15em' }}>Royal Suites</p>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.65rem', color: 'hsl(43 72% 55%)', letterSpacing: '0.1em' }}>Boutique Hotel &amp; Spa</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245, 236, 215, 0.9)',
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(43 72% 55%)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245, 236, 215, 0.9)')}
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
                <Link href="/guest/menu" className="relative" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245, 236, 215, 0.9)' }}>
                  Menu
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-4 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full" style={{ background: 'hsl(43 72% 55%)', color: 'hsl(220 55% 18%)' }}>
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href={user.type === 'staff' ? '/admin/dashboard' : '/guest/dashboard'}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245, 236, 215, 0.9)' }}
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245, 236, 215, 0.5)' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245, 236, 215, 0.9)' }}
              >
                Login
              </Link>
              <a
                href="tel:+12345678890"
                style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', color: 'rgba(245, 236, 215, 0.7)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Phone size={13} strokeWidth={1.5} />
                +1 234 567 890
              </a>
              <Link
                href="/reserve"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
                  color: 'hsl(220 55% 18%)',
                  padding: '0.6rem 1.5rem',
                  display: 'inline-block',
                  transition: 'all 0.3s ease',
                }}
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
        <div className="lg:hidden px-6 py-6 space-y-4" style={{ background: 'hsl(220 55% 14%)', borderTop: '1px solid hsl(43 72% 55% / 0.2)' }}>
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
