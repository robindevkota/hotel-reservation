import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.jpg"
                alt="Royal Suites"
                width={48}
                height={48}
                className="rounded-full object-cover border-2 border-gold"
              />
              <div>
                <p className="font-display text-sm text-primary-foreground tracking-widest">Royal Suites</p>
                <p className="text-xs text-gold-light tracking-wider">Boutique Hotel &amp; Spa</p>
              </div>
            </div>
            <p className="font-body text-cream-dark/70 text-sm leading-relaxed">
              An Egyptian-inspired sanctuary where ancient luxury meets modern refinement.
              Your pharaoh&apos;s journey begins here.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase text-secondary mb-6">Explore</h4>
            <ul className="space-y-3">
              {[
                { href: '/rooms',     label: 'Our Rooms' },
                { href: '/amenities', label: 'Amenities & Spa' },
                { href: '/reserve',   label: 'Reservations' },
                { href: '/contact',   label: 'Contact Us' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body text-sm text-cream-dark/60 hover:text-gold transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase text-secondary mb-6">Contact</h4>
            <address className="not-italic font-body text-sm text-cream-dark/60 space-y-2">
              <p>1 Royal Suites Boulevard</p>
              <p>Cairo, Egypt 11511</p>
              <p className="mt-4">
                <a href="tel:+201234567890" className="hover:text-gold transition-colors">
                  +20 123 456 7890
                </a>
              </p>
              <p>
                <a href="mailto:reservations@royalsuites.com" className="hover:text-gold transition-colors">
                  reservations@royalsuites.com
                </a>
              </p>
            </address>
          </div>
        </div>

        {/* Gold divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gold to-transparent mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cream-dark/40 font-display tracking-widest">
          <p>© {new Date().getFullYear()} Royal Suites. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-gold transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
