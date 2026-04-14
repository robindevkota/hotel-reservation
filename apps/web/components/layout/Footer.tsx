import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';

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
      <style dangerouslySetInnerHTML={{ __html: `.footer-link{font-family:'Raleway',sans-serif;font-size:0.82rem;color:rgba(245,236,215,0.5);transition:color 0.2s;}.footer-link:hover{color:hsl(43 72% 55%);}@media(max-width:768px){.footer-grid{grid-template-columns:1fr!important;gap:2.5rem!important;}}` }} />
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'4rem 1.5rem 2rem' }}>
        <div className="footer-grid" style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.2fr', gap:'3.5rem', marginBottom:'3rem', alignItems:'start' }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.875rem', marginBottom:'1.25rem' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'50%', overflow:'hidden', border:`2px solid ${S.gold}`, flexShrink:0 }}>
                <Image src="/logo.jpg" alt="Royal Suites" width={48} height={48} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
              <div>
                <p style={{ fontFamily:S.cinzel, fontSize:'0.85rem', letterSpacing:'0.15em', color:S.cream, marginBottom:'0.15rem' }}>Royal Suites</p>
                <p style={{ fontFamily:S.raleway, fontSize:'0.65rem', letterSpacing:'0.1em', color:S.gold }}>Boutique Hotel &amp; Spa Pvt. Ltd.</p>
              </div>
            </div>
            <p style={{ fontFamily:S.raleway, fontSize:'0.82rem', lineHeight:1.8, color:S.muted, maxWidth:'22rem' }}>
              Where the grandeur of ancient pharaohs meets the comfort of modern luxury. Your divine sanctuary.
            </p>
          </div>

          {/* Quick Links — two-column grid */}
          <div>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.25rem' }}>Quick Links</h4>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem 1rem' }}>
              {[
                { href:'/', label:'Home' },
                { href:'/rooms', label:'Rooms' },
                { href:'/amenities', label:'Amenities' },
                { href:'/reserve', label:'Reserve' },
                { href:'/manage-booking', label:'Manage Booking' },
                { href:'/contact', label:'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="footer-link">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.25rem' }}>Contact</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <a href="tel:+12345678890" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.625rem', textDecoration:'none' }}>
                <Phone size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0 }} />
                +1 234 567 890
              </a>
              <a href="mailto:info@royalsuites.com" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.625rem', textDecoration:'none' }}>
                <Mail size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0 }} />
                info@royalsuites.com
              </a>
              <address style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, fontStyle:'normal', display:'flex', alignItems:'flex-start', gap:'0.625rem' }}>
                <MapPin size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0, marginTop:'0.15rem' }} />
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
