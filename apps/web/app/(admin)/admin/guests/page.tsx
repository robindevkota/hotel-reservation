'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { LogOut, Clock, Sunrise } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, EmptyRow, adminTableCss, TableFilters, Pagination, ConfirmDialog } from '../../_adminStyles';

const PAGE_SIZE = 10;

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', maxWidth:'440px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
        <h3 style={{ fontFamily:A.cinzel, fontSize:'1rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'1.5rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width:'100%', padding:'0.75rem 0.875rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.95rem', color:A.navy, background:'#fff', outline:'none', boxSizing:'border-box' };
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
      <p style={{ fontFamily:A.raleway, fontSize:'0.95rem', color:A.muted, lineHeight:1.7 }}>
        <strong style={{ color:A.navy }}>{guest.name}</strong> was booked for{' '}
        <strong style={{ color:A.gold }}>{bookedNights} night{bookedNights !== 1 ? 's' : ''}</strong>.
        {' '}Enter how many nights were actually stayed.
      </p>

      <div style={{ background: isNonRefundable ? 'hsl(38 90% 97%)' : 'hsl(210 80% 97%)', border:`1px solid ${isNonRefundable ? 'hsl(38 80% 80%)' : 'hsl(210 70% 80%)'}`, padding:'0.875rem 1rem', marginTop:'1rem' }}>
        <p style={{ fontFamily:A.raleway, fontSize:'0.85rem', color: isNonRefundable ? 'hsl(38 80% 35%)' : 'hsl(210 70% 35%)', lineHeight:1.6, margin:0 }}>
          {isNonRefundable
            ? 'Non-refundable — hotel retains full pre-paid amount. Bill will not be adjusted.'
            : 'Flexible — room charge will be trimmed to nights actually stayed.'}
        </p>
      </div>

      <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase' as const, color:A.navy, marginBottom:'0.5rem', marginTop:'1.25rem' }}>
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
        <button onClick={onClose} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.875rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>
          Cancel
        </button>
        <button onClick={submit} disabled={busy}
          style={{ flex:1, background:A.navy, color:'#fff', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.875rem', border:'none', cursor:'pointer', fontWeight:600, opacity: busy ? 0.55 : 1 }}>
          {busy ? 'Processing…' : 'Confirm Early Departure'}
        </button>
      </div>
    </Modal>
  );
}

// ── Early Arrival Modal ───────────────────────────────────────────────────────
function EarlyArrivalModal({ guest, onClose, onDone }: { guest: any; onClose: () => void; onDone: () => void }) {
  const [date, setDate]   = useState('');
  const [preview, setPreview] = useState<{ nights: number; charge: number } | null>(null);
  const [busy, setBusy]   = useState(false);

  const bookedCheckIn: string = guest?.bookedCheckIn ?? '';

  const handleDateChange = (val: string) => {
    setDate(val);
    if (!val || !bookedCheckIn) { setPreview(null); return; }
    const actual = new Date(val);
    const booked = new Date(bookedCheckIn);
    actual.setHours(0,0,0,0); booked.setHours(0,0,0,0);
    const nights = Math.round((booked.getTime() - actual.getTime()) / 86400000);
    if (nights > 0) setPreview({ nights, charge: nights * (guest.pricePerNight ?? 0) });
    else setPreview(null);
  };

  const submit = async () => {
    if (!date) { toast.error('Select actual check-in date'); return; }
    if (!preview || preview.nights < 1) { toast.error('Date must be before the booked check-in date'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/checkin/early-arrival/${guest.guestId}`, { actualCheckInDate: date });
      toast.success(`Early arrival recorded — ${data.extraNights} extra night${data.extraNights > 1 ? 's' : ''} added to bill`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Early arrival failed');
    } finally { setBusy(false); }
  };

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.75rem 0.875rem', border: `1px solid ${A.border}`,
    fontFamily: A.raleway, fontSize: '0.95rem', color: A.navy, background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };

  const maxDate = bookedCheckIn ? new Date(new Date(bookedCheckIn).getTime() - 86400000).toISOString().split('T')[0] : undefined;

  return (
    <Modal onClose={onClose} title="Early Arrival">
      <p style={{ fontFamily: A.raleway, fontSize: '0.95rem', color: A.muted, lineHeight: 1.7 }}>
        <strong style={{ color: A.navy }}>{guest.name}</strong> was booked to arrive on{' '}
        <strong style={{ color: A.gold }}>{new Date(bookedCheckIn).toLocaleDateString()}</strong>.
        {' '}Enter the actual date they arrived.
      </p>

      <div style={{ background: 'hsl(210 80% 97%)', border: '1px solid hsl(210 70% 80%)', padding: '0.875rem 1rem', marginTop: '1rem' }}>
        <p style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: 'hsl(210 70% 35%)', lineHeight: 1.6, margin: 0 }}>
          Extra nights will be billed at the room's nightly rate and added to the guest's open bill.
        </p>
      </div>

      <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: A.navy, marginBottom: '0.5rem', marginTop: '1.25rem' }}>
        Actual Check-In Date
      </label>
      <input
        type="date"
        value={date}
        max={maxDate}
        onChange={e => handleDateChange(e.target.value)}
        style={inputSt}
      />

      {preview && (
        <div style={{ marginTop: '1rem', background: 'hsl(142 50% 95%)', border: '1px solid hsl(142 50% 75%)', padding: '0.875rem 1rem' }}>
          <p style={{ fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'hsl(142 50% 28%)', margin: 0 }}>
            {preview.nights} extra night{preview.nights > 1 ? 's' : ''} · <strong>${preview.charge.toFixed(2)}</strong> added to bill
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={submit} disabled={busy || !preview}
          style={{ flex: 1, background: A.navy, color: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: 'none', cursor: busy || !preview ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: busy || !preview ? 0.55 : 1 }}>
          {busy ? 'Processing…' : 'Confirm Early Arrival'}
        </button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [guests, setGuests]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [checkingOut, setCheckingOut]     = useState<string | null>(null);
  const [earlyTarget, setEarlyTarget]         = useState<any | null>(null);
  const [earlyArrivalTarget, setEarlyArrivalTarget] = useState<any | null>(null);
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [confirmId, setConfirmId]         = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // /checkin/active returns Guest docs; populate reservation to get totalNights + policy
      const [guestsRes, reservationsRes, roomsRes] = await Promise.all([
        api.get('/checkin/active'),
        api.get('/reservations?status=checked_in&limit=200'),
        api.get('/rooms'),
      ]);
      const guestList: any[] = guestsRes.data.guests || [];
      const resList: any[]   = reservationsRes.data.reservations || [];
      const roomList: any[]  = roomsRes.data.rooms || [];

      // Build lookup maps
      const reservationMap: Record<string, any> = {};
      for (const r of resList) reservationMap[String(r._id)] = r;
      const roomMap: Record<string, any> = {};
      for (const r of roomList) roomMap[String(r._id)] = r;

      const merged = guestList.map((g: any) => {
        const res = reservationMap[String(g.reservation)] || {};
        // Ensure room.pricePerNight is always available via the rooms list
        if (res.room && !res.room.pricePerNight) {
          const fullRoom = roomMap[String(res.room._id ?? res.room)];
          if (fullRoom) res.room = { ...res.room, pricePerNight: fullRoom.pricePerNight };
        }
        return { ...g, _res: res };
      });

      setGuests(merged);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckOut = async (guestId: string) => {
    setCheckingOut(null);
    setConfirmId(guestId);
  };

  const doCheckOut = async (guestId: string) => {
    setConfirmId(null);
    setCheckingOut(guestId);
    try {
      await api.post(`/checkin/checkout/${guestId}`);
      toast.success('Guest checked out — bill locked');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Checkout failed');
    } finally { setCheckingOut(null); }
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return !q || g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

        <TableFilters
          search={{ value: search, onChange: v => { setSearch(v); setPage(1); }, placeholder: 'Search by name or email…' }}
          resultCount={filtered.length}
          hasActiveFilters={!!search}
          onClear={() => { setSearch(''); setPage(1); }}
        />

        <AdminTable headers={['Guest','Room','Check-In','Check-Out','Nights','Policy','Actions']} minWidth={860}>
          {loading ? <Spinner />
          : paginated.length === 0 ? <EmptyRow colSpan={7} message={search ? 'No guests match your search' : 'No guests currently checked in'} />
          : paginated.map((g: any) => {
            const res = g._res || {};
            const bookedNights: number = res.totalNights ?? 0;
            const policy: string = res.cancellationPolicy ?? 'flexible';
            return (
              <AdminRow key={g._id}>
                <AdminTd>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{g.name}</div>
                  <div style={{ fontSize:'0.7rem', color:A.muted }}>{g.email}</div>
                </AdminTd>
                <AdminTd>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{res.room?.name || '—'}</div>
                  {(res.room?.floorNumber || res.room?.roomNumber) && (
                    <div style={{ fontSize:'0.7rem', color:A.muted }}>
                      {res.room?.floorNumber ? `Floor ${res.room.floorNumber}` : ''}
                      {res.room?.floorNumber && res.room?.roomNumber ? ' · ' : ''}
                      {res.room?.roomNumber ? `Room ${res.room.roomNumber}` : ''}
                    </div>
                  )}
                </AdminTd>
                <AdminTd>{res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : '—'}</AdminTd>
                <AdminTd>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : '—'}</AdminTd>
                <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{bookedNights || '—'}</AdminTd>
                <AdminTd>
                  <StatusPill status={policy === 'non_refundable' ? 'non refundable' : 'flexible'} />
                </AdminTd>
                <AdminTd>
                  <div style={{ display:'flex', gap:'0.35rem', flexWrap:'nowrap', alignItems:'center' }}>
                    <button
                      onClick={() => handleCheckOut(g._id)}
                      disabled={checkingOut === g._id}
                      style={{ display:'flex', alignItems:'center', gap:'0.3rem', color:'hsl(38 80% 35%)', border:'1px solid hsl(38 80% 70%)', background:'hsl(38 90% 95%)', fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.35rem 0.6rem', cursor:'pointer', opacity: checkingOut === g._id ? 0.55 : 1, whiteSpace:'nowrap' }}>
                      <LogOut size={10} strokeWidth={2} />
                      {checkingOut === g._id ? 'Processing…' : 'Check Out'}
                    </button>
                    {bookedNights > 1 && (
                      <button
                        onClick={() => setEarlyTarget({ guestId: g._id, name: g.name, bookedNights, cancellationPolicy: policy })}
                        style={{ display:'flex', alignItems:'center', gap:'0.3rem', color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)', fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.35rem 0.6rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                        <Clock size={10} strokeWidth={2} />
                        Early Departure
                      </button>
                    )}
                    <button
                      onClick={() => setEarlyArrivalTarget({ guestId: g._id, name: g.name, bookedCheckIn: res.checkInDate, pricePerNight: res.room?.pricePerNight ?? 0 })}
                      style={{ display:'flex', alignItems:'center', gap:'0.3rem', color:'hsl(142 50% 28%)', border:'1px solid hsl(142 50% 70%)', background:'hsl(142 60% 96%)', fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.35rem 0.6rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                      <Sunrise size={10} strokeWidth={2} />
                      Early Arrival
                    </button>
                  </div>
                </AdminTd>
              </AdminRow>
            );
          })}
        </AdminTable>
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
      </div>

      {earlyTarget && (
        <EarlyDepartureModal
          guest={earlyTarget}
          onClose={() => setEarlyTarget(null)}
          onDone={() => { setEarlyTarget(null); fetchData(); }}
        />
      )}

      {earlyArrivalTarget && (
        <EarlyArrivalModal
          guest={earlyArrivalTarget}
          onClose={() => setEarlyArrivalTarget(null)}
          onDone={() => { setEarlyArrivalTarget(null); fetchData(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Check Out Guest"
        message="Initiate full checkout for this guest? Their bill will be locked."
        confirmLabel="Check Out"
        onConfirm={() => confirmId && doCheckOut(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}
