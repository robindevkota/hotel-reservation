'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Filter, BedDouble, Search, X } from 'lucide-react';
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

// ── Add Second Room Modal ─────────────────────────────────────────────────────
function AddRoomModal({ reservation, onClose, onDone }: { reservation: any; onClose: () => void; onDone: () => void }) {
  const [rooms, setRooms]         = useState<any[]>([]);
  const [loadingRooms, setLR]     = useState(true);
  const [selectedRoom, setRoom]   = useState('');
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [guestId, setGuestId]     = useState<string | null>(null);

  // Resolve the active guest doc for this reservation
  useEffect(() => {
    api.get('/checkin/active')
      .then(({ data }) => {
        const match = (data.guests || []).find((g: any) => String(g.reservation) === String(reservation._id));
        if (match) setGuestId(match._id);
      })
      .catch(() => {});
  }, [reservation._id]);

  // Load available rooms
  useEffect(() => {
    api.get('/rooms?available=true')
      .then(({ data }) => { setRooms(data.rooms || []); })
      .catch(() => {})
      .finally(() => setLR(false));
  }, []);

  const inputSt: React.CSSProperties = { width:'100%', padding:'0.6rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, background:'#fff', outline:'none', boxSizing:'border-box' };
  const lblSt: React.CSSProperties  = { display:'block', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem', marginTop:'1rem' };

  const submit = async () => {
    if (!guestId) { toast.error('Could not find active guest session'); return; }
    if (!selectedRoom) { toast.error('Select a room'); return; }
    if (!checkIn || !checkOut) { toast.error('Enter check-in and check-out dates'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return; }

    setBusy(true);
    try {
      // Step 1: create linked reservation
      const { data: resData } = await api.post('/reservations/walk-in-linked', {
        existingGuestId: guestId,
        room: selectedRoom,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: reservation.numberOfGuests || 1,
      });
      if (!resData.success) throw new Error(resData.message || 'Failed to create reservation');

      // Step 2: check in the new reservation (linked)
      const { data: ciData } = await api.post(`/checkin/${resData.reservation._id}`, { linkedToGuestId: guestId });
      if (!ciData.success) throw new Error(ciData.message || 'Check-in failed');

      toast.success(`Second room assigned — ${ciData.guest?.name} checked into new room`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.72)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', maxWidth:'480px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
        <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Assign Additional Room</h3>
        <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted, marginBottom:'1.5rem', lineHeight:1.6 }}>
          Currently checked-in guest <strong style={{ color:A.navy }}>{reservation.guest?.name}</strong> will be assigned a second room.
          A separate bill will be created — no billing collision with the primary stay.
        </p>

        <label style={lblSt}>Available Room</label>
        {loadingRooms
          ? <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted }}>Loading rooms…</p>
          : rooms.length === 0
            ? <p style={{ fontFamily:A.cinzel, fontSize:'0.7rem', color:'hsl(0 60% 42%)' }}>No rooms currently available</p>
            : (
              <select value={selectedRoom} onChange={e => setRoom(e.target.value)} style={{ ...inputSt }}>
                <option value="">— Select a room —</option>
                {rooms.map((r: any) => (
                  <option key={r._id} value={r._id}>
                    {r.name || r.roomNumber} — {r.type || r.categorySlug} — ${r.pricePerNight}/night
                  </option>
                ))}
              </select>
            )
        }

        <label style={lblSt}>Check-In Date</label>
        <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputSt} />

        <label style={lblSt}>Check-Out Date</label>
        <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inputSt} />

        {!guestId && (
          <p style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:'hsl(0 60% 42%)', marginTop:'0.75rem' }}>
            Warning: guest session not found. The guest may not be actively checked in.
          </p>
        )}

        <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.75rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !guestId || !selectedRoom}
            style={{ flex:1, background:A.navy, color:'#fff', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600, opacity: (busy || !guestId || !selectedRoom) ? 0.55 : 1 }}>
            {busy ? 'Processing…' : 'Check In to Second Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 10;
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [addRoomTarget, setAddRoomTarget] = useState<any | null>(null);
  const [sourceFilter, setSourceFilter] = useState('');

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
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <PageHeader eyebrow="Manage" title="Reservations" />
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
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

        <AdminTable headers={['Guest','Room','Check-In','Check-Out','Nights','Total','Source','Status','Actions']} minWidth={1080}>
          {loading ? <Spinner />
          : paginated.length === 0 ? <EmptyRow colSpan={9} message="No reservations found" />
          : paginated.map((r: any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
                <div style={{ fontSize:'0.75rem', color:A.gold, marginTop:'0.1rem', letterSpacing:'0.05em' }}>{r.bookingRef}</div>
              </AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{r.room?.name || '—'}</AdminTd>
              <AdminTd>{new Date(r.checkInDate).toLocaleDateString()}</AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{r.totalNights}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${r.roomCharges?.toLocaleString()}</AdminTd>
              <AdminTd><SourceBadge source={r.source || 'website'} /></AdminTd>
              <AdminTd><StatusPill status={r.status} /></AdminTd>
              <AdminTd>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {r.status === 'pending'   && <ActionBtn variant="confirm" onClick={() => confirmRes(r._id)}>Confirm</ActionBtn>}
                  {r.status === 'confirmed' && <ActionBtn variant="checkin" onClick={() => checkIn(r._id)}>Check In</ActionBtn>}
                  {['pending','confirmed'].includes(r.status) && (
                    <ActionBtn variant="cancel" onClick={() => { setCancelTarget(r._id); setCancelReason(''); }}>Cancel</ActionBtn>
                  )}
                  {/* Add second room — only for actively checked-in guests */}
                  {r.status === 'checked_in' && (
                    <button
                      onClick={() => setAddRoomTarget(r)}
                      style={{ display:'flex', alignItems:'center', gap:'0.35rem', color:'hsl(270 50% 38%)', border:'1px solid hsl(270 50% 75%)', background:'hsl(270 60% 97%)', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer', fontWeight:600 }}>
                      <BedDouble size={11} strokeWidth={2} />
                      Add Room
                    </button>
                  )}
                </div>
              </AdminTd>
            </AdminRow>
          ))}
        </AdminTable>

        {/* Pagination */}
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
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Guest request, double booking..."
              style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy, resize:'none', boxSizing:'border-box' as any, outline:'none', marginBottom:'1.25rem' }}
            />
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Keep</button>
              <button onClick={cancelRes}
                style={{ flex:1, background:'hsl(0 60% 48%)', color:'#fff', fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600 }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Second Room Modal */}
      {addRoomTarget && (
        <AddRoomModal
          reservation={addRoomTarget}
          onClose={() => setAddRoomTarget(null)}
          onDone={() => { setAddRoomTarget(null); fetchData(); }}
        />
      )}
    </>
  );
}
