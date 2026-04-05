'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Clock, Sparkles, X, CalendarDays, CheckCircle2, XCircle, Hourglass } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 14%)';
const CREAM  = 'hsl(40 33% 96%)';
const PAPER  = 'hsl(38 40% 92%)';
const MUTED  = 'hsl(220 15% 45%)';
const BORDER = 'hsl(35 25% 82%)';
const CINZEL  = "'Cinzel', serif" as const;
const RALEWAY = "'Raleway', sans-serif" as const;

const BOOKING_STATUS: Record<string, { bg: string; color: string; Icon: any }> = {
  pending:   { bg: 'hsl(38 90% 94%)',  color: 'hsl(38 80% 35%)',  Icon: Hourglass    },
  confirmed: { bg: 'hsl(210 80% 94%)', color: 'hsl(210 70% 35%)', Icon: CheckCircle2 },
  completed: { bg: 'hsl(142 60% 92%)', color: 'hsl(142 50% 28%)', Icon: CheckCircle2 },
  cancelled: { bg: 'hsl(0 70% 94%)',   color: 'hsl(0 60% 40%)',   Icon: XCircle      },
};

export default function SpaPage() {
  const [services, setServices]     = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selected, setSelected]     = useState<any>(null);
  const [date, setDate]             = useState('');
  const [slots, setSlots]           = useState<any[]>([]);
  const [pickedSlot, setPickedSlot] = useState('');
  const [loading, setLoading]       = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    api.get('/spa/services').then(({ data }) => setServices(data.services));
    api.get('/spa/bookings/my').then(({ data }) => setMyBookings(data.bookings));
  }, []);

  const fetchSlots = async (serviceId: string, d: string) => {
    if (!d) return;
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/spa/availability?serviceId=${serviceId}&date=${d}`);
      setSlots(data.available);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selected || !date || !pickedSlot) { toast.error('Please select date and time'); return; }
    setLoading(true);
    try {
      await api.post('/spa/book', { service: selected._id, date, startTime: pickedSlot });
      toast.success('Spa session booked!');
      setSelected(null);
      const { data } = await api.get('/spa/bookings/my');
      setMyBookings(data.bookings);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .spa-card:hover { box-shadow: 0 6px 24px -4px hsl(220 55% 14% / 0.12); transform: translateY(-1px); }
        .slot-btn:hover { border-color: ${GOLD} !important; color: ${NAVY} !important; background: ${GOLD}18 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ background: CREAM, minHeight: '100vh', paddingBottom: '5rem' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ background: NAVY, padding: '2rem 1.5rem 1.75rem', textAlign: 'center' }}>
          <p style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.58rem', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ancient Rituals</p>
          <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.6rem', lineHeight: 1.2, marginBottom: '1rem' }}>Cleopatra's Spa</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50)` }} />
            <span style={{ color: GOLD, fontSize: '0.9rem' }}>𓆉</span>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}50)` }} />
          </div>
        </div>

        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem 1rem' }}>

          {/* ── Services ──────────────────────────────────────────────────── */}
          <p style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, marginBottom: '1rem' }}>Our Treatments</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2.5rem' }}>
            {services.map(service => (
              <div key={service._id} className="spa-card"
                style={{ background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', overflow: 'hidden', transition: 'box-shadow 0.25s, transform 0.25s' }}>
                {/* Image */}
                <div style={{ position: 'relative', width: '8rem', flexShrink: 0 }}>
                  <Image src={service.image || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400'} alt={service.name} fill style={{ objectFit: 'cover' }} />
                  {/* Category tag */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `${NAVY}cc`, padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                    <span style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: `${GOLD}cc` }}>{service.category}</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.85rem', letterSpacing: '0.05em', fontWeight: 600, lineHeight: 1.3 }}>{service.name}</h3>
                      <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>${service.price}</span>
                    </div>
                    <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{service.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: MUTED }}>
                      <Clock size={11} strokeWidth={1.8} />
                      <span style={{ fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.08em' }}>{service.duration} min</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(service); setDate(''); setSlots([]); setPickedSlot(''); }}
                    style={{ marginTop: '0.875rem', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}60`, background: 'transparent', padding: '0.45rem 1.1rem', cursor: 'pointer', transition: 'all 0.18s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start', fontWeight: 600 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.color = NAVY; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = GOLD; }}>
                    <Sparkles size={11} strokeWidth={2} /> Book Session
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── My Bookings ───────────────────────────────────────────────── */}
          {myBookings.length > 0 && (
            <div>
              <p style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, marginBottom: '1rem' }}>My Bookings</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {myBookings.map((booking: any) => {
                  const sc = BOOKING_STATUS[booking.status] || BOOKING_STATUS.pending;
                  const StatusIcon = sc.Icon;
                  return (
                    <div key={booking._id} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>{booking.service?.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: MUTED }}>
                          <CalendarDays size={11} strokeWidth={1.8} />
                          <span style={{ fontFamily: RALEWAY, fontSize: '0.75rem' }}>{new Date(booking.date).toDateString()} · {booking.startTime}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.95rem', fontWeight: 700 }}>${booking.price}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: sc.bg, color: sc.color, fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', fontWeight: 700 }}>
                          <StatusIcon size={10} strokeWidth={2} /> {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Modal ────────────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 8% / 0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '42rem', background: '#fff', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.25s ease' }}>

            {/* Modal header */}
            <div style={{ background: NAVY, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }}>
              <div>
                <p style={{ fontFamily: CINZEL, color: `${GOLD}99`, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Book Session</p>
                <h2 style={{ fontFamily: CINZEL, color: 'hsl(40 30% 94%)', fontSize: '1rem' }}>{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'hsl(40 30% 85% / 0.4)', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Service summary */}
              <div style={{ background: PAPER, border: `1px solid ${BORDER}`, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.78rem', lineHeight: 1.5 }}>{selected.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', color: MUTED }}>
                    <Clock size={11} strokeWidth={1.8} />
                    <span style={{ fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.08em' }}>{selected.duration} min · {selected.category}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1.3rem', fontWeight: 700, flexShrink: 0, marginLeft: '1rem' }}>${selected.price}</span>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50, transparent)`, marginBottom: '1.5rem' }} />

              {/* Date picker */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select Date</label>
                <div style={{ position: 'relative' }}>
                  <CalendarDays size={15} color={GOLD} strokeWidth={1.8} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setDate(e.target.value); setPickedSlot(''); fetchSlots(selected._id, e.target.value); }}
                    style={{ width: '100%', padding: '0.75rem 0.875rem 0.75rem 2.5rem', border: `1px solid ${BORDER}`, outline: 'none', fontFamily: RALEWAY, fontSize: '0.85rem', color: NAVY, background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }} />
                </div>
              </div>

              {/* Time slots */}
              {date && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Available Slots</label>
                  {slotsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <div style={{ width: '1.5rem', height: '1.5rem', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    </div>
                  ) : slots.length === 0 ? (
                    <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.72rem', letterSpacing: '0.08em', padding: '0.875rem', background: PAPER, border: `1px solid ${BORDER}`, textAlign: 'center' }}>No available slots for this date</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {slots.map((slot: any) => (
                        <button key={slot.startTime} className="slot-btn" onClick={() => setPickedSlot(slot.startTime)}
                          style={{ fontFamily: CINZEL, fontSize: '0.72rem', letterSpacing: '0.05em', padding: '0.65rem 0.5rem', border: `1px solid`, cursor: 'pointer', transition: 'all 0.18s', background: pickedSlot === slot.startTime ? GOLD : 'transparent', color: pickedSlot === slot.startTime ? NAVY : NAVY, borderColor: pickedSlot === slot.startTime ? GOLD : `${GOLD}40`, fontWeight: pickedSlot === slot.startTime ? 700 : 400 }}>
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50, transparent)`, marginBottom: '1.25rem' }} />

              {/* Confirm button */}
              <button onClick={handleBook} disabled={!pickedSlot || loading}
                style={{ width: '100%', background: !pickedSlot ? PAPER : `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: !pickedSlot ? MUTED : NAVY, fontFamily: CINZEL, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem', border: `1px solid ${!pickedSlot ? BORDER : 'transparent'}`, cursor: !pickedSlot ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
                {loading ? 'Confirming...' : pickedSlot ? `Confirm Booking · $${selected.price}` : 'Select a Time Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
