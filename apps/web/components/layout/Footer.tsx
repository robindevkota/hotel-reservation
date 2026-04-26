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
      <style dangerouslySetInnerHTML={{ __html: `
        .footer-link{font-family:'Raleway',sans-serif;font-size:0.82rem;color:rgba(245,236,215,0.5);transition:color 0.2s;}
        .footer-link:hover{color:hsl(43 72% 55%);}
        .footer-map-frame{width:100%;height:160px;border:1px solid hsl(43 72% 55% / 0.25);filter:grayscale(30%) sepia(20%);display:block;}
        @media(max-width:1024px){
          .footer-grid{grid-template-columns:1fr 1fr!important;gap:2.5rem!important;}
          .footer-map-col{grid-column:1/-1;}
          .footer-map-frame{height:180px;}
        }
        @media(max-width:640px){
          .footer-grid{grid-template-columns:1fr!important;gap:2rem!important;}
          .footer-map-col{grid-column:auto;}
          .footer-wrap{padding:2.5rem 1.25rem 1.5rem!important;}
          .footer-brand-text{max-width:100%!important;}
        }
        @media(max-width:400px){
          .footer-links-grid{grid-template-columns:1fr!important;}
        }
      ` }} />

      <div className="footer-wrap" style={{ maxWidth:'1280px', margin:'0 auto', padding:'4rem 1.5rem 2rem' }}>
        <div className="footer-grid" style={{ display:'grid', gridTemplateColumns:'1.4fr 0.9fr 1.3fr 1.2fr', gap:'2rem', marginBottom:'3rem', alignItems:'start' }}>

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
            <p className="footer-brand-text" style={{ fontFamily:S.raleway, fontSize:'0.82rem', lineHeight:1.8, color:S.muted, maxWidth:'22rem' }}>
              Where the grandeur of ancient pharaohs meets the comfort of modern luxury. Your divine sanctuary.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.25rem' }}>Quick Links</h4>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem 0.75rem' }}>
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
          <div style={{ minWidth:0 }}>
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.25rem' }}>Contact</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <a href="tel:+9779828651525" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.625rem', textDecoration:'none' }}>
                <Phone size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0 }} />
                +977 982 865 1525
              </a>
              <a href="tel:015349522" style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.625rem', textDecoration:'none' }}>
                <Phone size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0 }} />
                015349522
              </a>
              <a href="mailto:royalsuitesboutiquehotel2025@gmail.com" title="royalsuitesboutiquehotel2025@gmail.com" style={{ fontFamily:S.raleway, fontSize:'0.75rem', color:S.muted, display:'flex', alignItems:'center', gap:'0.625rem', textDecoration:'none', minWidth:0, overflow:'hidden' }}>
                <Mail size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0 }} />
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>royalsuitesboutiquehotel2025@gmail.com</span>
              </a>
              <address style={{ fontFamily:S.raleway, fontSize:'0.82rem', color:S.muted, fontStyle:'normal', display:'flex', alignItems:'flex-start', gap:'0.625rem' }}>
                <MapPin size={14} strokeWidth={1.5} color={S.gold} style={{ flexShrink:0, marginTop:'0.15rem' }} />
                Kathmandu 44600, Nepal
              </address>
            </div>
          </div>

          {/* Map */}
          <div className="footer-map-col">
            <h4 style={{ fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', color:S.gold, marginBottom:'1.25rem' }}>Find Us</h4>
            <a
              href="https://www.google.com/maps/dir//Royal+Penguin+Boutique+Hotel,+P886%2B5W4,+Kathmandu+44600/@27.7151744,85.311488,14z"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:'block', position:'relative' }}
            >
              <iframe
                className="footer-map-frame"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.0!2d85.3101103!3d27.712015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb18fc3dc48aa3%3A0xbc881b116d5301d8!2sRoyal%20Penguin%20Boutique%20Hotel!5e0!3m2!1sen!2snp!4v1"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Royal Suites location"
                style={{ pointerEvents:'none' }}
              />
              <div style={{
                position:'absolute', inset:0,
                border:'1px solid hsl(43 72% 55% / 0.25)',
                display:'flex', alignItems:'flex-end', justifyContent:'flex-end',
                padding:'0.5rem',
                pointerEvents:'none',
              }}>
                <span style={{ fontFamily:S.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', background:'hsl(220 55% 18% / 0.85)', color:S.gold, padding:'0.25rem 0.6rem' }}>
                  Open in Maps ↗
                </span>
              </div>
            </a>
          </div>

        </div>

        {/* Divider */}
        <div style={{ width:'100%', height:'1px', background:'linear-gradient(90deg, transparent, hsl(43 72% 55% / 0.4), transparent)', marginBottom:'1.5rem' }} />

        <div style={{ textAlign:'center' }}>
          <p style={{ fontFamily:S.raleway, fontSize:'0.75rem', color:S.faint, marginBottom:'0.5rem' }}>
            © {new Date().getFullYear()} Royal Suites Boutique Hotel &amp; Spa Pvt. Ltd. All rights reserved.
          </p>
          <p style={{ fontFamily:S.cormo, fontSize:'0.82rem', fontStyle:'italic', color:S.muted }}>
            Crafted with care by{' '}
            <span style={{ fontFamily:S.cinzel, fontStyle:'normal', fontSize:'0.75rem', letterSpacing:'0.1em', color:S.gold }}>Robin Devkota</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
