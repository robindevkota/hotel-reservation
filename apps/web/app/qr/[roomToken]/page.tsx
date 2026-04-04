'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import GoldDivider from '../../../components/ui/GoldDivider';

export default function QRLandingPage() {
  const { roomToken } = useParams() as { roomToken: string };
  const { loginAsGuest } = useAuthStore();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomToken) return;
    api.get(`/qr/verify/${roomToken}`)
      .then(({ data }) => {
        loginAsGuest(data.token, data.guestId, data.roomId, data.roomName);
        setStatus('success');
        setTimeout(() => router.replace('/guest/dashboard'), 1500);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Invalid or expired QR code');
        setStatus('error');
      });
  }, [roomToken, loginAsGuest, router]);

  return (
    <div className="min-h-screen bg-[#0D1B3E] flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <h1 className="font-[Cinzel_Decorative] text-[#C9A84C] text-3xl mb-2">ROYAL SUITES</h1>
        <p className="font-[Cinzel] text-[#F5ECD7]/50 text-xs tracking-widest uppercase mb-8">Guest Portal</p>
        <GoldDivider ornament="𓂀" />

        {status === 'loading' && (
          <div className="mt-8">
            <div className="w-12 h-12 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-[Cinzel] text-[#F5ECD7]/70 text-sm tracking-widest">Verifying your session...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8">
            <div className="text-5xl mb-4">𓂀</div>
            <p className="font-[Cinzel] text-[#C9A84C] tracking-widest text-sm">Welcome to Royal Suites</p>
            <p className="font-[Cinzel] text-[#F5ECD7]/50 text-xs mt-2 tracking-widest">Entering your portal...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8">
            <p className="text-4xl mb-4">⚠️</p>
            <p className="font-[Cinzel] text-[#F5ECD7] tracking-widest text-sm mb-2">Access Denied</p>
            <p className="text-[#F5ECD7]/60 text-sm">{error}</p>
            <p className="font-[Cinzel] text-[#C9A84C] text-xs mt-6 tracking-wider">
              Please contact the front desk for assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
