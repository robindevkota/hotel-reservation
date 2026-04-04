'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';

interface Stats {
  totalReservations: number;
  checkedIn: number;
  pendingOrders: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reservations?limit=5'),
      api.get('/orders?status=pending'),
    ]).then(([resR, resO]) => {
      setReservations(resR.data.reservations);
      setOrders(resO.data.orders);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Total Reservations', value: reservations.length, icon: '𓏤', color: 'text-[#C9A84C]' },
    { label: 'Checked In', value: reservations.filter((r) => r.status === 'checked_in').length, icon: '𓀀', color: 'text-green-600' },
    { label: 'Pending Orders', value: orders.length, icon: '𓌀', color: 'text-orange-500' },
    { label: 'Pending Reservations', value: reservations.filter((r) => r.status === 'pending').length, icon: '𓎛', color: 'text-blue-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Control Center</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Dashboard</h1>
        <GoldDivider />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white border border-[#0D1B3E]/10 p-6">
            <div className={`text-3xl mb-2 ${color}`}>{icon}</div>
            <p className={`font-[Cinzel_Decorative] text-3xl mb-1 ${color}`}>{loading ? '—' : value}</p>
            <p className="font-[Cinzel] text-[#5A6478] text-xs tracking-widest uppercase">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Reservations */}
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-widest uppercase text-sm mb-4">Recent Reservations</h2>
          <div className="bg-white border border-[#0D1B3E]/10 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : reservations.length === 0 ? (
              <div className="p-8 text-center font-[Cinzel] text-[#5A6478] text-xs">No reservations</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#0D1B3E]">
                  <tr>
                    {['Guest', 'Room', 'Check-In', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-[Cinzel] text-[#C9A84C] text-[10px] tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D1B3E]/5">
                  {reservations.map((r: any) => (
                    <tr key={r._id} className="hover:bg-[#F5ECD7] transition-colors">
                      <td className="px-4 py-3 font-[Cinzel] text-[#0D1B3E] text-xs">{r.guest?.name}</td>
                      <td className="px-4 py-3 text-[#5A6478] text-xs">{r.room?.name || r.room?.roomNumber}</td>
                      <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkInDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-widest uppercase text-sm mb-4">Pending Orders</h2>
          <div className="bg-white border border-[#0D1B3E]/10 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center font-[Cinzel] text-[#5A6478] text-xs">No pending orders</div>
            ) : (
              <div className="divide-y divide-[#0D1B3E]/5">
                {orders.map((order: any) => (
                  <div key={order._id} className="px-4 py-3 flex justify-between items-center hover:bg-[#F5ECD7] transition-colors">
                    <div>
                      <p className="font-[Cinzel] text-[#0D1B3E] text-xs">Room {order.room?.roomNumber}</p>
                      <p className="text-[#5A6478] text-xs">{order.items?.length} item(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-[Cinzel] text-[#C9A84C] text-sm">${order.totalAmount}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
