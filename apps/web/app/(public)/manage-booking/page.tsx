'use client';
import React, { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, XCircle, CalendarDays, BedDouble, Clock } from 'lucide-react';

const S = {
  gold:    'hsl(43 72% 55%)',
  goldLight: 'hsl(43 65% 72%)',
  navy:    'hsl(220 55% 18%)',
  cream:   'hsl(40 33% 96%)',
  muted:   'hsl(220 15% 40%)',
  border:  'hsl(35 25% 82%)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  cinzel:  "'Cinzel', serif",
  cormo:   "'Cormorant Garamond', serif",
  raleway: "'Raleway', sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem',
  border: `1px solid ${S.border}`, outline: 'none',
  fontFamily: S.raleway, fontSize: '0.88rem', color: S.navy,
  background: '#fff', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: S.cinzel, fontSize: '0.65rem',
  letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.5rem',
};

function statusColor(status: string) {
  if (status === 'confirmed') return '#16a34a';
  if (status === 'pending')   return '#d97706';
  if (status === 'cancelled') return '#dc2626';
  if (status === 'checked_in') return '#0ea5e9';
  return S.muted;
}

function statusLabel(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function hoursUntil(dateStr: string) {
  return (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60);
}

function ManageBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingRef, setBookingRef] = useState(searchParams.get('ref') ?? '');
  const [email, setEmail]           = useState(searchParams.get('email') ?? '');
  const [loading, setLoading]       = useState(false);
  const [reservation, setReservation] = useState<any>(null);

  // Cancel confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelled, setCancelled]     = useState<any>(null);

  const handleLookup = async () => {
    if (!bookingRef.trim() || !email.trim()) {
      toast.error('Please enter your booking reference and email');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/reservations/manage/lookup', {
        bookingRef: bookingRef.trim().toUpperCase(),
        email: email.trim(),
      });
      setReservation(data.reservation);
      setCancelled(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reservation not found. Check your booking reference and email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await api.post('/reservations/manage/cancel', {
        bookingRef: reservation.bookingRef,
        email: reservation.guest.email,
      });
      setCancelled(data);
      setReservation(null);
      setShowConfirm(false);
      toast.success('Reservation cancelled successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancellation failed. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = reservation &&
    ['pending', 'confirmed'].includes(reservation.status);

  const hours = reservation ? hoursUntil(reservation.checkInDate) : 0;
  const withinWindow = hours >= 48;
  const isNonRefundable = reservation?.cancellationPolicy === 'non_refundable';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.mgmt-input:focus{border-color:hsl(43 72% 55%)!important;}.mgmt-btn-primary{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2.5rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;}.mgmt-btn-primary:hover{opacity:0.88;}.mgmt-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}.mgmt-btn-danger{background:#dc2626;color:#fff;font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2.5rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;}.mgmt-btn-danger:hover{opacity:0.88;}.mgmt-btn-danger:disabled{opacity:0.5;cursor:not-allowed;}.mgmt-btn-secondary{background:transparent;color:hsl(220 15% 40%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2rem;border:1px solid hsl(35 25% 82%);cursor:pointer;transition:border-color 0.2s,color 0.2s;}.mgmt-btn-secondary:hover{border-color:hsl(43 72% 55%/0.4);color:hsl(220 55% 18%);}` }} />

      <div style={{ minHeight: '100vh', background: S.cream }}>

        {/* Header */}
        <div style={{ position: 'relative', background: S.navy, padding: '9rem 1.5rem 4rem', textAlign: 'center', overflow: 'hidden' }}>
          <Image src="/hero-bg.jpg" alt="" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.15 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Self Service</p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Manage Your Booking</h1>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto' }} />
          </div>
        </div>

        <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '3rem 1.5rem' }}>

          {/* ── Cancellation result ── */}
          {cancelled && (
            <div style={{ background: '#fff', border: `1px solid ${S.border}`, padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
              <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontFamily: S.cinzel, fontSize: '1rem', color: S.navy, marginBottom: '0.5rem' }}>Reservation Cancelled</h2>
              <div style={{ width: '4rem', height: '1px', background: S.divider, margin: '1rem auto' }} />
              <p style={{ fontFamily: S.raleway, fontSize: '0.85rem', color: S.muted, marginBottom: '1.5rem' }}>
                {cancelled.penaltyCharged === 0
                  ? 'Your card hold has been fully released. No charge was made.'
                  : `A cancellation fee of $${cancelled.penaltyCharged.toFixed(2)} (1 night) was charged. The remaining hold has been released.`
                }
              </p>
              <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.muted, marginBottom: '2rem' }}>
                A confirmation email has been sent to <strong>{cancelled.reservation?.guest?.email}</strong>
              </p>
              <button className="mgmt-btn-primary" onClick={() => router.push('/')}>Return Home</button>
            </div>
          )}

          {/* ── Lookup form ── */}
          {!cancelled && (
            <div style={{ background: '#fff', border: `1px solid ${S.border}`, padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.5rem' }}>Find Your Reservation</h2>
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1rem', marginBottom: '2rem' }}>
                Enter the details from your confirmation email.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Booking Reference</label>
                  <input
                    className="mgmt-input" style={inputStyle}
                    placeholder="RS-YYYYMMDD-XXXX"
                    value={bookingRef}
                    onChange={e => setBookingRef(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email" className="mgmt-input" style={inputStyle}
                    placeholder="Used at booking"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="mgmt-btn-primary" disabled={loading} onClick={handleLookup}>
                  {loading ? 'Searching...' : 'Find Booking →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Reservation details ── */}
          {reservation && (
            <div>
              {/* Status banner */}
              <div style={{ background: S.navy, padding: '1rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                  {reservation.bookingRef}
                </span>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColor(reservation.status), fontWeight: 600 }}>
                  {statusLabel(reservation.status)}
                </span>
              </div>

              {/* Details card */}
              <div style={{ background: '#fff', border: `1px solid ${S.border}`, padding: '1.75rem', marginBottom: '1.5rem' }}>
                {[
                  { icon: <BedDouble size={14} color={S.gold} />, label: 'Room',     value: reservation.room?.name || '—' },
                  { icon: <CalendarDays size={14} color={S.gold} />, label: 'Check-In',  value: new Date(reservation.checkInDate).toDateString() },
                  { icon: <CalendarDays size={14} color={S.gold} />, label: 'Check-Out', value: new Date(reservation.checkOutDate).toDateString() },
                  { icon: <Clock size={14} color={S.gold} />,        label: 'Nights',    value: String(reservation.totalNights) },
                  { icon: null, label: 'Guest',    value: reservation.guest?.name },
                  { icon: null, label: 'Rate',     value: reservation.cancellationPolicy === 'non_refundable' ? 'Non-Refundable (10% off)' : 'Flexible' },
                  { icon: null, label: 'Total',    value: `$${Number(reservation.roomCharges).toFixed(2)}` },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: `1px solid ${S.border}`, gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {icon}
                      <span style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: S.muted }}>{label}</span>
                    </div>
                    <span style={{ fontFamily: S.raleway, fontSize: '0.85rem', color: S.navy, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Cancellation policy info */}
              {canCancel && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {isNonRefundable ? (
                    <div style={{ background: '#fff8e6', border: `1px solid ${S.gold}`, padding: '0.875rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <AlertTriangle size={16} color={S.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                        You selected a <strong>non-refundable</strong> rate. Cancelling will <strong>not</strong> issue any refund — the hotel retains the full amount of <strong>${Number(reservation.roomCharges).toFixed(2)}</strong>.
                      </p>
                    </div>
                  ) : withinWindow ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '0.875rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                        You are within the <strong>free cancellation window</strong> (more than 48 hours before check-in). Your card hold will be fully released — <strong>$0 charged</strong>.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.875rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <XCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                        Check-in is <strong>less than 48 hours away</strong>. A <strong>1-night cancellation fee of ${Number(reservation.room?.pricePerNight).toFixed(2)}</strong> will be charged from your held amount.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="mgmt-btn-secondary" onClick={() => setReservation(null)}>← Search Again</button>
                {canCancel && !showConfirm && (
                  <button className="mgmt-btn-danger" onClick={() => setShowConfirm(true)}>
                    Cancel Reservation
                  </button>
                )}
              </div>

              {/* Confirmation dialog */}
              {showConfirm && (
                <div style={{ marginTop: '1.5rem', background: '#fff', border: '2px solid #dc2626', padding: '1.5rem' }}>
                  <p style={{ fontFamily: S.cinzel, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', marginBottom: '0.75rem' }}>
                    Confirm Cancellation
                  </p>
                  <p style={{ fontFamily: S.raleway, fontSize: '0.85rem', color: S.navy, marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    {isNonRefundable
                      ? `Are you sure? This is non-refundable — $${Number(reservation.roomCharges).toFixed(2)} will not be returned.`
                      : withinWindow
                        ? 'Are you sure you want to cancel? Your card hold will be fully released.'
                        : `Are you sure? A 1-night fee of $${Number(reservation.room?.pricePerNight).toFixed(2)} will be charged.`
                    }
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="mgmt-btn-secondary" onClick={() => setShowConfirm(false)} disabled={cancelling}>
                      Keep Booking
                    </button>
                    <button className="mgmt-btn-danger" onClick={handleCancel} disabled={cancelling}>
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel It'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense fallback={null}>
      <ManageBookingContent />
    </Suspense>
  );
}
