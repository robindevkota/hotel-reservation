'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import Select from '../../../../components/ui/Select';
import toast from 'react-hot-toast';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchReservations = () => {
    const params = filter ? `?status=${filter}` : '';
    api.get(`/reservations${params}`).then(({ data }) => {
      setReservations(data.reservations);
      setLoading(false);
    });
  };

  useEffect(() => { fetchReservations(); }, [filter]);

  const handleConfirm = async (id: string) => {
    try {
      await api.patch(`/reservations/${id}/confirm`);
      toast.success('Reservation confirmed');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      const { data } = await api.post(`/checkin/${id}`);
      toast.success('Guest checked in!');
      fetchReservations();
      // Show QR code
      if (data.qrCodeUrl) {
        window.open(data.qrCodeUrl, '_blank');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await api.patch(`/reservations/${id}/cancel`);
      toast.success('Cancelled');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Manage</p>
          <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Reservations</h1>
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'checked_in', label: 'Checked In' },
            { value: 'checked_out', label: 'Checked Out' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          className="w-40"
        />
      </div>
      <GoldDivider />

      <div className="bg-white border border-[#0D1B3E]/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-[#0D1B3E]">
            <tr>
              {['Guest', 'Room', 'Check-In', 'Check-Out', 'Nights', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-[Cinzel] text-[#C9A84C] text-[10px] tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D1B3E]/5">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : reservations.map((r: any) => (
              <tr key={r._id} className="hover:bg-[#F5ECD7] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-[Cinzel] text-[#0D1B3E] text-xs">{r.guest?.name}</p>
                  <p className="text-[#5A6478] text-xs">{r.guest?.email}</p>
                </td>
                <td className="px-4 py-3 font-[Cinzel] text-[#0D1B3E] text-xs">{r.room?.name || '—'}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkInDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkOutDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-[Cinzel] text-[#C9A84C] text-xs">{r.totalNights}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {r.status === 'pending' && (
                      <button onClick={() => handleConfirm(r._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-green-700 border border-green-200 px-2 py-1 hover:bg-green-50">Confirm</button>
                    )}
                    {r.status === 'confirmed' && (
                      <button onClick={() => handleCheckIn(r._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-blue-700 border border-blue-200 px-2 py-1 hover:bg-blue-50">Check In</button>
                    )}
                    {['pending', 'confirmed'].includes(r.status) && (
                      <button onClick={() => handleCancel(r._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50">Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
