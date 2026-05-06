'use client';
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import {
  LogOut, Clock, BedDouble, CalendarPlus,
  Bell, CheckCircle2, Shirt, Droplets, Sparkles, Wrench, AlarmClock, Moon, BellOff, Wind, Zap, Hourglass,
  ChefHat, ArrowRight, X,
} from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, EmptyRow, adminTableCss, TableFilters, Pagination, ConfirmDialog } from '../../_adminStyles';
import { useFrontDeskSocket, useKitchenSocket } from '../../../../hooks/useSocket';
import { useOrderStore } from '../../../../store/orderStore';

const PAGE_SIZE = 10;
type AdminGuestTab = 'guests' | 'live';

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.75rem 0.875rem', border: `1px solid ${A.border}`,
  fontFamily: A.raleway, fontSize: '0.95rem', color: A.navy, background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
const lblSt: React.CSSProperties = {
  display: 'block', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: A.navy, marginBottom: '0.5rem', marginTop: '1.25rem',
};

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 55% 18% / 0.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', maxWidth: '440px', width: '100%', padding: '2rem', border: `1px solid ${A.border}` }}>
        <h3 style={{ fontFamily: A.cinzel, fontSize: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, marginBottom: '1.5rem' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
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
      <p style={{ fontFamily: A.raleway, fontSize: '0.95rem', color: A.muted, lineHeight: 1.7 }}>
        <strong style={{ color: A.navy }}>{guest.name}</strong> was booked for{' '}
        <strong style={{ color: A.gold }}>{bookedNights} night{bookedNights !== 1 ? 's' : ''}</strong>.{' '}
        Enter how many nights were actually stayed.
      </p>
      <div style={{ background: isNonRefundable ? 'hsl(38 90% 97%)' : 'hsl(210 80% 97%)', border: `1px solid ${isNonRefundable ? 'hsl(38 80% 80%)' : 'hsl(210 70% 80%)'}`, padding: '0.875rem 1rem', marginTop: '1rem' }}>
        <p style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: isNonRefundable ? 'hsl(38 80% 35%)' : 'hsl(210 70% 35%)', lineHeight: 1.6, margin: 0 }}>
          {isNonRefundable
            ? 'Non-refundable — hotel retains full pre-paid amount. Bill will not be adjusted.'
            : 'Flexible — room charge will be trimmed to nights actually stayed.'}
        </p>
      </div>
      <label style={lblSt}>Nights Actually Stayed</label>
      <input type="number" min={1} max={bookedNights - 1} value={nights} onChange={e => setNights(e.target.value)} style={inputSt} />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={busy} style={{ flex: 1, background: A.navy, color: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.55 : 1 }}>
          {busy ? 'Processing…' : 'Confirm Early Departure'}
        </button>
      </div>
    </Modal>
  );
}

// ── Add Room Modal ────────────────────────────────────────────────────────────
function AddRoomModal({ guest, onClose, onDone }: { guest: any; onClose: () => void; onDone: () => void }) {
  const [rooms, setRooms]       = useState<any[]>([]);
  const [loadingRooms, setLR]   = useState(true);
  const [selectedRoom, setRoom] = useState('');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    api.get('/rooms?available=true')
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLR(false));
  }, []);

  const submit = async () => {
    if (!selectedRoom) { toast.error('Select a room'); return; }
    if (!checkIn || !checkOut) { toast.error('Enter dates'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return; }
    setBusy(true);
    try {
      const { data: resData } = await api.post('/reservations/walk-in-linked', {
        existingGuestId: guest.guestId, room: selectedRoom,
        checkInDate: checkIn, checkOutDate: checkOut, numberOfGuests: 1,
      });
      if (!resData.success) throw new Error(resData.message || 'Failed to create reservation');
      const { data: ciData } = await api.post(`/checkin/${resData.reservation._id}`, { linkedToGuestId: guest.guestId });
      if (!ciData.success) throw new Error(ciData.message || 'Check-in failed');
      toast.success('Second room assigned — checked in');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="Assign Additional Room">
      <p style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.muted, marginBottom: '1rem', lineHeight: 1.6 }}>
        <strong style={{ color: A.navy }}>{guest.name}</strong> will be assigned a second room with a separate bill.
      </p>
      <label style={lblSt}>Available Room</label>
      {loadingRooms
        ? <p style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.muted }}>Loading…</p>
        : rooms.length === 0
          ? <p style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: 'hsl(0 60% 42%)' }}>No rooms currently available</p>
          : <select value={selectedRoom} onChange={e => setRoom(e.target.value)} style={inputSt}>
              <option value="">— Select a room —</option>
              {rooms.map((r: any) => (
                <option key={r._id} value={r._id}>{r.name || r.roomNumber} — {r.type} — ${r.pricePerNight}/night</option>
              ))}
            </select>
      }
      <label style={lblSt}>Check-In Date</label>
      <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputSt} />
      <label style={lblSt}>Check-Out Date</label>
      <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inputSt} />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={busy || !selectedRoom} style={{ flex: 1, background: A.navy, color: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: (busy || !selectedRoom) ? 0.55 : 1 }}>
          {busy ? 'Processing…' : 'Check In to Second Room'}
        </button>
      </div>
    </Modal>
  );
}

