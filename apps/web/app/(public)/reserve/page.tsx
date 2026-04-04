'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../lib/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;

interface Room {
  _id: string;
  name: string;
  pricePerNight: number;
  images: string[];
  type: string;
}

const STEPS = ['Dates & Room', 'Guest Details', 'Confirmation'] as const;

export default function ReservePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const [form, setForm] = useState({
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 2,
    name: '',
    email: '',
    phone: '',
    idProof: '',
    specialRequests: '',
  });

  useEffect(() => {
    api.get('/rooms?available=true').then(({ data }) => setRooms(data.rooms));
    const roomId   = searchParams.get('room');
    const roomName = searchParams.get('roomName');
    const price    = searchParams.get('price');
    if (roomId) {
      setSelectedRoom({ _id: roomId, name: roomName || '', pricePerNight: Number(price), images: [], type: '' });
    }
  }, [searchParams]);

  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000))
    : 0;

  const totalCost = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

  const handleSubmit = async () => {
    if (!selectedRoom)                         { toast.error('Please select a room'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
    if (!form.name || !form.email || !form.phone) { toast.error('Please fill guest details'); return; }

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

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/hero-bg.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="relative z-10">
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Begin Your Stay</p>
          <h1 className="font-display text-4xl md:text-5xl text-primary-foreground mb-6">Reserve Your Chamber</h1>
          <div className="w-24 h-px bg-gradient-gold mx-auto mb-8" />

          {/* Step indicator */}
          <div className="flex justify-center gap-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={[
                  'w-8 h-8 flex items-center justify-center font-display text-sm transition-all duration-300',
                  step >= i + 1
                    ? 'bg-gradient-gold text-primary'
                    : 'border border-cream-dark/20 text-cream-dark/40',
                ].join(' ')}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`font-display text-xs tracking-wider uppercase hidden sm:block ${step === i + 1 ? 'text-gold' : 'text-cream-dark/40'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Check-In Date"
                type="date"
                value={form.checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
              />
              <Input
                label="Check-Out Date"
                type="date"
                value={form.checkOutDate}
                min={form.checkInDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
              />
            </div>
            <Input
              label="Number of Guests"
              type="number"
              min={1}
              max={4}
              value={form.numberOfGuests}
              onChange={(e) => setForm({ ...form, numberOfGuests: Number(e.target.value) })}
            />

            <div className="w-full h-px bg-gradient-to-r from-transparent via-gold to-transparent my-8" />
            <h2 className="font-display text-foreground tracking-widest uppercase text-sm mb-6">Select Your Chamber</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={[
                    'text-left border-2 transition-all duration-300 overflow-hidden group',
                    selectedRoom?._id === room._id
                      ? 'border-gold shadow-gold'
                      : 'border-border hover:border-gold/50',
                  ].join(' ')}
                >
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={room.images?.[0] || '/room-deluxe.jpg'}
                      alt={room.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {selectedRoom?._id === room._id && (
                      <div className="absolute top-2 right-2 bg-gradient-gold text-primary w-7 h-7 flex items-center justify-center font-bold text-sm">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-card">
                    <p className="font-display text-foreground text-sm tracking-wider">{room.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-body text-xs text-muted-foreground uppercase">{room.type}</span>
                      <span className="font-display text-secondary text-sm">${room.pricePerNight}<span className="text-muted-foreground text-xs">/night</span></span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedRoom && nights > 0 && (
              <div className="bg-primary p-6 border border-gold/20">
                <div className="flex justify-between items-center">
                  <span className="text-cream-dark/70 font-display text-xs tracking-wider uppercase">
                    {selectedRoom.name} × {nights} nights
                  </span>
                  <span className="font-display text-gold text-xl">${totalCost.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  if (!selectedRoom)                           { toast.error('Please select a room'); return; }
                  if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
                  setStep(2);
                }}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-primary p-4 border border-gold/20 flex justify-between items-center">
              <span className="text-cream-dark/70 font-display text-xs tracking-wider uppercase">
                {selectedRoom?.name} · {nights} nights
              </span>
              <span className="font-display text-gold">${totalCost.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="As on ID"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="ID / Passport (optional)"
                value={form.idProof}
                onChange={(e) => setForm({ ...form, idProof: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-display tracking-widest uppercase text-foreground block mb-1.5">
                Special Requests
              </label>
              <textarea
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                rows={3}
                placeholder="Dietary requirements, room preferences, celebrations..."
                className="w-full px-4 py-3 border border-border focus:border-gold outline-none text-foreground font-elegant text-base resize-none bg-card transition-colors duration-200"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="primary" loading={loading} onClick={handleSubmit}>Confirm Reservation</Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && confirmation && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 text-secondary">𓂀</div>
            <h2 className="font-display text-3xl text-foreground mb-2">Reservation Confirmed</h2>
            <div className="w-24 h-px bg-gradient-gold mx-auto my-6" />
            <p className="font-elegant text-muted-foreground text-lg italic mb-8">
              A confirmation has been sent to <strong>{form.email}</strong>
            </p>
            <div className="bg-primary p-8 border border-gold/20 text-left max-w-md mx-auto mb-8">
              <div className="space-y-3">
                {[
                  ['Reservation ID', confirmation._id?.slice(-8).toUpperCase()],
                  ['Room',           selectedRoom?.name],
                  ['Check-In',       new Date(form.checkInDate).toDateString()],
                  ['Check-Out',      new Date(form.checkOutDate).toDateString()],
                  ['Total Nights',   nights],
                  ['Total',          `$${totalCost.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-gold/10 pb-2">
                    <span className="font-display text-xs tracking-wider uppercase text-cream-dark/50">{k}</span>
                    <span className="font-body text-sm text-gold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="primary" onClick={() => router.push('/')}>Return Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}
