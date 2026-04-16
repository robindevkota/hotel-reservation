'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Clock, Sparkles, X, CalendarDays, CheckCircle2, XCircle, Hourglass, Sun, Sunset, Moon, ChevronRight } from 'lucide-react';
import { useActiveOffer } from '../../../../hooks/useActiveOffer';
import OfferBanner from '../../../../components/ui/OfferBanner';

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 14%)';
const CREAM  = 'hsl(40 33% 96%)';
const PAPER  = 'hsl(38 40% 92%)';
const MUTED  = 'hsl(220 15% 45%)';
const BORDER = 'hsl(35 25% 82%)';
const CINZEL  = "'Cinzel', serif" as const;
const RALEWAY = "'Raleway', sans-serif" as const;

// ── Window options ─────────────────────────────────────────────────────────────
type SpaWindow = 'morning' | 'afternoon' | 'evening' | 'any';

const WINDOWS: Array<{
  key: SpaWindow;
  label: string;
  hours: string;
  icon: React.ReactNode;
  gradient: string;
}> = [
  {
    key: 'morning',
    label: 'Morning',
    hours: '09:00 – 12:00',
    icon: <Sun size={18} strokeWidth={1.5} />,
    gradient: 'linear-gradient(135deg, hsl(43 80% 96%), hsl(43 80% 90%))',
  },
  {
    key: 'afternoon',
    label: 'Afternoon',
    hours: '13:00 – 17:00',
    icon: <Sunset size={18} strokeWidth={1.5} />,
    gradient: 'linear-gradient(135deg, hsl(25 80% 96%), hsl(25 80% 90%))',
  },
  {
    key: 'evening',
    label: 'Evening',
    hours: '18:00 – 21:00',
    icon: <Moon size={18} strokeWidth={1.5} />,
    gradient: 'linear-gradient(135deg, hsl(220 40% 96%), hsl(220 40% 90%))',
  },
];

const BOOKING_STATUS: Record<string, { bg: string; color: string; Icon: any }> = {
  pending:     { bg: 'hsl(38 90% 94%)',  color: 'hsl(38 80% 35%)',  Icon: Hourglass    },
  confirmed:   { bg: 'hsl(210 80% 94%)', color: 'hsl(210 70% 35%)', Icon: CheckCircle2 },
  arrived:     { bg: 'hsl(270 60% 94%)', color: 'hsl(270 50% 35%)', Icon: CheckCircle2 },
  in_progress: { bg: 'hsl(142 60% 92%)', color: 'hsl(142 50% 28%)', Icon: CheckCircle2 },
  completed:   { bg: 'hsl(142 60% 92%)', color: 'hsl(142 50% 28%)', Icon: CheckCircle2 },
  cancelled:   { bg: 'hsl(0 70% 94%)',   color: 'hsl(0 60% 40%)',   Icon: XCircle      },
};

// Step in the booking modal
type Step = 'date' | 'window' | 'slots' | 'confirm';

