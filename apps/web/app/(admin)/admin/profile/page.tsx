'use client';
import React, { useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../../store/authStore';
import { KeyRound, User, Shield, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { A, PageHeader } from '../../_adminStyles';

export default function AdminProfilePage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setSuccess(false);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully');
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: `1px solid ${A.border}`, outline: 'none',
    fontFamily: A.raleway, fontSize: '0.88rem', color: A.navy,
    background: '#fff', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: A.cinzel, fontSize: '0.63rem',
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: A.navy, marginBottom: '0.5rem', fontWeight: 600,
  };

  const strength = (() => {
    const p = form.newPassword;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { label: 'Weak',   color: 'hsl(0 60% 52%)',   width: '33%' };
    if (score <= 3) return { label: 'Fair',   color: 'hsl(38 80% 48%)',  width: '60%' };
    return               { label: 'Strong', color: 'hsl(142 50% 40%)', width: '100%' };
  })();

  return (
    <>
      <style>{`.prof-input:focus { border-color: hsl(43 72% 55%) !important; }`}</style>
      <div style={{ padding: '2rem', maxWidth: '900px' }}>
        <PageHeader eyebrow="Account" title="Profile" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem', alignItems: 'start' }}>

          {/* Left — user info card */}
          <div style={{ background: '#fff', border: `1px solid ${A.border}` }}>
            {/* Navy header */}
            <div style={{ background: A.navy, padding: '2rem', textAlign: 'center' }}>
              <div style={{
                width: '5rem', height: '5rem', borderRadius: '50%',
                background: `linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem', border: '3px solid rgba(201,168,76,0.3)',
              }}>
                <span style={{ fontFamily: A.cinzel, fontSize: '2rem', fontWeight: 700, color: A.navy }}>
                  {((user as any)?.name as string)?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <p style={{ fontFamily: A.cinzel, fontSize: '1rem', color: 'rgba(245,236,215,0.9)', marginBottom: '0.25rem' }}>
                {(user as any)?.name}
              </p>
              <p style={{ fontFamily: A.cormo, fontSize: '0.85rem', letterSpacing: '0.15em', color: A.gold, textTransform: 'uppercase' }}>
                {(user as any)?.role}
              </p>
            </div>

            {/* Info rows */}
            <div style={{ padding: '1.25rem' }}>
              {[
                { Icon: User,   label: 'Full Name', value: (user as any)?.name },
                { Icon: Shield, label: 'Role',      value: ((user as any)?.role as string)?.charAt(0).toUpperCase() + ((user as any)?.role as string)?.slice(1) },
                { Icon: KeyRound, label: 'Email',   value: (user as any)?.email },
              ].map(({ Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 0', borderBottom: `1px solid ${A.border}` }}>
                  <div style={{ width: '2rem', height: '2rem', background: A.goldDim ?? 'hsl(43 72% 55% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={A.gold} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.muted, marginBottom: '0.2rem' }}>{label}</p>
                    <p style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy }}>{value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — change password form */}
          <div style={{ background: '#fff', border: `1px solid ${A.border}` }}>
            <div style={{ background: A.navy, padding: '1.25rem 1.5rem', borderBottom: `1px solid hsl(43 72% 55% / 0.15)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <KeyRound size={16} color={A.gold} strokeWidth={1.8} />
                <p style={{ fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.gold }}>
                  Change Password
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.75rem 1.5rem' }}>

              {success && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'hsl(142 60% 96%)', border: '1px solid hsl(142 50% 75%)', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                  <CheckCircle2 size={16} color="hsl(142 50% 40%)" strokeWidth={2} />
                  <span style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: 'hsl(142 50% 30%)' }}>Password updated successfully</span>
                </div>
              )}

              {/* Current password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="prof-input"
                    style={{ ...inputStyle, paddingRight: '2.75rem' }}
                    placeholder="Enter current password"
                    value={form.currentPassword}
                    onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: A.muted, padding: 0 }}>
                    {showCurrent ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="prof-input"
                    style={{ ...inputStyle, paddingRight: '2.75rem' }}
                    placeholder="Min. 8 characters"
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: A.muted, padding: 0 }}>
                    {showNew ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {strength && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ height: '3px', background: A.border, borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <p style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: strength.color, marginTop: '0.3rem' }}>{strength.label}</p>
                </div>
              )}

              {/* Confirm password */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="prof-input"
                    style={{
                      ...inputStyle, paddingRight: '2.75rem',
                      borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword
                        ? 'hsl(0 60% 60%)' : undefined,
                    }}
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: A.muted, padding: 0 }}>
                    {showConfirm ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <p style={{ fontFamily: A.raleway, fontSize: '0.75rem', color: 'hsl(0 60% 48%)', marginTop: '0.35rem' }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || (!!form.confirmPassword && form.newPassword !== form.confirmPassword)}
                style={{
                  width: '100%',
                  background: saving ? A.border : `linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))`,
                  color: A.navy, fontFamily: A.cinzel, fontSize: '0.68rem',
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  padding: '0.875rem', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 700, transition: 'opacity 0.2s',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
