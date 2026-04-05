'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

const ROLES = [
  { value: 'staff',   label: 'Staff' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'waiter',  label: 'Waiter' },
  { value: 'admin',   label: 'Admin' },
];

export default function RegisterPage() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', inviteCode: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setUser({ ...data.user, type: 'staff' }, data.accessToken);
      toast.success('Account created!');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,236,215,0.15)',
    outline: 'none', fontFamily: S.raleway, fontSize: '0.9rem',
    color: 'rgba(245,236,215,0.9)', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: S.cinzel, fontSize: '0.63rem',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: 'rgba(245,236,215,0.55)', marginBottom: '0.5rem',
  };

  return (
    <>
      <style>{`
        .reg-input:focus{border-color:hsl(43 72% 55%)!important;}
        .reg-input::placeholder{color:rgba(245,236,215,0.3);}
        .reg-select{width:100%;padding:0.75rem 1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(245,236,215,0.15);outline:none;font-family:'Raleway',sans-serif;font-size:0.9rem;color:rgba(245,236,215,0.9);box-sizing:border-box;transition:border-color 0.2s;appearance:none;cursor:pointer;}
        .reg-select:focus{border-color:hsl(43 72% 55%);}
        .reg-select option{background:hsl(220 55% 18%);color:rgba(245,236,215,0.9);}
        .reg-btn{width:100%;background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:1rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;}
        .reg-btn:hover:not(:disabled){opacity:0.88;}
        .reg-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .pw-toggle{position:absolute;right:0.875rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(245,236,215,0.4);padding:0;}
        .pw-toggle:hover{color:hsl(43 72% 55%);}
        .reg-hint{font-family:'Raleway',sans-serif;font-size:0.7rem;color:rgba(245,236,215,0.3);margin-top:0.3rem;}
      `}</style>

      <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', overflow: 'hidden' }}>
        {/* BG */}
        <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: 'cover' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18% / 0.85)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, hsl(220 55% 18% / 0.5) 0%, transparent 50%, hsl(220 55% 18% / 0.9) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Link href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem', textDecoration: 'none' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `3px solid ${S.gold}`, overflow: 'hidden', boxShadow: '0 4px 20px hsl(43 72% 55% / 0.35)' }}>
                <Image src="/logo.jpg" alt="Royal Suites" width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <p style={{ fontFamily: S.cinzel, fontSize: '1.05rem', letterSpacing: '0.2em', color: S.goldLight, marginBottom: '0.2rem' }}>Royal Suites</p>
                <p style={{ fontFamily: S.raleway, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Staff Registration</p>
              </div>
            </Link>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(14, 26, 52, 0.78)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,236,215,0.1)', padding: '2.5rem' }}>
            <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '2rem' }} />

            <h2 style={{ fontFamily: S.cinzel, fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.9)', marginBottom: '0.4rem' }}>Create Account</h2>
            <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(245,236,215,0.4)', marginBottom: '2rem' }}>Register to access the staff portal</p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={labelStyle}>Full Name</label>
                <input className="reg-input" style={inputStyle} placeholder="Your full name" required
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={labelStyle}>Email</label>
                <input type="email" className="reg-input" style={inputStyle} placeholder="your@email.com" required
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="reg-input"
                    style={{ ...inputStyle, paddingRight: '3rem' }}
                    placeholder="Min. 8 characters" required
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="reg-hint">Minimum 8 characters</p>
              </div>

              {/* Role */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={labelStyle}>Role</label>
                <div style={{ position: 'relative' }}>
                  <select className="reg-select" value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(245,236,215,0.4)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {/* Invite Code */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={labelStyle}>Invite Code</label>
                <input className="reg-input" style={inputStyle} placeholder="Optional for first registration"
                  value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} />
                <p className="reg-hint">Required for non-first registration</p>
              </div>

              <button type="submit" className="reg-btn" disabled={loading}>
                {loading ? 'Creating account...' : (<><UserPlus size={15} strokeWidth={2} /> Create Account</>)}
              </button>
            </form>

            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,236,215,0.1), transparent)', margin: '1.75rem 0' }} />

            <p style={{ textAlign: 'center', fontFamily: S.raleway, fontSize: '0.78rem', color: 'rgba(245,236,215,0.4)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: S.gold, textDecoration: 'none' }}>Sign In</Link>
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: S.raleway, fontSize: '0.72rem', color: 'rgba(245,236,215,0.25)' }}>
            Guest? Scan the QR code in your room.
          </p>
        </div>
      </div>
    </>
  );
}
