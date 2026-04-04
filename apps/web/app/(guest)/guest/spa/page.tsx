'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import GoldDivider from '../../../../components/ui/GoldDivider';
import Modal from '../../../../components/ui/Modal';
import { StatusBadge } from '../../../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function SpaPage() {
  const [services, setServices] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [pickedSlot, setPickedSlot] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/spa/services').then(({ data }) => setServices(data.services));
    api.get('/spa/bookings/my').then(({ data }) => setMyBookings(data.bookings));
  }, []);

  const fetchSlots = async (serviceId: string, d: string) => {
    if (!d) return;
    const { data } = await api.get(`/spa/availability?serviceId=${serviceId}&date=${d}`);
    setSlots(data.available);
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
    <div className="container py-8 max-w-2xl mx-auto pb-24">
      <div className="text-center mb-6">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Ancient Rituals</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-2xl">Cleopatra's Spa</h1>
        <GoldDivider ornament="𓆉" />
      </div>

      {/* Services */}
      <div className="space-y-4 mb-10">
        {services.map((service) => (
          <div key={service._id} className="bg-white border border-[#0D1B3E]/10 overflow-hidden">
            <div className="flex">
              <div className="relative w-32 h-32 flex-shrink-0">
                <Image
                  src={service.image || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400'}
                  alt={service.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm tracking-wider flex-1 mr-2">{service.name}</h3>
                  <span className="font-[Cinzel_Decorative] text-[#C9A84C] flex-shrink-0">${service.price}</span>
                </div>
                <p className="text-[#5A6478] text-xs mt-1 line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-[Cinzel] text-[#5A6478] text-[10px] uppercase tracking-wider">{service.duration} min · {service.category}</span>
                  <button
                    onClick={() => { setSelected(service); setDate(''); setSlots([]); setPickedSlot(''); }}
                    className="font-[Cinzel] text-[10px] tracking-widest uppercase text-[#C9A84C] border border-[#C9A84C]/50 px-3 py-1.5 hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* My Bookings */}
      {myBookings.length > 0 && (
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase mb-4">My Spa Bookings</h2>
          <div className="space-y-2">
            {myBookings.map((booking: any) => (
              <div key={booking._id} className="bg-white border border-[#0D1B3E]/10 p-4 flex justify-between items-center">
                <div>
                  <p className="font-[Cinzel] text-[#0D1B3E] text-sm">{booking.service?.name}</p>
                  <p className="text-[#5A6478] text-xs">{new Date(booking.date).toDateString()} · {booking.startTime}</p>
                </div>
                <div className="text-right">
                  <p className="font-[Cinzel_Decorative] text-[#C9A84C]">${booking.price}</p>
                  <StatusBadge status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-[#5A6478] text-sm">{selected.description}</p>
            <GoldDivider />
            <div>
              <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Select Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPickedSlot('');
                  fetchSlots(selected._id, e.target.value);
                }}
                className="w-full px-4 py-3 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none font-[Cormorant_Garamond] text-base"
              />
            </div>
            {slots.length > 0 && (
              <div>
                <p className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] mb-2">Available Slots</p>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot: any) => (
                    <button
                      key={slot.startTime}
                      onClick={() => setPickedSlot(slot.startTime)}
                      className={[
                        'py-2 px-2 font-[Cinzel] text-xs border transition-all',
                        pickedSlot === slot.startTime
                          ? 'bg-[#C9A84C] text-[#0D1B3E] border-[#C9A84C]'
                          : 'border-[#C9A84C]/30 text-[#0D1B3E] hover:border-[#C9A84C]',
                      ].join(' ')}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {date && slots.length === 0 && (
              <p className="font-[Cinzel] text-[#5A6478] text-xs tracking-wider">No available slots for this date.</p>
            )}
            <div className="flex justify-between items-center pt-2">
              <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-xl">${selected.price}</span>
              <Button variant="primary" loading={loading} onClick={handleBook} disabled={!pickedSlot}>
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
