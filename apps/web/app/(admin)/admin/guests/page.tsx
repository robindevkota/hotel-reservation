'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { LogOut, Clock } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', maxWidth:'440px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
        <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'1.5rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width:'100%', padding:'0.6rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, background:'#fff', outline:'none', boxSizing:'border-box' };
}

// ── Early Departure Modal ─────────────────────────────────────────────────────
function EarlyDepartureModal({ guest, onClose, onDone }: { guest: any; onClose: () => void; onDone: () => void }) {
  const [nights, setNights] = useState('1');
  const [busy, setBusy]     = useState(false);

  const bookedNights: number = guest?.bookedNights ?? 2;
  const isNonRefundable = guest?.cancellationPolicy === 'non_refundable';

  const submit = async () => {
    const n = parseInt(nights, 10);
    if (!n || n < 1) { toast.error('Enter at least 1 night'); return; }
    if (n >= bookedNights) { toast.error(`Must be less than booked nights (${bookedNights})`); return; }
    setBusy(true);
    try {
      await api.post(`/checkin/early-checkout/${guest.guestId}`, { nightsStayed: n });
      toast.success(`Early departure — ${n} night${n > 1 ? 's' : ''} billed`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Early checkout failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="Early Departure">
      <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted, lineHeight:1.7 }}>
        <strong style={{ color:A.navy }}>{guest.name}</strong> was booked for{' '}
        <strong style={{ color:A.gold }}>{bookedNights} night{bookedNights !== 1 ? 's' : ''}</strong>.
        {' '}Enter how many nights were actually stayed.
      </p>

      <div style={{ background: isNonRefundable ? 'hsl(38 90% 97%)' : 'hsl(210 80% 97%)', border:`1px solid ${isNonRefundable ? 'hsl(38 80% 80%)' : 'hsl(210 70% 80%)'}`, padding:'0.75rem 1rem', marginTop:'1rem' }}>
        <p style={{ fontFamily:A.cinzel, fontSize:'0.62rem', color: isNonRefundable ? 'hsl(38 80% 35%)' : 'hsl(210 70% 35%)', letterSpacing:'0.08em', lineHeight:1.6, margin:0 }}>
          {isNonRefundable
            ? 'Non-refundable — hotel retains full pre-paid amount. Bill will not be adjusted.'
            : 'Flexible — room charge will be trimmed to nights actually stayed.'}
        </p>
      </div>

      <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase' as const, color:A.navy, marginBottom:'0.4rem', marginTop:'1.25rem' }}>
        Nights Actually Stayed
      </label>
      <input
        type="number"
        min={1}
        max={bookedNights - 1}
        value={nights}
        onChange={e => setNights(e.target.value)}
        style={inputStyle()}
      />

      <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.75rem' }}>
        <button onClick={onClose} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>
          Cancel
        </button>
        <button onClick={submit} disabled={busy}
          style={{ flex:1, background:A.navy, color:'#fff', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600, opacity: busy ? 0.55 : 1 }}>
          {busy ? 'Processing…' : 'Confirm Early Departure'}
        </button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [guests, setGuests]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [earlyTarget, setEarlyTarget] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      // /checkin/active returns Guest docs; populate reservation to get totalNights + policy
      const [guestsRes, reservationsRes] = await Promise.all([
        api.get('/checkin/active'),
        api.get('/reservations?status=checked_in&limit=200'),
      ]);
      const guestList: any[] = guestsRes.data.guests || [];
      const resList: any[]   = reservationsRes.data.reservations || [];

      // Merge reservation data onto each guest for display
      const reservationMap: Record<string, any> = {};
      for (const r of resList) reservationMap[String(r._id)] = r;

      const merged = guestList.map((g: any) => {
        const res = reservationMap[String(g.reservation)] || {};
        return { ...g, _res: res };
      });

      setGuests(merged);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckOut = async (guestId: string) => {
    if (!confirm('Initiate full checkout for this guest?')) return;
    setCheckingOut(guestId);
    try {
      await api.post(`/checkin/checkout/${guestId}`);
      toast.success('Guest checked out — bill locked');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Checkout failed');
    } finally { setCheckingOut(null); }
  };

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Current Guests" title="In-House Guests" />
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.papyrus, padding:'0.75rem 1.25rem', border:`1px solid ${A.border}` }}>
            <div style={{ width:'0.6rem', height:'0.6rem', borderRadius:'50%', background:'hsl(142 50% 45%)', boxShadow:'0 0 0 3px hsl(142 60% 85%)' }} />
            <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>{guests.length} Checked In</span>
          </div>
        </div>

        <AdminTable headers={['Guest','Room','Check-In','Check-Out','Nights','Policy','Actions']} minWidth={860}>
          {loading ? <Spinner />
          : guests.length === 0 ? <EmptyRow colSpan={7} message="No guests currently checked in" />
          : guests.map((g: any) => {
            const res = g._res || {};
            const bookedNights: number = res.totalNights ?? 0;
            const policy: string = res.cancellationPolicy ?? 'flexible';
            return (
              <AdminRow key={g._id}>
                <AdminTd>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{g.name}</div>
                  <div style={{ fontSize:'0.7rem', color:A.muted }}>{g.email}</div>
                </AdminTd>
                <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>
                  {res.room?.name || res.room?.roomNumber || '—'}
                </AdminTd>
                <AdminTd>{res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : '—'}</AdminTd>
                <AdminTd>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : '—'}</AdminTd>
                <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{bookedNights || '—'}</AdminTd>
                <AdminTd>
                  <StatusPill status={policy === 'non_refundable' ? 'non refundable' : 'flexible'} />
                </AdminTd>
                <AdminTd>
                  <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                    {/* Normal checkout */}
                    <button
                      onClick={() => handleCheckOut(g._id)}
                      disabled={checkingOut === g._id}
                      style={{ display:'flex', alignItems:'center', gap:'0.4rem', color:'hsl(38 80% 35%)', border:'1px solid hsl(38 80% 70%)', background:'hsl(38 90% 95%)', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer', opacity: checkingOut === g._id ? 0.55 : 1 }}>
                      <LogOut size={11} strokeWidth={2} />
                      {checkingOut === g._id ? 'Processing…' : 'Check Out'}
                    </button>

                    {/* Early departure — only shown when >1 night booked */}
                    {bookedNights > 1 && (
                      <button
                        onClick={() => setEarlyTarget({ guestId: g._id, name: g.name, bookedNights, cancellationPolicy: policy })}
                        style={{ display:'flex', alignItems:'center', gap:'0.4rem', color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer' }}>
                        <Clock size={11} strokeWidth={2} />
                        Early Departure
                      </button>
                    )}
                  </div>
                </AdminTd>
              </AdminRow>
            );
          })}
        </AdminTable>
      </div>

      {earlyTarget && (
        <EarlyDepartureModal
          guest={earlyTarget}
          onClose={() => setEarlyTarget(null)}
          onDone={() => { setEarlyTarget(null); fetchData(); }}
        />
      )}
    </>
  );
}