// ── Extend Stay Modal ─────────────────────────────────────────────────────────
function ExtendStayModal({ guest, onClose, onDone }: { guest: any; onClose: () => void; onDone: () => void }) {
  const [extraNights, setExtraNights] = useState('1');
  const [busy, setBusy]               = useState(false);
  const nights = Number(extraNights);
  const pricePerNight: number = guest?.pricePerNight ?? 0;
  const estimatedCost = nights > 0 ? nights * pricePerNight : 0;
  const currentCheckOut = guest?.checkOutDate ? new Date(guest.checkOutDate) : null;
  const newCheckOut = currentCheckOut && nights > 0
    ? new Date(new Date(currentCheckOut).setDate(currentCheckOut.getDate() + nights))
    : null;

  const submit = async () => {
    if (!nights || nights < 1) { toast.error('Enter at least 1 night'); return; }
    setBusy(true);
    try {
      await api.patch(`/checkin/extend/${guest.guestId}`, { extraNights: nights });
      toast.success(`Stay extended by ${nights} night${nights > 1 ? 's' : ''} — QR session refreshed`);
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Extend failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="Extend Stay">
      <p style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.muted, marginBottom: '1rem', lineHeight: 1.6 }}>
        <strong style={{ color: A.navy }}>{guest.name}</strong> — <strong style={{ color: A.navy }}>{guest.roomName}</strong>
      </p>
      <div style={{ background: A.papyrus, border: `1px solid ${A.border}`, padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.muted }}>Current check-out</span>
          <span style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.navy }}>{currentCheckOut?.toLocaleDateString() ?? '—'}</span>
        </div>
        {newCheckOut && nights > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.muted }}>New check-out</span>
            <span style={{ fontFamily: A.cinzel, fontSize: '0.7rem', color: A.gold, fontWeight: 700 }}>{newCheckOut.toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <label style={lblSt}>Extra Nights</label>
      <input type="number" min={1} value={extraNights} onChange={e => setExtraNights(e.target.value)} style={inputSt} />
      {estimatedCost > 0 && (
        <p style={{ fontFamily: A.cinzel, fontSize: '0.72rem', color: A.muted, marginTop: '0.625rem' }}>
          Additional charge: <strong style={{ color: A.gold }}>${estimatedCost.toLocaleString()}</strong> ({nights} × ${pricePerNight}/night) — added to bill
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={busy || nights < 1} style={{ flex: 1, background: A.navy, color: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: (busy || nights < 1) ? 0.55 : 1 }}>
          {busy ? 'Extending…' : 'Extend Stay'}
        </button>
      </div>
    </Modal>
  );
}

// ── Service request helpers ───────────────────────────────────────────────────
const SVC_TYPE_META: Record<string, { label: string; Icon: any }> = {
  laundry:          { label: 'Laundry',        Icon: Shirt      },
  towels:           { label: 'Towels',          Icon: Wind       },
  pillows:          { label: 'Pillows',         Icon: BedDouble  },
  water:            { label: 'Water',           Icon: Droplets   },
  housekeeping:     { label: 'Housekeeping',    Icon: Sparkles   },
  maintenance:      { label: 'Maintenance',     Icon: Wrench     },
  iron:             { label: 'Iron & Board',    Icon: Zap        },
  wake_up:          { label: 'Wake-Up Call',    Icon: AlarmClock },
  turndown:         { label: 'Turndown',        Icon: Moon       },
  do_not_disturb:   { label: 'Do Not Disturb',  Icon: BellOff   },
};

const SVC_STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  pending:      { color: 'hsl(38 80% 35%)',  bg: 'hsl(38 90% 96%)',  border: 'hsl(38 70% 80%)' },
  acknowledged: { color: 'hsl(200 70% 30%)', bg: 'hsl(200 70% 96%)', border: 'hsl(200 60% 78%)' },
  done:         { color: 'hsl(142 55% 28%)', bg: 'hsl(142 50% 96%)', border: 'hsl(142 45% 78%)' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Live Operations Tab (Room Service + Service Requests unified) ─────────────

function LiveOperationsTab() {
  // ── Orders state ──
  const { orders, setOrders, updateOrderStatus } = useOrderStore();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data.orders || [])).catch(() => {});
  }, [setOrders]);

  useKitchenSocket();

  const acceptOrder = async (id: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: 'accepted' });
      updateOrderStatus(id, 'accepted');
      toast.success('Order accepted — sent to kitchen');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.patch(`/orders/${cancelTarget}/cancel`, { reason: cancelReason || 'Cancelled by staff' });
      updateOrderStatus(cancelTarget, 'cancelled');
      toast.success('Cancelled');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setCancelTarget(null); setCancelReason(''); }
  };

  // ── Service requests state ──
  const [requests, setRequests] = useState<any[]>([]);
  const [svcLoading, setSvcLoading] = useState(true);
  const [acting, setActing]         = useState<string | null>(null);

  useEffect(() => {
    api.get('/service-requests?active=true')
      .then(({ data }) => setRequests(data.requests ?? []))
      .catch(() => {})
      .finally(() => setSvcLoading(false));
  }, []);

  const onServiceNew = useCallback((req: any) => {
    setRequests(prev => [req, ...prev]);
    toast(`${SVC_TYPE_META[req.type]?.label ?? req.type} — ${req.guest?.name ?? 'Guest'}`, { icon: '🔔' });
  }, []);

  const onServiceUpdated = useCallback((updated: any) => {
    setRequests(prev =>
      updated.status === 'done'
        ? prev.filter(r => r._id !== updated._id)
        : prev.map(r => r._id === updated._id ? updated : r)
    );
  }, []);

  useFrontDeskSocket(onServiceNew, onServiceUpdated);

  const actSvc = async (id: string, status: 'acknowledged' | 'done') => {
    setActing(id);
    try {
      await api.patch(`/service-requests/${id}/status`, { status });
      if (status === 'done') {
        setRequests(prev => prev.filter(r => r._id !== id));
        toast.success('Marked as done');
      } else {
        setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'acknowledged' } : r));
        toast.success('Acknowledged');
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Action failed'); }
    finally { setActing(null); }
  };

  const activeOrders  = orders.filter((o: any) => o.status === 'pending');
  const pendingSvc    = requests.filter(r => r.status === 'pending').length;
  const nothingActive = activeOrders.length === 0 && requests.length === 0;

  return (
    <div>
      {/* ── Live status bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: A.papyrus, border: `1px solid ${A.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'hsl(142 50% 45%)', boxShadow: '0 0 0 3px hsl(142 60% 85%)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.muted }}>Live</span>
        </div>
        <span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', color: activeOrders.length > 0 ? 'hsl(0 65% 45%)' : A.navy }}>{activeOrders.length} pending order{activeOrders.length !== 1 ? 's' : ''}</span>
        <span style={{ color: A.border }}>·</span>
        <span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', color: pendingSvc > 0 ? 'hsl(0 65% 45%)' : A.navy }}>
          {pendingSvc > 0 ? `${pendingSvc} request${pendingSvc !== 1 ? 's' : ''} pending` : `${requests.length} request${requests.length !== 1 ? 's' : ''} active`}
        </span>
      </div>

      {nothingActive ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#fff', border: `1px solid ${A.border}` }}>
          <ChefHat size={36} strokeWidth={1.2} color={A.muted} style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.muted }}>All quiet — no active orders or requests</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ══ Food Orders Section ══════════════════════════════════════════ */}
          {activeOrders.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <ChefHat size={13} color={A.gold} strokeWidth={1.5} />
                <h3 style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: A.navy, margin: 0 }}>
                  Room Service Orders
                </h3>
                <span style={{ fontFamily: A.raleway, fontSize: '0.65rem', color: A.muted }}>({activeOrders.length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {activeOrders.map((order: any) => (
                  <div key={order._id} style={{ background: '#fff', border: `1px solid ${A.border}`, overflow: 'hidden', boxShadow: '0 2px 12px hsl(220 55% 14% / 0.06)' }}>
                    <div style={{ background: A.navy, padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: A.cinzel, fontSize: '0.8rem', color: A.gold }}>
                          {order.walkInCustomer ? order.walkInCustomer.name : `Room ${order.room?.roomNumber}`}
                        </p>
                        <p style={{ fontFamily: A.raleway, fontSize: '0.68rem', color: 'rgba(245,236,215,0.45)', marginTop: '0.1rem' }}>
                          {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <StatusPill status={order.status} />
                    </div>
                    <div style={{ padding: '1rem 1.125rem' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: `1px solid ${A.border}` }}>
                            <span style={{ fontFamily: A.raleway, fontSize: '0.78rem', color: A.navy }}>{item.quantity}× {item.menuItem?.name}</span>
                            <span style={{ fontFamily: A.cinzel, fontSize: '0.72rem', color: A.gold }}>NPR {(item.unitPrice * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && <p style={{ fontFamily: A.raleway, fontStyle: 'italic', fontSize: '0.75rem', color: A.muted, marginBottom: '0.75rem' }}>"{order.notes}"</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: A.cinzel, fontSize: '1rem', color: A.gold, fontWeight: 700 }}>NPR {order.totalAmount}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => acceptOrder(order._id)}
                            style={{ background: `linear-gradient(135deg, ${A.gold}, hsl(43 65% 72%))`, color: A.navy, fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.35rem 0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            Accept <ArrowRight size={9} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => { setCancelTarget(order._id); setCancelReason(''); }}
                            style={{ color: 'hsl(0 60% 42%)', border: '1px solid hsl(0 60% 75%)', background: 'hsl(0 70% 97%)', fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══ Service Requests Section ═════════════════════════════════════ */}
          {!svcLoading && requests.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <Bell size={13} color={A.gold} strokeWidth={1.5} />
                <h3 style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: A.navy, margin: 0 }}>
                  Guest Service Requests
                </h3>
                <span style={{ fontFamily: A.raleway, fontSize: '0.65rem', color: A.muted }}>({requests.length})</span>
                {pendingSvc > 0 && (
                  <span style={{ background: 'hsl(0 65% 52%)', color: '#fff', fontFamily: A.raleway, fontWeight: 700, fontSize: '0.58rem', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                    {pendingSvc} pending
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {requests.map((req: any) => {
                  const tm = SVC_TYPE_META[req.type] ?? { label: req.type, Icon: Bell };
                  const ss = SVC_STATUS_STYLE[req.status] ?? SVC_STATUS_STYLE.pending;
                  const { Icon: TypeIcon } = tm;
                  const busy = acting === req._id;
                  return (
                    <div key={req._id} style={{ background: '#fff', border: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TypeIcon size={14} color={ss.color} strokeWidth={1.5} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.navy }}>{tm.label}</span>
                            <span style={{ fontFamily: A.cinzel, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: ss.color, background: ss.bg, padding: '0.1rem 0.4rem', border: `1px solid ${ss.border}` }}>{req.status}</span>
                          </div>
                          <div style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted, marginTop: '0.15rem' }}>
                            <strong style={{ color: A.navy }}>{req.guest?.name ?? '—'}</strong>
                            {' · '}{req.room?.name ?? req.room?.roomNumber ?? '—'}
                            {' · '}<span style={{ color: req.status === 'pending' ? 'hsl(0 65% 48%)' : A.muted }}>{timeAgo(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        {req.status === 'pending' && (
                          <button onClick={() => actSvc(req._id, 'acknowledged')} disabled={busy}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', border: '1px solid hsl(200 60% 70%)', background: 'hsl(200 70% 96%)', color: 'hsl(200 70% 30%)', fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1 }}>
                            <Hourglass size={10} strokeWidth={2} /> Acknowledge
                          </button>
                        )}
                        <button onClick={() => actSvc(req._id, 'done')} disabled={busy}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', border: '1px solid hsl(142 45% 70%)', background: 'hsl(142 50% 96%)', color: 'hsl(142 55% 28%)', fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1 }}>
                          <CheckCircle2 size={10} strokeWidth={2} /> Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Cancel order modal */}
      {cancelTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 55% 18% / 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', maxWidth: '420px', width: '100%', padding: '2rem', border: `1px solid ${A.border}` }}>
            <h3 style={{ fontFamily: A.cinzel, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, marginBottom: '1.25rem' }}>Cancel Order</h3>
            <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.5rem' }}>Reason (optional)</label>
            <textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Guest request, item unavailable..."
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: `1px solid ${A.border}`, fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy, resize: 'none', boxSizing: 'border-box', outline: 'none', marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.75rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>Keep</button>
              <button onClick={doCancel}
                style={{ flex: 1, background: 'hsl(0 60% 48%)', color: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [tab, setTab]                   = useState<AdminGuestTab>('guests');
  const [guests, setGuests]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [checkingOut, setCheckingOut]   = useState<string | null>(null);
  const [earlyTarget, setEarlyTarget]   = useState<any | null>(null);
  const [addRoomTarget, setAddRoomTarget] = useState<any | null>(null);
  const [extendTarget, setExtendTarget] = useState<any | null>(null);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [confirmId, setConfirmId]       = useState<string | null>(null);

  const { orders } = useOrderStore();
  const activeOrderCount = orders.filter((o: any) => o.status === 'pending').length;

  const fetchData = async () => {
    try {
      const [guestsRes, reservationsRes, roomsRes] = await Promise.all([
        api.get('/checkin/active'),
        api.get('/reservations?status=checked_in&limit=200'),
        api.get('/rooms'),
      ]);
      const guestList: any[] = guestsRes.data.guests || [];
      const resList: any[]   = reservationsRes.data.reservations || [];
      const roomList: any[]  = roomsRes.data.rooms || [];

      const reservationMap: Record<string, any> = {};
      for (const r of resList) reservationMap[String(r._id)] = r;
      const roomMap: Record<string, any> = {};
      for (const r of roomList) roomMap[String(r._id)] = r;

      const merged = guestList.map((g: any) => {
        const res = reservationMap[String(g.reservation)] || {};
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

  const filtered  = guests.filter(g => {
    const q = search.toLowerCase();
    return !q || g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Tab definitions
  const tabs: { key: AdminGuestTab; label: string; badge?: number }[] = [
    { key: 'guests', label: 'In-House Guests', badge: guests.length   },
    { key: 'live',   label: 'Live Operations', badge: activeOrderCount },
  ];

  return (
    <>
      <style>{adminTableCss + `@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{ padding: '2rem' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <PageHeader eyebrow="Front Desk" title="In-House Operations" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: A.papyrus, padding: '0.75rem 1.25rem', border: `1px solid ${A.border}` }}>
            <div style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: 'hsl(142 50% 45%)', boxShadow: '0 0 0 3px hsl(142 60% 85%)' }} />
            <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy }}>{guests.length} Checked In</span>
          </div>
        </div>

        {/* ── Tab strip ── */}
        <div style={{ display: 'flex', borderBottom: `2px solid ${A.border}`, marginBottom: '1.75rem' }}>
          {tabs.map(({ key, label, badge }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: active ? A.navy : A.muted,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: active ? `2px solid ${A.gold}` : '2px solid transparent',
                  marginBottom: '-2px',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  transition: 'color 0.15s',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
                {badge !== undefined && badge > 0 && (
                  <span style={{
                    background: key === 'live' && badge > 0 ? 'hsl(38 80% 50%)' : A.navy,
                    color: '#fff', fontFamily: A.raleway, fontWeight: 700, fontSize: '0.58rem',
                    borderRadius: '999px', minWidth: '1.1rem', height: '1.1rem',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.25rem',
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── In-House Guests tab ── */}
        {tab === 'guests' && (
          <>
            <TableFilters
              search={{ value: search, onChange: v => { setSearch(v); setPage(1); }, placeholder: 'Search by name or email…' }}
              resultCount={filtered.length}
              hasActiveFilters={!!search}
              onClear={() => { setSearch(''); setPage(1); }}
            />

            <AdminTable headers={['Guest', 'Room', 'Check-In', 'Check-Out', 'Nights', 'Policy', 'Actions']} minWidth={1100}>
              {loading ? <Spinner />
              : paginated.length === 0 ? <EmptyRow colSpan={7} message={search ? 'No guests match your search' : 'No guests currently checked in'} />
              : paginated.map((g: any) => {
                const res = g._res || {};
                const bookedNights: number = res.totalNights ?? 0;
                const policy: string = res.cancellationPolicy ?? 'flexible';
                return (
                  <AdminRow key={g._id}>
                    <AdminTd>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.navy, marginBottom: '0.15rem' }}>{g.name}</div>
                      <div style={{ fontSize: '0.7rem', color: A.muted }}>{g.email}</div>
                    </AdminTd>
                    <AdminTd>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.navy, marginBottom: '0.15rem' }}>{res.room?.name || '—'}</div>
                      {(res.room?.floorNumber || res.room?.roomNumber) && (
                        <div style={{ fontSize: '0.7rem', color: A.muted }}>
                          {res.room?.floorNumber ? `Floor ${res.room.floorNumber}` : ''}
                          {res.room?.floorNumber && res.room?.roomNumber ? ' · ' : ''}
                          {res.room?.roomNumber ? `Room ${res.room.roomNumber}` : ''}
                        </div>
                      )}
                    </AdminTd>
                    <AdminTd>{res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : '—'}</AdminTd>
                    <AdminTd>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : '—'}</AdminTd>
                    <AdminTd style={{ fontFamily: A.cinzel, color: A.gold }}>{bookedNights || '—'}</AdminTd>
                    <AdminTd>
                      <StatusPill status={policy === 'non_refundable' ? 'non refundable' : 'flexible'} />
                    </AdminTd>
                    <AdminTd>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => setConfirmId(g._id)} disabled={checkingOut === g._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(38 80% 35%)', border: '1px solid hsl(38 80% 70%)', background: 'hsl(38 90% 95%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer', opacity: checkingOut === g._id ? 0.55 : 1, whiteSpace: 'nowrap' }}>
                          <LogOut size={10} strokeWidth={2} />
                          {checkingOut === g._id ? 'Processing…' : 'Check Out'}
                        </button>
                        {bookedNights > 1 && (
                          <button onClick={() => setEarlyTarget({ guestId: g._id, name: g.name, bookedNights, cancellationPolicy: policy })}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(210 70% 35%)', border: '1px solid hsl(210 70% 75%)', background: 'hsl(210 80% 97%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <Clock size={10} strokeWidth={2} /> Early Departure
                          </button>
                        )}
                        <button onClick={() => setAddRoomTarget({ guestId: g._id, name: g.name })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(270 50% 38%)', border: '1px solid hsl(270 50% 75%)', background: 'hsl(270 60% 97%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <BedDouble size={10} strokeWidth={2} /> Add Room
                        </button>
                        <button onClick={() => setExtendTarget({ guestId: g._id, name: g.name, roomName: res.room?.name, pricePerNight: res.room?.pricePerNight ?? 0, checkOutDate: res.checkOutDate })}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(142 50% 28%)', border: '1px solid hsl(142 50% 70%)', background: 'hsl(142 60% 96%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.35rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <CalendarPlus size={10} strokeWidth={2} /> Extend Stay
                        </button>
                      </div>
                    </AdminTd>
                  </AdminRow>
                );
              })}
            </AdminTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}

        {/* ── Live Operations tab ── */}
        {tab === 'live' && <LiveOperationsTab />}

      </div>

      {/* ── Modals ── */}
      {earlyTarget && (
        <EarlyDepartureModal guest={earlyTarget} onClose={() => setEarlyTarget(null)} onDone={() => { setEarlyTarget(null); fetchData(); }} />
      )}
      {addRoomTarget && (
        <AddRoomModal guest={addRoomTarget} onClose={() => setAddRoomTarget(null)} onDone={() => { setAddRoomTarget(null); fetchData(); }} />
      )}
      {extendTarget && (
        <ExtendStayModal guest={extendTarget} onClose={() => setExtendTarget(null)} onDone={() => { setExtendTarget(null); fetchData(); }} />
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
