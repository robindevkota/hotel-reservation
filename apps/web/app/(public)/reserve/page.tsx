'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../lib/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import GoldDivider from '../../../components/ui/GoldDivider';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;

interface Room { _id: string; name: string; pricePerNight: number; images: string[]; type: string; }

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
    const roomId = searchParams.get('room');
    const roomName = searchParams.get('roomName');
    const price = searchParams.get('price');
    if (roomId) {
      setSelectedRoom({ _id: roomId, name: roomName || '', pricePerNight: Number(price), images: [], type: '' });
      setStep(1);
    }
  }, [searchParams]);

  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000))
    : 0;

  const totalCost = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

  const handleSubmit = async () => {
    if (!selectedRoom) { toast.error('Please select a room'); return; }
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
    <div className="pt-20 min-h-screen bg-[#F5ECD7]">
      <div className="bg-[#0D1B3E] py-16 text-center">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-2">Begin Your Stay</p>
        <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-4xl">Reserve Your Chamber</h1>
      </div>

      {/* Step Indicator */}
      <div className="bg-[#0D1B3E] pb-8">
        <div className="container flex justify-center gap-8">
          {(['Dates & Room', 'Guest Details', 'Confirmation'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={[
                'w-8 h-8 flex items-center justify-center font-[Cinzel] text-sm',
                step > i + 1 ? 'bg-[#C9A84C] text-[#0D1B3E]' :
                step === i + 1 ? 'bg-[#C9A84C] text-[#0D1B3E]' :
                'border border-[#F5ECD7]/20 text-[#F5ECD7]/40',
              ].join(' ')}>
                {i + 1}
              </div>
              <span className={`font-[Cinzel] text-xs tracking-wider uppercase hidden sm:block ${step === i + 1 ? 'text-[#C9A84C]' : 'text-[#F5ECD7]/40'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="container max-w-4xl py-12">
        {/* Step 1: Room & Dates */}
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

            <GoldDivider ornament="𓏤" />
            <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-widest uppercase text-sm">Select Your Chamber</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={[
                    'text-left border-2 transition-all duration-200 overflow-hidden group',
                    selectedRoom?._id === room._id ? 'border-[#C9A84C]' : 'border-transparent hover:border-[#C9A84C]/50',
                  ].join(' ')}
                >
                  <div className="relative h-40">
                    <Image
                      src={room.images?.[0] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600'}
                      alt={room.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {selectedRoom?._id === room._id && (
                      <div className="absolute top-2 right-2 bg-[#C9A84C] text-[#0D1B3E] w-6 h-6 flex items-center justify-center font-bold text-sm">✓</div>
                    )}
                  </div>
                  <div className="p-4 bg-white">
                    <p className="font-[Cinzel] text-[#0D1B3E] text-sm tracking-wider">{room.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-[Cinzel] text-xs text-[#5A6478] uppercase">{room.type}</span>
                      <span className="font-[Cinzel_Decorative] text-[#C9A84C]">${room.pricePerNight}<span className="text-[#5A6478] text-xs">/night</span></span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedRoom && nights > 0 && (
              <div className="bg-[#0D1B3E] p-6 border border-[#C9A84C]/20">
                <div className="flex justify-between items-center">
                  <div className="text-[#F5ECD7]/70 font-[Cinzel] text-xs tracking-wider uppercase">
                    {selectedRoom.name} × {nights} nights
                  </div>
                  <div className="font-[Cinzel_Decorative] text-[#C9A84C] text-xl">${totalCost.toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  if (!selectedRoom) { toast.error('Please select a room'); return; }
                  if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
                  setStep(2);
                }}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Guest Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-[#0D1B3E] p-4 border border-[#C9A84C]/20 flex justify-between items-center">
              <div className="text-[#F5ECD7]/70 font-[Cinzel] text-xs tracking-wider uppercase">
                {selectedRoom?.name} · {nights} nights
              </div>
              <div className="font-[Cinzel_Decorative] text-[#C9A84C]">${totalCost.toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="As on ID" />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="ID / Passport (optional)" value={form.idProof} onChange={(e) => setForm({ ...form, idProof: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Special Requests</label>
              <textarea
                value={form.specialRequests}
                onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                rows={3}
                placeholder="Dietary requirements, room preferences, celebrations..."
                className="w-full px-4 py-3 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none text-[#0D1B3E] font-[Cormorant_Garamond] text-base resize-none bg-white"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="primary" loading={loading} onClick={handleSubmit}>Confirm Reservation</Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && confirmation && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 text-[#C9A84C]">𓂀</div>
            <h2 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl mb-2">Reservation Confirmed</h2>
            <GoldDivider />
            <p className="text-[#5A6478] mb-6">A confirmation has been sent to <strong>{form.email}</strong></p>
            <div className="bg-[#0D1B3E] p-8 border border-[#C9A84C]/20 text-left max-w-md mx-auto mb-8">
              <div className="space-y-3 font-[Cinzel] text-xs tracking-wider">
                {[
                  ['Reservation ID', confirmation._id?.slice(-8).toUpperCase()],
                  ['Room', selectedRoom?.name],
                  ['Check-In', new Date(form.checkInDate).toDateString()],
                  ['Check-Out', new Date(form.checkOutDate).toDateString()],
                  ['Total Nights', nights],
                  ['Total', `$${totalCost.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-[#C9A84C]/10 pb-2">
                    <span className="text-[#F5ECD7]/50 uppercase">{k}</span>
                    <span className="text-[#C9A84C]">{v}</span>
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
