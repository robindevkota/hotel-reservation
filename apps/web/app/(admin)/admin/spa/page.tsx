'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function AdminSpaPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    api.get('/spa/bookings').then(({ data }) => {
      setBookings(data.bookings);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/spa/bookings/${id}/status`, { status });
      toast.success(`Booking ${status}`);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Manage</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Spa Schedule</h1>
        <GoldDivider ornament="𓆉" />
      </div>

      <div className="bg-white border border-[#0D1B3E]/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-[#0D1B3E]">
            <tr>
              {['Guest', 'Service', 'Date', 'Time', 'Price', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-[Cinzel] text-[#C9A84C] text-[10px] tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D1B3E]/5">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 font-[Cinzel] text-[#5A6478] text-xs">No spa bookings</td></tr>
            ) : bookings.map((b: any) => (
              <tr key={b._id} className="hover:bg-[#F5ECD7]">
                <td className="px-4 py-3 font-[Cinzel] text-[#0D1B3E] text-xs">{b.guest?.name}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{b.service?.name}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(b.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{b.startTime}</td>
                <td className="px-4 py-3 font-[Cinzel] text-[#C9A84C] text-xs">${b.price}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {b.status === 'pending' && (
                      <button onClick={() => updateStatus(b._id, 'confirmed')} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-green-700 border border-green-200 px-2 py-1 hover:bg-green-50">Confirm</button>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => updateStatus(b._id, 'completed')} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-blue-700 border border-blue-200 px-2 py-1 hover:bg-blue-50">Complete</button>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button onClick={() => updateStatus(b._id, 'cancelled')} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50">Cancel</button>
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
