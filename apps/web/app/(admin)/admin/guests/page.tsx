'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';

export default function GuestsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const fetch = () => {
    api.get('/reservations?status=checked_in').then(({ data }) => {
      setReservations(data.reservations);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const handleCheckOut = async (guestId: string) => {
    if (!confirm('Initiate checkout for this guest?')) return;
    setCheckingOut(guestId);
    try {
      await api.post(`/checkin/checkout/${guestId}`);
      toast.success('Guest checked out — bill locked');
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Current Guests</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">In-House Guests</h1>
        <GoldDivider />
      </div>

      <div className="bg-white border border-[#0D1B3E]/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-[#0D1B3E]">
            <tr>
              {['Guest', 'Room', 'Check-In', 'Check-Out', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-[Cinzel] text-[#C9A84C] text-[10px] tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D1B3E]/5">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 font-[Cinzel] text-[#5A6478] text-xs">No guests currently checked in</td></tr>
            ) : reservations.map((r: any) => (
              <tr key={r._id} className="hover:bg-[#F5ECD7]">
                <td className="px-4 py-3">
                  <p className="font-[Cinzel] text-[#0D1B3E] text-xs">{r.guest?.name}</p>
                  <p className="text-[#5A6478] text-xs">{r.guest?.phone}</p>
                </td>
                <td className="px-4 py-3 font-[Cinzel] text-[#0D1B3E] text-xs">{r.room?.name || r.room?.roomNumber}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkInDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkOutDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleCheckOut(r._id)}
                    disabled={checkingOut === r._id}
                    className="font-[Cinzel] text-[9px] tracking-wider uppercase text-orange-600 border border-orange-200 px-3 py-1.5 hover:bg-orange-50 disabled:opacity-50"
                  >
                    {checkingOut === r._id ? 'Processing...' : 'Check Out'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
