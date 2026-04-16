'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const NAV_LINKS = [
  { href: '/',                label: 'Home' },
  { href: '/rooms',           label: 'Rooms' },
  { href: '/amenities',       label: 'Amenities' },
  { href: '/reserve',         label: 'Reserve' },
  { href: '/manage-booking',  label: 'Manage Booking' },
  { href: '/contact',         label: 'Contact' },
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
        background: 'hsl(220 55% 18%)',
        backdropFilter: 'none',
        borderBottom: '1px solid hsl(43 72% 55% / 0.2)',
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
          className="lg:hidden p-2"
          style={{ color: 'hsl(35 25% 88%)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <div style={{ width: '1.5rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ display: 'block', height: '1px', background: 'hsl(35 25% 88%)', transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
            <span style={{ display: 'block', height: '1px', background: 'hsl(35 25% 88%)', transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', height: '1px', background: 'hsl(35 25% 88%)', transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: 'hsl(220 55% 14%)', borderTop: '1px solid hsl(43 72% 55% / 0.2)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'hsl(35 25% 88%)',
                padding: '0.75rem 0',
                borderBottom: '1px solid hsl(43 72% 55% / 0.12)',
              }}
            >
              {label}
            </Link>
          ))}
          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem' }}>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'hsl(35 25% 88%)',
                  border: '1px solid hsl(43 72% 55% / 0.4)',
                  padding: '0.75rem',
                }}
              >
                Login
              </Link>
              <Link
                href="/reserve"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
                  color: 'hsl(220 55% 18%)',
                  padding: '0.75rem',
                }}
              >
                Reserve Now
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingTop: '0.5rem' }}>
              <Link
                href={user.type === 'staff' ? '/admin/dashboard' : '/guest/dashboard'}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'hsl(35 25% 88%)',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid hsl(43 72% 55% / 0.12)',
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                style={{
                  textAlign: 'left',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'hsl(35 25% 88% / 0.5)',
                  padding: '0.75rem 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
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
