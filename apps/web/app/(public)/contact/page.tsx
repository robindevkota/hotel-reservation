'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, KeyRound, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

const INFO = [
  { Icon: MapPin,   label: 'Address',             value: 'Kathmandu 44600, Nepal' },
  { Icon: Phone,    label: 'Mobile',              value: '+977 982 865 1525' },
  { Icon: Phone,    label: 'Telephone',           value: '015349522' },
  { Icon: Mail,     label: 'Email',               value: 'royalsuitesboutiquehotel2025@gmail.com' },
  { Icon: Clock,    label: 'Check-In / Check-Out', value: '3:00 PM / 12:00 PM' },
  { Icon: KeyRound, label: 'Front Desk',           value: '24 Hours' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', form);
      toast.success('Your message has been received. We will respond within 24 hours.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      const firstError = err?.response?.data?.errors?.[0]?.msg;
      toast.error(firstError || 'Failed to send message. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: `1px solid ${S.border}`, outline: 'none',
    fontFamily: S.raleway, fontSize: '0.88rem', color: S.navy,
    background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: S.cinzel, fontSize: '0.63rem',
    letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.5rem',
  };

  return (
    <>
      <style>{`
        .cnt-input:focus{border-color:hsl(43 72% 55%)!important;}
        .cnt-input::placeholder{color:hsl(220 15% 72%);}
        .cnt-btn{display:inline-flex;align-items:center;gap:0.5rem;background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2.5rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;}
        .cnt-btn:hover:not(:disabled){opacity:0.88;}
        .cnt-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .info-card{display:flex;align-items:flex-start;gap:1rem;padding:1.25rem 1.5rem;background:#fff;border:1px solid hsl(35 25% 82%);transition:border-color 0.3s,box-shadow 0.3s;}
        .info-card:hover{border-color:hsl(43 72% 55%/0.4);box-shadow:0 4px 16px -4px hsl(43 72% 55%/0.15);}
      `}</style>

      <div style={{ minHeight: '100vh', background: S.cream }}>

        {/* Header */}
        <div style={{ position: 'relative', background: S.navy, padding: '10rem 1.5rem 5rem', textAlign: 'center', overflow: 'hidden' }}>
          <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Reach Us</p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Contact Royal Suites</h1>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto' }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div className="cnt-grid">

            {/* ── Left: Info ── */}
            <div>
              <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Location</p>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: S.navy, marginBottom: '1rem' }}>Visit Us</h2>
              <div style={{ width: '4rem', height: '1px', background: S.divider, marginBottom: '2rem' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {INFO.map(({ Icon, label, value }) => (
                  <div key={label} className="info-card">
                    <div style={{ color: S.gold, flexShrink: 0, marginTop: '0.1rem' }}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ fontFamily: S.cinzel, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, marginBottom: '0.25rem' }}>{label}</p>
                      <p style={{ fontFamily: S.raleway, fontSize: '0.88rem', color: S.muted, lineHeight: 1.5 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map */}
              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontFamily: S.cinzel, fontSize: '0.63rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.75rem' }}>Find Us</p>
                <a
                  href="https://www.google.com/maps/dir//Royal+Penguin+Boutique+Hotel,+P886%2B5W4,+Kathmandu+44600/@27.7151744,85.311488,14z"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', position: 'relative' }}
                >
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.0!2d85.3101103!3d27.712015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb18fc3dc48aa3%3A0xbc881b116d5301d8!2sRoyal%20Penguin%20Boutique%20Hotel!5e0!3m2!1sen!2snp!4v1"
                    width="100%" height="200"
                    style={{ display: 'block', border: '1px solid hsl(43 72% 55% / 0.25)', filter: 'grayscale(30%) sepia(20%)', pointerEvents: 'none' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Royal Suites location"
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '1px solid hsl(43 72% 55% / 0.25)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                    padding: '0.5rem', pointerEvents: 'none',
                  }}>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'hsl(220 55% 18% / 0.85)', color: S.gold, padding: '0.25rem 0.6rem' }}>
                      Open in Maps ↗
                    </span>
                  </div>
                </a>
              </div>

              {/* Decorative quote */}
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: S.navy, border: `1px solid hsl(43 72% 55% / 0.2)` }}>
                <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(245,236,215,0.7)', lineHeight: 1.7 }}>
                  "Where ancient grandeur meets modern luxury — your sanctuary awaits."
                </p>
                <p style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', color: S.gold, marginTop: '0.75rem' }}>— ROYAL SUITES</p>
              </div>
            </div>

            {/* ── Right: Form ── */}
            <div>
              <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Enquiries</p>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: S.navy, marginBottom: '1rem' }}>Send a Message</h2>
              <div style={{ width: '4rem', height: '1px', background: S.divider, marginBottom: '2rem' }} />

              <form onSubmit={handleSubmit}>
                <div className="cnt-name-row">
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input className="cnt-input" style={inputStyle} placeholder="Your name" required
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" className="cnt-input" style={inputStyle} placeholder="your@email.com" required
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Subject</label>
                  <input className="cnt-input" style={inputStyle} placeholder="How can we help?" required
                    value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={labelStyle}>Message</label>
                  <textarea className="cnt-input" style={{ ...inputStyle, resize: 'none' }} rows={6}
                    placeholder="Tell us about your enquiry, special requests, or anything we can help with..."
                    required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>

                <button type="submit" className="cnt-btn" disabled={loading}>
                  {loading ? 'Sending...' : (<><Send size={14} strokeWidth={2} /> Send Message</>)}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
