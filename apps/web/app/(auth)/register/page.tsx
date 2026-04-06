'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)',
  cream: 'rgba(245,236,215,0.9)', creamDim: 'rgba(245,236,215,0.4)', creamFaint: 'rgba(245,236,215,0.15)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

const DEPARTMENTS = [
  { value: 'spa',        label: 'Spa' },
  { value: 'food',       label: 'Food & Bar' },
  { value: 'front_desk', label: 'Front Desk' },
];

const DEPT_LABEL: Record<string, string> = { spa: 'Spa', food: 'Food & Bar', front_desk: 'Front Desk' };

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function RegisterPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'front_desk' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (user && (user as any).role !== 'super_admin') {
      router.replace('/admin/dashboard');
    } else if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const { data } = await api.get('/auth/admins');
      setAdmins(data.admins);
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setAdminsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user as any).role === 'super_admin') fetchAdmins();
  }, [user, fetchAdmins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success(`Admin created for ${DEPARTMENTS.find(d => d.value === form.department)?.label}`);
      setForm({ name: '', email: '', password: '', department: 'front_desk' });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (admin: AdminUser) => {
    setToggling(admin._id);
    try {
      const { data } = await api.patch(`/auth/admins/${admin._id}/toggle`);
      setAdmins(prev => prev.map(a => a._id === admin._id ? { ...a, isActive: data.user.isActive } : a));
      toast.success(`${admin.name} ${data.user.isActive ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update admin');
    } finally {
      setToggling(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,236,215,0.15)',
    outline: 'none', fontFamily: S.raleway, fontSize: '0.9rem',
    color: S.cream, boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: S.cinzel, fontSize: '0.63rem',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: S.creamDim, marginBottom: '0.5rem',
  };

  if (!user || (user as any).role !== 'super_admin') return null;

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
        .trow:hover td{background:rgba(255,255,255,0.04);}
        .trow td{transition:background 0.15s;}
        .toggle-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.75rem;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;transition:opacity 0.2s;}
        .toggle-btn:disabled{opacity:0.4;cursor:not-allowed;}
      `}</style>

      <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1.5rem', overflow: 'hidden' }}>
        <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: 'cover' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18% / 0.88)' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '60rem' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link href="/admin/dashboard" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: `2px solid ${S.gold}`, overflow: 'hidden' }}>
                <Image src="/logo.jpg" alt="Royal Suites" width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <p style={{ fontFamily: S.cinzel, fontSize: '0.95rem', letterSpacing: '0.2em', color: S.goldLight }}>Royal Suites</p>
                <p style={{ fontFamily: S.raleway, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold }}>Admin Management</p>
              </div>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* Left — Create form */}
            <div style={{ background: 'rgba(14,26,52,0.82)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,236,215,0.1)', padding: '2rem' }}>
              <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '1.75rem' }} />
              <h2 style={{ fontFamily: S.cinzel, fontSize: '0.9rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.cream, marginBottom: '0.3rem' }}>New Admin</h2>
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '0.9rem', color: S.creamDim, marginBottom: '1.75rem' }}>Create a department admin account</p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Full Name</label>
                  <input className="reg-input" style={inputStyle} placeholder="Admin full name" required
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" className="reg-input" style={inputStyle} placeholder="admin@royalsuites.com" required
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} className="reg-input"
                      style={{ ...inputStyle, paddingRight: '3rem' }}
                      placeholder="Min. 8 characters" required
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={labelStyle}>Department</label>
                  <div style={{ position: 'relative' }}>
                    <select className="reg-select" value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}>
                      {DEPARTMENTS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: S.creamDim }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <p className="reg-hint">This admin will only see their department's data</p>
                </div>

                <button type="submit" className="reg-btn" disabled={loading}>
                  {loading ? 'Creating...' : <><UserPlus size={15} strokeWidth={2} /> Create Admin</>}
                </button>
              </form>

              <div style={{ width: '100%', height: '1px', background: 'rgba(245,236,215,0.08)', margin: '1.5rem 0' }} />
              <p style={{ textAlign: 'center', fontFamily: S.raleway, fontSize: '0.78rem', color: S.creamDim }}>
                <Link href="/admin/dashboard" style={{ color: S.gold, textDecoration: 'none' }}>← Back to Dashboard</Link>
              </p>
            </div>

            {/* Right — Admins table */}
            <div style={{ background: 'rgba(14,26,52,0.82)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,236,215,0.1)' }}>
              {/* Table header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(245,236,215,0.08)' }}>
                <div>
                  <p style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: S.gold, margin: 0 }}>Existing Admins</p>
                  <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.creamDim, marginTop: '0.2rem' }}>{admins.length} department admin{admins.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={fetchAdmins} disabled={adminsLoading} style={{ background: 'none', border: `1px solid rgba(245,236,215,0.15)`, padding: '0.4rem 0.6rem', cursor: 'pointer', color: S.creamDim, display: 'flex', alignItems: 'center', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = S.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(245,236,215,0.15)')}>
                  <RefreshCw size={13} strokeWidth={1.8} style={{ animation: adminsLoading ? 'spin 0.7s linear infinite' : 'none' }} />
                </button>
              </div>

              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Name', 'Department', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.65rem 1rem', fontFamily: S.cinzel, fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: S.gold, fontWeight: 600, borderBottom: '1px solid rgba(245,236,215,0.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adminsLoading ? (
                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ width: '1.5rem', height: '1.5rem', border: `2px solid ${S.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                    </td></tr>
                  ) : admins.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.1em', color: S.creamDim }}>
                      No admins yet
                    </td></tr>
                  ) : admins.map(admin => (
                    <tr key={admin._id} className="trow">
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(245,236,215,0.06)' }}>
                        <p style={{ fontFamily: S.cinzel, fontSize: '0.72rem', color: S.cream, marginBottom: '0.15rem' }}>{admin.name}</p>
                        <p style={{ fontFamily: S.raleway, fontSize: '0.68rem', color: S.creamDim }}>{admin.email}</p>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(245,236,215,0.06)' }}>
                        <span style={{ fontFamily: S.cinzel, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: S.gold, background: 'rgba(201,168,76,0.12)', padding: '0.25rem 0.6rem' }}>
                          {DEPT_LABEL[admin.department ?? ''] ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(245,236,215,0.06)' }}>
                        <span style={{
                          fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '0.25rem 0.6rem',
                          background: admin.isActive ? 'hsl(142 50% 40% / 0.2)' : 'hsl(0 60% 50% / 0.15)',
                          color: admin.isActive ? 'hsl(142 50% 65%)' : 'hsl(0 60% 65%)',
                        }}>
                          {admin.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(245,236,215,0.06)' }}>
                        <button
                          className="toggle-btn"
                          disabled={toggling === admin._id}
                          onClick={() => handleToggle(admin)}
                          style={{ color: admin.isActive ? 'hsl(0 60% 65%)' : 'hsl(142 50% 65%)' }}
                        >
                          {toggling === admin._id
                            ? <RefreshCw size={14} strokeWidth={1.8} style={{ animation: 'spin 0.7s linear infinite' }} />
                            : admin.isActive
                              ? <><ToggleRight size={16} strokeWidth={1.8} /> Disable</>
                              : <><ToggleLeft size={16} strokeWidth={1.8} /> Enable</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
