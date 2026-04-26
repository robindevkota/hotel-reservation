'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Filter, Search, X, Plus, Sunrise } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

const STATUSES = ['','pending','confirmed','checked_in','checked_out','cancelled'];
const SOURCES = ['','website','booking_com','agoda','other'];

const SOURCE_LABELS: Record<string, string> = {
  website:     'Royal Suites',
  booking_com: 'Booking.com',
  agoda:       'Agoda',
  other:       'Other',
};
const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  website:     { bg: '#FBF6E9', color: '#8B6914', border: '#C9A84C' },
  booking_com: { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
  agoda:       { bg: '#FEF2F2', color: '#B91C1C', border: '#FCA5A5' },
  other:       { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
};

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_COLORS[source] || SOURCE_COLORS.other;
  return (
    <span style={{ display:'inline-block', fontFamily:'Cinzel, serif', fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.2rem 0.5rem', background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

const inputSt: React.CSSProperties = { width:'100%', padding:'0.6rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, background:'#fff', outline:'none', boxSizing:'border-box' };
const lblSt: React.CSSProperties  = { display:'block', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem', marginTop:'1rem' };

// ── Nationality Toggle ────────────────────────────────────────────────────────
function NationalityToggle({ value, onChange }: { value: 'foreign' | 'nepali'; onChange: (v: 'foreign' | 'nepali') => void }) {
  const base: React.CSSProperties = { flex: 1, padding: '0.6rem 0', fontFamily: A.cinzel, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid ${A.border}`, cursor: 'pointer', textAlign: 'center' };
  return (
    <div style={{ display: 'flex', gap: 0, marginTop: '0.25rem' }}>
      <button
        type="button"
        onClick={() => onChange('foreign')}
        style={{ ...base, background: value === 'foreign' ? A.navy : '#fff', color: value === 'foreign' ? A.gold : A.muted, borderRight: 'none' }}
      >
        Foreign
      </button>
      <button
        type="button"
        onClick={() => onChange('nepali')}
        style={{ ...base, background: value === 'nepali' ? A.navy : '#fff', color: value === 'nepali' ? A.gold : A.muted }}
      >
        Nepali
      </button>
    </div>
  );
}

// ── Walk-In Modal ─────────────────────────────────────────────────────────────
function WalkInModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rooms, setRooms]       = useState<any[]>([]);
  const [loadingRooms, setLR]   = useState(true);
  const [selectedRoom, setRoom] = useState('');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests]     = useState('1');
  const [guestType, setGuestType] = useState<'foreign' | 'nepali'>('foreign');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    api.get('/rooms?available=true')
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLR(false));
  }, []);

  const submit = async () => {
    if (!name || !email || !phone) { toast.error('Fill in guest details'); return; }
    if (!selectedRoom) { toast.error('Select a room'); return; }
    if (!checkIn || !checkOut) { toast.error('Enter dates'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return; }

    setBusy(true);
    try {
      await api.post('/reservations/walk-in', {
        guest: { name, email, phone },
        room: selectedRoom,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: Number(guests) || 1,
        guestType,
      });
      toast.success('Walk-in reservation created');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', maxWidth:'500px', width:'100%', padding:'2rem', border:`1px solid ${A.border}`, maxHeight:'90vh', overflowY:'auto' }}>
        <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'1.5rem' }}>Walk-In Reservation</h3>

        <label style={lblSt}>Nationality</label>
        <NationalityToggle value={guestType} onChange={setGuestType} />

        <label style={{ ...lblSt, marginTop: '1rem' }}>Guest Name</label>
        <input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />

        <label style={lblSt}>Email</label>
        <input style={inputSt} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="guest@example.com" />

        <label style={lblSt}>Phone</label>
        <input style={inputSt} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+977…" />

        <label style={lblSt}>Room</label>
        {loadingRooms
          ? <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted }}>Loading…</p>
          : <select value={selectedRoom} onChange={e => setRoom(e.target.value)} style={inputSt}>
              <option value="">— Select a room —</option>
              {rooms.map((r: any) => (
                <option key={r._id} value={r._id}>{r.name || r.roomNumber} — ${r.pricePerNight}/night</option>
              ))}
            </select>
        }

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <div>
            <label style={lblSt}>Check-In</label>
            <input type="date" style={inputSt} value={checkIn} onChange={e => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label style={lblSt}>Check-Out</label>
            <input type="date" style={inputSt} value={checkOut} onChange={e => setCheckOut(e.target.value)} />
          </div>
        </div>

        <label style={lblSt}>Number of Guests</label>
        <input type="number" min={1} style={inputSt} value={guests} onChange={e => setGuests(e.target.value)} />

        <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.75rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ flex:1, background:A.navy, color:A.gold, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Creating…' : 'Create Walk-In'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Early Arrival Modal ───────────────────────────────────────────────────────
function EarlyArrivalModal({ reservation, onClose, onDone }: { reservation: any; onClose: () => void; onDone: () => void }) {
  const [date, setDate]       = useState('');
  const [preview, setPreview] = useState<{ nights: number; charge: number } | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  const bookedCheckIn: string = reservation?.checkInDate ?? '';
  const pricePerNight: number = reservation?.room?.pricePerNight ?? 0;

  useEffect(() => {
    api.get('/checkin/active')
      .then(({ data }) => {
        const match = (data.guests || []).find((g: any) => String(g.reservation) === String(reservation._id));
        if (match) setGuestId(match._id);
      })
      .catch(() => {});
  }, [reservation._id]);

  const handleDateChange = (val: string) => {
    setDate(val);
    if (!val || !bookedCheckIn) { setPreview(null); return; }
    const actual = new Date(val);
    const booked = new Date(bookedCheckIn);
    actual.setHours(0,0,0,0); booked.setHours(0,0,0,0);
    const nights = Math.round((booked.getTime() - actual.getTime()) / 86400000);
    if (nights > 0) setPreview({ nights, charge: nights * pricePerNight });
    else setPreview(null);
  };

  const submit = async () => {
    if (!guestId) { toast.error('No active guest session found for this reservation'); return; }
    if (!date) { toast.error('Select actual check-in date'); return; }
    if (!preview || preview.nights < 1) { toast.error('Date must be before the booked check-in date'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/checkin/early-arrival/${guestId}`, { actualCheckInDate: date });
      toast.success(`Early arrival recorded — ${data.extraNights} extra night${data.extraNights > 1 ? 's' : ''} added to bill`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Early arrival failed');
    } finally { setBusy(false); }
  };

  const maxDate = bookedCheckIn
    ? new Date(new Date(bookedCheckIn).getTime() - 86400000).toISOString().split('T')[0]
    : undefined;

  return (
    <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', maxWidth:'420px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
        <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Early Arrival</h3>
        <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted, marginBottom:'1.5rem', lineHeight:1.6 }}>
          <strong style={{ color:A.navy }}>{reservation.guest?.name}</strong> booked to arrive{' '}
          <strong style={{ color:A.gold }}>{new Date(bookedCheckIn).toLocaleDateString()}</strong>.
          {' '}Enter the actual arrival date.
        </p>

        <div style={{ background:'hsl(210 80% 97%)', border:'1px solid hsl(210 70% 80%)', padding:'0.875rem 1rem', marginBottom:'1.25rem' }}>
          <p style={{ fontFamily:A.raleway, fontSize:'0.85rem', color:'hsl(210 70% 35%)', lineHeight:1.6, margin:0 }}>
            Extra nights billed at ${pricePerNight}/night and added to the guest's open bill.
          </p>
        </div>

        <label style={lblSt}>Actual Arrival Date</label>
        <input type="date" value={date} max={maxDate} onChange={e => handleDateChange(e.target.value)} style={inputSt} />

        {preview && (
          <div style={{ marginTop:'1rem', background:'hsl(142 50% 95%)', border:'1px solid hsl(142 50% 75%)', padding:'0.875rem 1rem' }}>
            <p style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'hsl(142 50% 28%)', margin:0 }}>
              {preview.nights} extra night{preview.nights > 1 ? 's' : ''} · <strong>${preview.charge.toFixed(2)}</strong> added to bill
            </p>
          </div>
        )}

        {!guestId && (
          <p style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:'hsl(0 60% 42%)', marginTop:'0.75rem' }}>
            Warning: guest session not found. Guest may not be actively checked in.
          </p>
        )}

        <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.75rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={busy || !preview || !guestId}
            style={{ flex:1, background:A.navy, color:'#fff', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600, opacity: (busy || !preview || !guestId) ? 0.55 : 1 }}>
            {busy ? 'Processing…' : 'Confirm Early Arrival'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const [reservations, setReservations]     = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState('');
  const [search, setSearch]                 = useState('');
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 10;
  const [cancelTarget, setCancelTarget]     = useState<string | null>(null);
  const [cancelReason, setCancelReason]     = useState('');
  const [earlyArrivalTarget, setEarlyArrivalTarget] = useState<any | null>(null);
  const [walkInOpen, setWalkInOpen]         = useState(false);
  const [sourceFilter, setSourceFilter]     = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get(`/reservations${filter ? `?status=${filter}` : ''}`)
      .then(({ data }) => { setReservations(data.reservations || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);
  useEffect(() => { setPage(1); }, [search, filter, sourceFilter]);

  const q = search.trim().toLowerCase();
  const filtered = reservations.filter(r => {
    if (sourceFilter && r.source !== sourceFilter) return false;
    if (!q) return true;
    return (
      r.guest?.name?.toLowerCase().includes(q) ||
      r.guest?.email?.toLowerCase().includes(q) ||
      r.bookingRef?.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmRes = async (id: string) => {
    try { await api.patch(`/reservations/${id}/confirm`); toast.success('Confirmed'); fetchData(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const checkIn = async (id: string) => {
    try {
      const { data } = await api.post(`/checkin/${id}`);
      toast.success('Checked in!');
      fetchData();
      if (data.qrCodeUrl) window.open(data.qrCodeUrl, '_blank');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const cancelRes = async () => {
    if (!cancelTarget) return;
    try {
      await api.patch(`/reservations/${cancelTarget}/cancel`, { reason: cancelReason || 'Cancelled by staff' });
      toast.success('Cancelled');
      fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setCancelTarget(null); setCancelReason(''); }
  };

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <PageHeader eyebrow="Manage" title="Reservations" />
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
            {/* Walk-in button */}
            <button
              onClick={() => setWalkInOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:A.navy, color:A.gold, border:'none', cursor:'pointer', fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.7rem 1.25rem' }}>
              <Plus size={13} strokeWidth={2} /> Walk-In
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem' }}>
              <Search size={14} color={A.gold} strokeWidth={1.8} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, email or booking ref…"
                style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy, background:'transparent', border:'none', outline:'none', width:'220px' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:'0', display:'flex', alignItems:'center', color:A.muted }}>
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem' }}>
              <Filter size={13} color={A.gold} strokeWidth={1.8} />
              <select value={filter} onChange={e => setFilter(e.target.value)}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.navy, background:'transparent', border:'none', outline:'none', cursor:'pointer' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem' }}>
              <Filter size={13} color={A.gold} strokeWidth={1.8} />
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.navy, background:'transparent', border:'none', outline:'none', cursor:'pointer' }}>
                {SOURCES.map(s => <option key={s} value={s}>{s ? SOURCE_LABELS[s] : 'All Sources'}</option>)}
              </select>
            </div>
          </div>
        </div>

        <AdminTable headers={['Guest','Room','Check-In','Check-Out','Nights','Total','Source','Status','Actions']} minWidth={1200}>
          {loading ? <Spinner />
          : paginated.length === 0 ? <EmptyRow colSpan={9} message="No reservations found" />
          : paginated.map((r: any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
                <div style={{ fontSize:'0.75rem', color:A.gold, marginTop:'0.1rem', letterSpacing:'0.05em' }}>{r.bookingRef}</div>
                {r.guestType === 'nepali' && (
                  <span style={{ display:'inline-block', marginTop:'0.2rem', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.1rem 0.4rem', background:'hsl(205 80% 94%)', color:'hsl(205 70% 30%)', border:'1px solid hsl(205 70% 78%)' }}>
                    Nepali
                  </span>
                )}
              </AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{r.room?.name || '—'}</AdminTd>
              <AdminTd>{new Date(r.checkInDate).toLocaleDateString()}</AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{r.totalNights}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${r.roomCharges?.toLocaleString()}</AdminTd>
              <AdminTd><SourceBadge source={r.source || 'website'} /></AdminTd>
              <AdminTd><StatusPill status={r.status} /></AdminTd>
              <AdminTd style={{ whiteSpace:'nowrap' }}>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'nowrap', alignItems:'center' }}>
                  {r.status === 'pending'   && <ActionBtn variant="confirm" onClick={() => confirmRes(r._id)}>Confirm</ActionBtn>}
                  {r.status === 'confirmed' && <ActionBtn variant="checkin" onClick={() => checkIn(r._id)}>Check In</ActionBtn>}
                  {r.status === 'confirmed' && (
                    <button
                      onClick={() => setEarlyArrivalTarget(r)}
                      style={{ display:'flex', alignItems:'center', gap:'0.3rem', color:'hsl(142 50% 30%)', border:'1px solid hsl(142 50% 75%)', background:'hsl(142 60% 97%)', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.4rem 0.9rem', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
                      <Sunrise size={11} strokeWidth={2} />
                      Early Arrival
                    </button>
                  )}
                  {['pending','confirmed'].includes(r.status) && (
                    <ActionBtn variant="cancel" onClick={() => { setCancelTarget(r._id); setCancelReason(''); }}>Cancel</ActionBtn>
                  )}
                </div>
              </AdminTd>
            </AdminRow>
          ))}
        </AdminTable>

        {!loading && totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1.25rem', paddingTop:'1rem', borderTop:`1px solid ${A.border}` }}>
            <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', color:A.muted }}>
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display:'flex', gap:'0.35rem' }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.875rem', border:`1px solid ${A.border}`, background:'#fff', color: page===1 ? A.muted : A.navy, cursor: page===1 ? 'default' : 'pointer', opacity: page===1 ? 0.45 : 1 }}>
                Prev
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.7rem', border:`1px solid ${n===page ? A.gold : A.border}`, background: n===page ? A.gold : '#fff', color: n===page ? '#fff' : A.navy, cursor:'pointer', fontWeight: n===page ? 700 : 400 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.875rem', border:`1px solid ${A.border}`, background:'#fff', color: page===totalPages ? A.muted : A.navy, cursor: page===totalPages ? 'default' : 'pointer', opacity: page===totalPages ? 0.45 : 1 }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', maxWidth:'420px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
            <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'1.25rem' }}>Cancel Reservation</h3>
            <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Reason (optional)</label>
            <textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Guest request, double booking..."
              style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy, resize:'none', boxSizing:'border-box' as any, outline:'none', marginBottom:'1.25rem' }} />
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Keep</button>
              <button onClick={cancelRes}
                style={{ flex:1, background:'hsl(0 60% 48%)', color:'#fff', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600 }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {earlyArrivalTarget && (
        <EarlyArrivalModal
          reservation={earlyArrivalTarget}
          onClose={() => setEarlyArrivalTarget(null)}
          onDone={() => { setEarlyArrivalTarget(null); fetchData(); }}
        />
      )}

      {walkInOpen && (
        <WalkInModal
          onClose={() => setWalkInOpen(false)}
          onDone={() => { setWalkInOpen(false); fetchData(); }}
        />
      )}
    </>
  );
}
