'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { PartyPopper } from 'lucide-react';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

type Step = 1 | 2 | 3;
interface Room { _id: string; name: string; pricePerNight: number; images: string[]; type: string; }
const STEPS = ['Dates & Room', 'Guest Details', 'Confirmation'] as const;

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [preSelected, setPreSelected] = useState(false); // came from room detail page
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const [form, setForm] = useState({
    checkInDate: '', checkOutDate: '', numberOfGuests: 2,
    name: '', email: '', phone: '', idProof: '', specialRequests: '',
  });

  useEffect(() => {
    const roomId = searchParams.get('room');
    const roomName = searchParams.get('roomName');
    const price = searchParams.get('price');
    // Pre-select from URL immediately so submission works even before rooms list loads
    if (roomId) {
      setSelectedRoom({ _id: roomId, name: roomName || '', pricePerNight: Number(price), images: [], type: '' });
      setPreSelected(true);
    }
    api.get('/rooms?available=true').then(({ data }) => {
      const list: Room[] = data.rooms || [];
      setRooms(list);
      // Enrich pre-selected room with full data once list loads
      if (roomId) {
        const full = list.find(r => r._id === roomId);
        if (full) setSelectedRoom(full);
      }
    }).catch(() => {});
  }, [searchParams]);

  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000))
    : 0;
  const totalCost = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

  const handleSubmit = async () => {
    if (!selectedRoom)                          { toast.error('Please select a room'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
    if (!form.name || !form.email || !form.phone){ toast.error('Please fill guest details'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/reservations', {
        guest: { name: form.name, email: form.email, phone: form.phone, idProof: form.idProof },
        room: selectedRoom._id,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        numberOfGuests: form.numberOfGuests,
        specialRequests: form.specialRequests,
      });
      setConfirmation(data.reservation);
      setStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <style>{`
        .res-input:focus{border-color:hsl(43 72% 55%)!important;}
        .room-sel{background:#fff;border:2px solid hsl(35 25% 82%);overflow:hidden;cursor:pointer;transition:border-color 0.3s,box-shadow 0.3s;text-align:left;}
        .room-sel:hover{border-color:hsl(43 72% 55%/0.5);}
        .room-sel.active{border-color:hsl(43 72% 55%);box-shadow:0 0 0 3px hsl(43 72% 55%/0.15);}
        .room-sel-img{transition:transform 0.7s ease;}
        .room-sel:hover .room-sel-img{transform:scale(1.05);}
        .res-btn-primary{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2.5rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;}
        .res-btn-primary:hover{opacity:0.88;}
        .res-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
        .res-btn-secondary{background:transparent;color:hsl(220 15% 40%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2rem;border:1px solid hsl(35 25% 82%);cursor:pointer;transition:border-color 0.2s,color 0.2s;}
        .res-btn-secondary:hover{border-color:hsl(43 72% 55%/0.4);color:hsl(220 55% 18%);}
      `}</style>

      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: S.cream }}>
        {/* Header */}
        <div style={{ position: 'relative', background: S.navy, padding: '4rem 1.5rem', textAlign: 'center', overflow: 'hidden' }}>
          <Image src="/hero-bg.jpg" alt="" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.15 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Begin Your Stay</p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Reserve Your Chamber</h1>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 2rem' }} />

            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', alignItems: 'center' }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{
                    width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: S.cinzel, fontSize: '0.82rem', fontWeight: 600,
                    background: step >= i + 1 ? S.gradGold : 'transparent',
                    color: step >= i + 1 ? S.navy : 'rgba(245,236,215,0.3)',
                    border: step >= i + 1 ? 'none' : '1px solid rgba(245,236,215,0.2)',
                    transition: 'all 0.3s',
                  }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontFamily: S.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                    color: step === i + 1 ? S.gold : 'rgba(245,236,215,0.35)',
                    display: 'none',
                  }} className="step-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem' }}>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div>
              {/* Date inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Check-In Date</label>
                  <input type="date" className="res-input" style={inputStyle}
                    value={form.checkInDate} min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Check-Out Date</label>
                  <input type="date" className="res-input" style={inputStyle}
                    value={form.checkOutDate}
                    min={form.checkInDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '2.5rem', maxWidth: '18rem' }}>
                <label style={labelStyle}>Number of Guests</label>
                <input type="number" className="res-input" style={inputStyle}
                  min={1} max={4} value={form.numberOfGuests}
                  onChange={(e) => setForm({ ...form, numberOfGuests: Number(e.target.value) })} />
              </div>

              <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '2rem' }} />

              {preSelected && selectedRoom ? (
                /* Room already chosen — show locked summary card */
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#fff', border: `2px solid ${S.gold}`, padding: '1rem 1.25rem', marginBottom: '2rem', boxShadow: `0 0 0 3px hsl(43 72% 55% / 0.12)` }}>
                  {selectedRoom.images?.[0] && (
                    <div style={{ position: 'relative', width: '6rem', height: '4.5rem', flexShrink: 0, overflow: 'hidden' }}>
                      <Image src={selectedRoom.images[0]} alt={selectedRoom.name} fill sizes="96px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: S.cinzel, fontSize: '0.88rem', color: S.navy, marginBottom: '0.25rem' }}>{selectedRoom.name}</p>
                    <p style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted, textTransform: 'capitalize' }}>{selectedRoom.type} · ${selectedRoom.pricePerNight}/night</p>
                  </div>
                  <div style={{ background: S.gradGold, color: S.navy, width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>✓</div>
                </div>
              ) : (
                /* No room pre-selected — show full picker */
                <>
                  <h2 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.navy, marginBottom: '1.5rem' }}>Select Your Chamber</h2>
                  {rooms.length === 0 ? (
                    <p style={{ fontFamily: S.raleway, color: S.muted, fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>Loading available rooms...</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                      {rooms.map((room) => (
                        <button key={room._id} className={`room-sel${selectedRoom?._id === room._id ? ' active' : ''}`}
                          onClick={() => setSelectedRoom(room)} style={{ width: '100%' }}>
                          <div style={{ position: 'relative', height: '10rem', overflow: 'hidden' }}>
                            <Image src={room.images?.[0] || '/room-deluxe.jpg'} alt={room.name} fill sizes="(max-width: 768px) 100vw, 280px" className="room-sel-img" style={{ objectFit: 'cover' }} />
                            {selectedRoom?._id === room._id && (
                              <div style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', background: S.gradGold, color: S.navy, width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>✓</div>
                            )}
                          </div>
                          <div style={{ padding: '0.875rem 1rem' }}>
                            <p style={{ fontFamily: S.cinzel, fontSize: '0.78rem', color: S.navy, marginBottom: '0.35rem' }}>{room.name}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: S.raleway, fontSize: '0.7rem', color: S.muted, textTransform: 'capitalize' }}>{room.type}</span>
                              <span style={{ fontFamily: S.cinzel, fontSize: '0.85rem', color: S.gold }}>${room.pricePerNight}<span style={{ fontSize: '0.65rem', color: S.muted }}>/night</span></span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedRoom && nights > 0 && (
                <div style={{ background: S.navy, padding: '1.25rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                    {selectedRoom.name} × {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontFamily: S.cinzel, fontSize: '1.25rem', color: S.gold, fontWeight: 600 }}>${totalCost.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="res-btn-primary" onClick={() => {
                  if (!selectedRoom)                          { toast.error('Please select a room'); return; }
                  if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
                  setStep(2);
                }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              {/* Summary bar */}
              <div style={{ background: S.navy, padding: '1rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                  {selectedRoom?.name} · {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span style={{ fontFamily: S.cinzel, fontSize: '1.1rem', color: S.gold, fontWeight: 600 }}>${totalCost.toLocaleString()}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input className="res-input" style={inputStyle} placeholder="As on ID"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" className="res-input" style={inputStyle}
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" className="res-input" style={inputStyle}
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>ID / Passport (optional)</label>
                  <input className="res-input" style={inputStyle}
                    value={form.idProof} onChange={(e) => setForm({ ...form, idProof: e.target.value })} />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Special Requests</label>
                <textarea className="res-input" style={{ ...inputStyle, resize: 'none' }} rows={3}
                  placeholder="Dietary requirements, room preferences, celebrations..."
                  value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="res-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="res-btn-primary" disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Processing...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && confirmation && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: S.gold, marginBottom: '1rem' }}><PartyPopper size={56} strokeWidth={1.2} /></div>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: S.navy, marginBottom: '0.75rem' }}>Reservation Confirmed</h2>
              <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '1.25rem auto' }} />
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1.1rem', marginBottom: '2.5rem' }}>
                A confirmation has been sent to <strong>{form.email}</strong>
              </p>

              <div style={{ background: S.navy, padding: '2rem', border: `1px solid hsl(43 72% 55% / 0.2)`, maxWidth: '28rem', margin: '0 auto 2.5rem', textAlign: 'left' }}>
                {[
                  ['Reservation ID', confirmation._id?.slice(-8).toUpperCase()],
                  ['Room',           selectedRoom?.name],
                  ['Check-In',       new Date(form.checkInDate).toDateString()],
                  ['Check-Out',      new Date(form.checkOutDate).toDateString()],
                  ['Total Nights',   String(nights)],
                  ['Total',          `$${totalCost.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid hsl(43 72% 55% / 0.1)', paddingBottom: '0.625rem', marginBottom: '0.625rem' }}>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.45)' }}>{k}</span>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.85rem', color: S.gold }}>{v}</span>
                  </div>
                ))}
              </div>

              <button className="res-btn-primary" onClick={() => router.push('/')}>Return Home</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={null}>
      <ReserveContent />
    </Suspense>
  );
}
