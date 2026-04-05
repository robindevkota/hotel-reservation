'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,236,215,0.15)',
    outline: 'none', fontFamily: S.raleway, fontSize: '0.9rem',
    color: 'rgba(245,236,215,0.9)', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <>
      <style>{`
        .login-input:focus{border-color:hsl(43 72% 55%)!important;}
        .login-input::placeholder{color:rgba(245,236,215,0.3);}
        .login-btn{width:100%;background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:1rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;}
        .login-btn:hover:not(:disabled){opacity:0.88;}
        .login-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .pw-toggle{position:absolute;right:0.875rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(245,236,215,0.4);padding:0;}
        .pw-toggle:hover{color:hsl(43 72% 55%);}
      `}</style>

      <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', overflow: 'hidden' }}>
        {/* BG */}
        <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: 'cover' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18% / 0.82)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, hsl(220 55% 18% / 0.6) 0%, transparent 50%, hsl(220 55% 18% / 0.9) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '26rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Link href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem', textDecoration: 'none' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${S.gold}`, overflow: 'hidden', boxShadow: '0 4px 20px hsl(43 72% 55% / 0.35)' }}>
                <Image src="/logo.jpg" alt="Royal Suites" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <p style={{ fontFamily: S.cinzel, fontSize: '1.1rem', letterSpacing: '0.2em', color: S.goldLight, marginBottom: '0.2rem' }}>Royal Suites</p>
                <p style={{ fontFamily: S.raleway, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Staff Portal</p>
              </div>
            </Link>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(14, 26, 52, 0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,236,215,0.1)', padding: '2.5rem' }}>
            <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '2rem' }} />

            <h2 style={{ fontFamily: S.cinzel, fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.9)', marginBottom: '0.4rem' }}>Sign In</h2>
            <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(245,236,215,0.45)', marginBottom: '2rem' }}>Enter your credentials to access the staff portal</p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontFamily: S.cinzel, fontSize: '0.63rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.55)', marginBottom: '0.5rem' }}>Email</label>
                <input type="email" className="login-input" style={inputStyle}
                  placeholder="your@email.com" autoComplete="email"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: 'hsl(0 70% 65%)', marginTop: '0.3rem' }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontFamily: S.cinzel, fontSize: '0.63rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.55)', marginBottom: '0.5rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="login-input" style={{ ...inputStyle, paddingRight: '3rem' }}
                    placeholder="••••••••" autoComplete="current-password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: 'hsl(0 70% 65%)', marginTop: '0.3rem' }}>{errors.password}</p>}
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Signing in...' : (<><LogIn size={15} strokeWidth={2} /> Enter the Palace</>)}
              </button>
            </form>

            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,236,215,0.1), transparent)', margin: '1.75rem 0' }} />

            <p style={{ textAlign: 'center', fontFamily: S.raleway, fontSize: '0.78rem', color: 'rgba(245,236,215,0.4)' }}>
              New staff member?{' '}
              <Link href="/register" style={{ color: S.gold, textDecoration: 'none', transition: 'color 0.2s' }}>Register here</Link>
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
