import React from 'react';
import Link from 'next/link';
import GoldDivider from '../ui/GoldDivider';

export default function Footer() {
  return (
    <footer className="bg-[#0D1B3E] text-[#F5ECD7]">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-[Cinzel_Decorative] text-[#C9A84C] text-xl mb-2">ROYAL SUITES</h3>
            <p className="font-[Cinzel] text-xs tracking-widest text-[#F5ECD7]/60 uppercase mb-4">
              Boutique Hotel & Spa
            </p>
            <p className="text-[#F5ECD7]/70 text-sm leading-relaxed">
              An Egyptian-inspired sanctuary where ancient luxury meets modern refinement.
              Your pharaoh's journey begins here.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-[Cinzel] text-xs tracking-widest uppercase text-[#C9A84C] mb-4">Explore</h4>
            <ul className="space-y-2">
              {[
                { href: '/rooms', label: 'Our Rooms' },
                { href: '/amenities', label: 'Amenities & Spa' },
                { href: '/reserve', label: 'Reservations' },
                { href: '/contact', label: 'Contact Us' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[#F5ECD7]/60 hover:text-[#C9A84C] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-[Cinzel] text-xs tracking-widest uppercase text-[#C9A84C] mb-4">Contact</h4>
            <address className="not-italic text-sm text-[#F5ECD7]/60 space-y-2">
              <p>1 Royal Suites Boulevard</p>
              <p>Cairo, Egypt 11511</p>
              <p className="mt-4">
                <a href="tel:+201234567890" className="hover:text-[#C9A84C] transition-colors">
                  +20 123 456 7890
                </a>
              </p>
              <p>
                <a href="mailto:reservations@royalsuites.com" className="hover:text-[#C9A84C] transition-colors">
                  reservations@royalsuites.com
                </a>
              </p>
            </address>
          </div>
        </div>

        <GoldDivider ornament="𓂀" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#F5ECD7]/40 font-[Cinzel]">
          <p>© {new Date().getFullYear()} Royal Suites. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#C9A84C] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#C9A84C] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
