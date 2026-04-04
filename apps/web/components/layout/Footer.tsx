import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const S = {
  gold:    'hsl(43 72% 55%)',
  navy:    'hsl(220 55% 18%)',
  cream:   'rgba(245,236,215,0.85)',
  muted:   'rgba(245,236,215,0.5)',
  faint:   'rgba(245,236,215,0.3)',
  cinzel:  "'Cinzel', serif",
  cormo:   "'Cormorant Garamond', serif",
  raleway: "'Raleway', sans-serif",
};

export default function Footer() {
  return (
    <footer style={{ background: S.navy, color: S.cream }}>
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'4rem 1.5rem 2rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:'3rem', marginBottom:'3rem' }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.875rem', marginBottom:'1.25rem' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'50%', overflow:'hidden', border:`2px solid ${S.gold}`, flexShrink:0 }}>
                <Image src="/logo.jpg" alt="Royal Suites" width={52} height={52} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
              <div>
                <p style={{ fontFamily:S.cinzel, fontSize:'0.85rem', letterSpacing:'0.15em', color:S.cream, marginBottom:'0.15rem' }}>Royal Suites</p>
                <p style={{ fontFamily:S.raleway, fontSize:'0.65rem', letterSpacing:'0.1em', color:S.gold }}>Boutique Hotel &amp; Spa Pvt. Ltd.</p>
              </div>
            </div>
            <p style={{ fontFamily:S.raleway, fontSize:'0.82rem', lineHeight:1.8, color:S.muted }}>
              Where the grandeur of ancient pharaohs meets the comfort of modern luxury. Your divine sanctuary.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.7rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.5rem' }}>Quick Links</h4>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {[
                { href:'/', label:'Home' },
                { href:'/rooms', label:'Rooms' },
                { href:'/amenities', label:'Amenities' },
                { href:'/reserve', label:'Reserve' },
                { href:'/contact', label:'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, transition:'color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = S.gold)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.7rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.5rem' }}>Contact</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <a href="tel:+12345678890" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.gold} strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                +1 234 567 890
              </a>
              <a href="mailto:info@royalsuites.com" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.gold} strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                info@royalsuites.com
              </a>
              <address style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, fontStyle:'normal', display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.gold} strokeWidth="2" style={{ flexShrink:0, marginTop:'0.1rem' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                123 Pharaoh&apos;s Boulevard, Royal District
              </address>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width:'100%', height:'1px', background:'linear-gradient(90deg, transparent, hsl(43 72% 55% / 0.4), transparent)', marginBottom:'1.5rem' }} />

        <p style={{ textAlign:'center', fontFamily:S.raleway, fontSize:'0.75rem', color:S.faint }}>
          © {new Date().getFullYear()} Royal Suites Boutique Hotel &amp; Spa Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
