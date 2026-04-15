'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

interface SessionData {
  token: string;
  guestId: string;
  roomId: string;
  roomName: string;
  roomNumber: string;
  roomType: string;
  floorNumber: number;
  guestName: string;
}

const TYPE_LABEL: Record<string, string> = {
  royal: 'Royal Chamber',
  suite: 'Luxury Suite',
  deluxe: 'Deluxe Room',
  standard: 'Standard Room',
};

export default function QRLandingPage() {
  const { roomToken } = useParams() as { roomToken: string };
  const { loginAsGuest } = useAuthStore();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'confirm' | 'entering' | 'error'>('loading');
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    if (!roomToken) return;
    api.get(`/qr/verify/${roomToken}`)
      .then(({ data }) => { setSession(data); setStatus('confirm'); })
      .catch((err) => { setError(err.response?.data?.message || 'Invalid or expired QR code'); setStatus('error'); });
  }, [roomToken]);

  const handleConfirm = () => {
    if (!session) return;
    setStatus('entering');
    loginAsGuest(session.token, session.guestId, session.roomId, session.roomName, session.roomNumber, session.guestName);
    setTimeout(() => router.replace('/guest/dashboard'), 1200);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 55% 12%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 20%, hsl(43 72% 55% / 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, hsl(43 72% 55% / 0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '22rem', position: 'relative', zIndex: 1 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(43 72% 55%)', fontSize: '1.4rem', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>ROYAL SUITES</p>
          <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.4)', fontSize: '0.6rem', letterSpacing: '0.45em', textTransform: 'uppercase' }}>Guest Portal</p>
        </div>

        {/* Ornamental divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, hsl(43 72% 55% / 0.4))' }} />
          <span style={{ color: 'hsl(43 72% 55%)', fontSize: '1rem' }}>𓂀</span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, hsl(43 72% 55% / 0.4))' }} />
        </div>

        {/* LOADING */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '3rem', height: '3rem', border: '2px solid hsl(43 72% 55%)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
            <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.5)', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Verifying session...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* CONFIRM */}
        {status === 'confirm' && session && (
          <div>
            {/* Room card */}
            <div style={{ border: '1px solid hsl(43 72% 55% / 0.25)', background: 'hsl(220 55% 16%)', marginBottom: '1.25rem', overflow: 'hidden' }}>
              {/* Card header strip */}
              <div style={{ background: 'linear-gradient(135deg, hsl(43 72% 55% / 0.15), hsl(43 72% 55% / 0.05))', borderBottom: '1px solid hsl(43 72% 55% / 0.2)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55% / 0.7)', fontSize: '0.58rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                  {TYPE_LABEL[session.roomType] || session.roomType}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55%)', fontSize: '0.58rem', letterSpacing: '0.2em' }}>
                  ROOM {session.roomNumber} · FLOOR {session.floorNumber}
                </span>
              </div>

              {/* Card body */}
              <div style={{ padding: '1.25rem' }}>
                {/* Room name */}
                <h2 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 92%)', fontSize: '1.1rem', lineHeight: 1.3, marginBottom: '1.25rem' }}>
                  {session.roomName}
                </h2>

                {/* Divider */}
                <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, hsl(43 72% 55% / 0.25), transparent)', marginBottom: '1.25rem' }} />

                {/* Guest identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'hsl(43 72% 55% / 0.12)', border: '1px solid hsl(43 72% 55% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', fontWeight: 700 }}>
                      {session.guestName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.35)', fontSize: '0.55rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Registered Guest</p>
                    <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 92%)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>{session.guestName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.75rem 0.875rem', background: 'hsl(43 72% 55% / 0.06)', border: '1px solid hsl(43 72% 55% / 0.15)', marginBottom: '1.25rem' }}>
              <span style={{ color: 'hsl(43 72% 55% / 0.7)', fontSize: '0.75rem', flexShrink: 0, marginTop: '0.05rem' }}>⚠</span>
              <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.4)', fontSize: '0.6rem', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                Please verify the room name and guest name match your reservation before entering.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleConfirm}
              style={{ width: '100%', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 68%))', color: 'hsl(220 55% 14%)', fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase', padding: '1rem', border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: '0.875rem', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Enter My Portal
            </button>
            <p style={{ textAlign: 'center', fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.25)', fontSize: '0.58rem', letterSpacing: '0.1em' }}>
              Not your room? Contact the front desk.
            </p>
          </div>
        )}

        {/* ENTERING */}
        {status === 'entering' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem', animation: 'pulse 1.5s ease-in-out infinite' }}>𓂀</div>
            <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55%)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Welcome, {session?.guestName?.split(' ')[0]}</p>
            <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.35)', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Entering your portal...</p>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', border: '1px solid hsl(0 70% 55% / 0.3)', background: 'hsl(0 70% 55% / 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            </div>
            <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 92%)', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Access Denied</p>
            <p style={{ color: 'hsl(40 30% 85% / 0.5)', fontSize: '0.8rem', marginBottom: '2rem' }}>{error}</p>
            <div style={{ border: '1px solid hsl(43 72% 55% / 0.2)', padding: '1rem 1.25rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55%)', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Need Help?</p>
              <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.35)', fontSize: '0.65rem', lineHeight: 1.6 }}>Visit the front desk or call reception for assistance.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