export default function SpaPage() {
  const [services, setServices]         = useState<any[]>([]);
  const [myBookings, setMyBookings]     = useState<any[]>([]);
  const [selected, setSelected]         = useState<any>(null);

  // Booking wizard state
  const [step, setStep]                 = useState<Step>('date');
  const [date, setDate]                 = useState('');
  const [pickedWindow, setPickedWindow] = useState<SpaWindow | null>(null);
  const [windows, setWindows]           = useState<any[]>([]);
  const [slots, setSlots]               = useState<any[]>([]);
  const [pickedSlot, setPickedSlot]     = useState('');   // optional time hint
  const [loading, setLoading]           = useState(false);
  const [windowsLoading, setWindowsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    api.get('/spa/services').then(({ data }) => setServices(data.services));
    api.get('/spa/bookings/my').then(({ data }) => setMyBookings(data.bookings));
  }, []);

  const openModal = (service: any) => {
    setSelected(service);
    setStep('date');
    setDate('');
    setPickedWindow(null);
    setWindows([]);
    setSlots([]);
    setPickedSlot('');
  };

  const handleDateConfirm = async () => {
    if (!date || !selected) return;
    setWindowsLoading(true);
    try {
      const { data } = await api.get(`/spa/windows?serviceId=${selected._id}&date=${date}`);
      setWindows(data.windows || []);
      setStep('window');
    } catch {
      toast.error('Failed to load availability');
    } finally {
      setWindowsLoading(false);
    }
  };

  const handleWindowPick = async (w: SpaWindow) => {
    setPickedWindow(w);
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/spa/availability?serviceId=${selected._id}&date=${date}&window=${w}`);
      setSlots(data.available || []);
      setStep('slots');
    } catch {
      toast.error('Failed to load time slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selected || !date || !pickedWindow) { toast.error('Please complete all steps'); return; }
    setLoading(true);
    try {
      await api.post('/spa/book', {
        service: selected._id,
        date,
        window: pickedWindow,
        ...(pickedSlot ? { startTime: pickedSlot } : {}),
      });
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

  const windowInfo = WINDOWS.find(w => w.key === pickedWindow);

  const { offer } = useActiveOffer();
  const spaMultiplier = offer?.spaDiscount ? (1 - offer.spaDiscount / 100) : 1;
  const spaPrice = (p: number) => Math.round(p * spaMultiplier * 100) / 100;

  return (
    <>
      <style>{`
        .spa-card:hover { box-shadow: 0 6px 24px -4px hsl(220 55% 14% / 0.12); transform: translateY(-1px); }
        .window-btn:hover { border-color: ${GOLD} !important; }
        .slot-btn:hover { border-color: ${GOLD} !important; background: ${GOLD}14 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ background: CREAM, minHeight: '100vh', paddingBottom: '5rem' }}>
        <OfferBanner filter="spa" />

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
                <div style={{ position: 'relative', width: '8rem', flexShrink: 0 }}>
                  <Image src={service.image || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400'} alt={service.name} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `${NAVY}cc`, padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                    <span style={{ fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: `${GOLD}cc` }}>{service.category}</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.85rem', letterSpacing: '0.05em', fontWeight: 600, lineHeight: 1.3 }}>{service.name}</h3>
                      <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                        NPR {spaPrice(service.price)}
                        {spaMultiplier < 1 && <span style={{ fontSize: '0.68rem', color: MUTED, textDecoration: 'line-through', marginLeft: '0.3rem' }}>NPR {service.price}</span>}
                      </span>
                    </div>
                    <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{service.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: MUTED }}>
                      <Clock size={11} strokeWidth={1.8} />
                      <span style={{ fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.08em' }}>{service.duration} min</span>
                    </div>
                  </div>
                  <button onClick={() => openModal(service)}
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
                          <span style={{ fontFamily: RALEWAY, fontSize: '0.75rem' }}>
                            {new Date(booking.date).toDateString()} · {booking.scheduledStart}
                            {booking.window && booking.window !== 'any' && (
                              <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>({booking.window})</span>
                            )}
                          </span>
                        </div>
                        {booking.therapist?.name && (
                          <div style={{ fontFamily: CINZEL, fontSize: '0.6rem', color: MUTED, marginTop: '0.2rem', letterSpacing: '0.05em' }}>
                            with {booking.therapist.name}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.95rem', fontWeight: 700 }}>NPR {booking.price}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: sc.bg, color: sc.color, fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', fontWeight: 700 }}>
                          <StatusIcon size={10} strokeWidth={2} /> {booking.status.replace('_', ' ')}
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
          <div style={{ position: 'relative', width: '100%', maxWidth: '42rem', background: '#fff', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.25s ease' }}>

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
                <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1.3rem', fontWeight: 700, flexShrink: 0, marginLeft: '1rem' }}>
                  NPR {spaPrice(selected.price)}
                  {spaMultiplier < 1 && <span style={{ fontSize: '0.8rem', color: MUTED, textDecoration: 'line-through', marginLeft: '0.4rem' }}>NPR {selected.price}</span>}
                </span>
              </div>

              {/* Step progress pills */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['date', 'window', 'slots', 'confirm'] as Step[]).map((s, i) => {
                  const stepIdx = ['date', 'window', 'slots', 'confirm'].indexOf(step);
                  const thisIdx = i;
                  const done = thisIdx < stepIdx;
                  const active = thisIdx === stepIdx;
                  return (
                    <div key={s} style={{ flex: 1, height: '3px', background: done || active ? GOLD : `${GOLD}30`, transition: 'background 0.3s' }} />
                  );
                })}
              </div>

              {/* ── STEP 1: Date ── */}
              {step === 'date' && (
                <div>
                  <label style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Select Date
                  </label>
                  <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                    <CalendarDays size={15} color={GOLD} strokeWidth={1.8} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
                      onChange={e => setDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 0.875rem 0.75rem 2.5rem', border: `1px solid ${BORDER}`, outline: 'none', fontFamily: RALEWAY, fontSize: '0.85rem', color: NAVY, background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }} />
                  </div>
                  <button onClick={handleDateConfirm} disabled={!date || windowsLoading}
                    style={{ width: '100%', background: date ? `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))` : PAPER, color: date ? NAVY : MUTED, fontFamily: CINZEL, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem', border: `1px solid ${date ? 'transparent' : BORDER}`, cursor: date ? 'pointer' : 'not-allowed', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: windowsLoading ? 0.7 : 1 }}>
                    {windowsLoading
                      ? <><div style={{ width: '1rem', height: '1rem', border: `2px solid ${NAVY}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking availability…</>
                      : <>{date ? 'Choose Time of Day' : 'Pick a Date'} {date && <ChevronRight size={14} />}</>
                    }
                  </button>
                </div>
              )}

              {/* ── STEP 2: Window picker ── */}
              {step === 'window' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, fontWeight: 600, marginBottom: '0.25rem' }}>When would you like your session?</p>
                    <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem' }}>
                      A therapist will be assigned to the earliest available slot within your chosen period.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {WINDOWS.map(w => {
                      const winData = windows.find((wd: any) => wd.window === w.key);
                      const avail = winData?.available ?? 0;
                      const earliest = winData?.earliest ?? '';
                      const isUnavailable = avail === 0;
                      return (
                        <button key={w.key} className="window-btn"
                          onClick={() => !isUnavailable && handleWindowPick(w.key)}
                          disabled={isUnavailable}
                          style={{
                            background: isUnavailable ? PAPER : w.gradient,
                            border: `1px solid ${isUnavailable ? BORDER : GOLD}40`,
                            padding: '1rem 1.25rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: isUnavailable ? 'not-allowed' : 'pointer',
                            opacity: isUnavailable ? 0.5 : 1,
                            transition: 'border-color 0.18s, box-shadow 0.18s',
                            textAlign: 'left',
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ color: isUnavailable ? MUTED : GOLD }}>{w.icon}</span>
                            <div>
                              <div style={{ fontFamily: CINZEL, fontSize: '0.85rem', color: NAVY, fontWeight: 600 }}>{w.label}</div>
                              <div style={{ fontFamily: CINZEL, fontSize: '0.6rem', color: MUTED, letterSpacing: '0.05em' }}>{w.hours}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {isUnavailable ? (
                              <span style={{ fontFamily: CINZEL, fontSize: '0.6rem', color: MUTED, letterSpacing: '0.06em' }}>Fully booked</span>
                            ) : (
                              <>
                                <div style={{ fontFamily: CINZEL, fontSize: '0.75rem', color: GOLD, fontWeight: 700 }}>{avail} slots</div>
                                {earliest && <div style={{ fontFamily: CINZEL, fontSize: '0.6rem', color: MUTED }}>Earliest: {earliest}</div>}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setStep('date')}
                    style={{ background: 'none', border: 'none', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.1em', color: MUTED, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    ← Change date
                  </button>
                </div>
              )}

              {/* ── STEP 3: Optional slot hint ── */}
              {step === 'slots' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, fontWeight: 600, marginBottom: '0.25rem' }}>
                      {windowInfo?.label} · {windowInfo?.hours}
                    </p>
                    <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem' }}>
                      Prefer a specific time? Tap one — otherwise we'll assign the earliest available.
                    </p>
                  </div>

                  {slotsLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div style={{ width: '1.5rem', height: '1.5rem', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    </div>
                  ) : slots.length === 0 ? (
                    <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.72rem', letterSpacing: '0.08em', padding: '0.875rem', background: PAPER, border: `1px solid ${BORDER}`, textAlign: 'center', marginBottom: '1.25rem' }}>
                      No slots available for this window
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      {/* "No preference" option */}
                      <button className="slot-btn"
                        onClick={() => setPickedSlot('')}
                        style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.04em', padding: '0.65rem 0.5rem', border: `1px solid`, cursor: 'pointer', transition: 'all 0.18s', background: pickedSlot === '' ? GOLD : PAPER, color: pickedSlot === '' ? NAVY : MUTED, borderColor: pickedSlot === '' ? GOLD : BORDER, fontWeight: pickedSlot === '' ? 700 : 400, gridColumn: '1 / -1' }}>
                        Any time (earliest available)
                      </button>
                      {slots.map((slot: any) => (
                        <button key={slot.startTime} className="slot-btn"
                          onClick={() => setPickedSlot(slot.startTime)}
                          style={{ fontFamily: CINZEL, fontSize: '0.72rem', letterSpacing: '0.05em', padding: '0.65rem 0.5rem', border: `1px solid`, cursor: 'pointer', transition: 'all 0.18s', background: pickedSlot === slot.startTime ? GOLD : 'transparent', color: NAVY, borderColor: pickedSlot === slot.startTime ? GOLD : `${GOLD}40`, fontWeight: pickedSlot === slot.startTime ? 700 : 400 }}>
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50, transparent)`, marginBottom: '1.25rem' }} />

                  <button onClick={() => setStep('confirm')} disabled={slots.length === 0}
                    style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: NAVY, fontFamily: CINZEL, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem', border: 'none', cursor: slots.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: slots.length === 0 ? 0.5 : 1 }}>
                    Review Booking <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setStep('window')}
                    style={{ background: 'none', border: 'none', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.1em', color: MUTED, cursor: 'pointer', textDecoration: 'underline', padding: '0.75rem 0 0', width: '100%', textAlign: 'center' }}>
                    ← Change time of day
                  </button>
                </div>
              )}

              {/* ── STEP 4: Confirm ── */}
              {step === 'confirm' && (
                <div>
                  <p style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, fontWeight: 600, marginBottom: '1rem' }}>Booking Summary</p>

                  <div style={{ background: PAPER, border: `1px solid ${BORDER}`, padding: '1.25rem', marginBottom: '1.5rem' }}>
                    {[
                      ['Treatment', selected.name],
                      ['Date', new Date(date).toDateString()],
                      ['Time of Day', windowInfo ? `${windowInfo.label} (${windowInfo.hours})` : '—'],
                      ['Your Preference', pickedSlot || 'Earliest available'],
                      ['Duration', `${selected.duration} min`],
                      ['Price', spaMultiplier < 1 ? `NPR ${spaPrice(selected.price)} (was NPR ${selected.price})` : `NPR ${selected.price}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '0.6rem', marginBottom: '0.6rem', borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>{k}</span>
                        <span style={{ fontFamily: CINZEL, fontSize: '0.78rem', color: NAVY, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.72rem', lineHeight: 1.5, marginBottom: '1.25rem', textAlign: 'center' }}>
                    A therapist will be assigned and your exact session time confirmed shortly.
                  </p>

                  <button onClick={handleBook} disabled={loading}
                    style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: NAVY, fontFamily: CINZEL, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {loading
                      ? <><div style={{ width: '1rem', height: '1rem', border: `2px solid ${NAVY}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Confirming…</>
                      : <><Sparkles size={13} /> Confirm · NPR {spaPrice(selected.price)}</>
                    }
                  </button>
                  <button onClick={() => setStep('slots')}
                    style={{ background: 'none', border: 'none', fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.1em', color: MUTED, cursor: 'pointer', textDecoration: 'underline', padding: '0.75rem 0 0', width: '100%', textAlign: 'center' }}>
                    ← Change preference
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
