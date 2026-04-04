'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../../store/authStore';
import { useBilling } from '../../../../hooks/useBilling';
import { useGuestSocket } from '../../../../hooks/useSocket';
import Button from '../../../../components/ui/Button';
import GoldDivider from '../../../../components/ui/GoldDivider';
import api from '../../../../lib/api';

export default function GuestDashboardPage() {
  const { user } = useAuthStore();
  const { bill, loading } = useBilling(true);
  const [orders, setOrders] = useState<any[]>([]);
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;

  useGuestSocket(guestId);

  useEffect(() => {
    if (!guestId) return;
    api.get('/orders/my').then(({ data }) => setOrders(data.orders || []));
  }, [guestId]);

  if (!user || user.type !== 'guest') return null;

  const g = user as any;

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      {/* Welcome */}
      <div className="text-center mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-1">Welcome</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Your Royal Stay</h1>
        <GoldDivider ornament="𓂀" />
        <p className="font-[Cinzel] text-[#5A6478] text-sm tracking-wider uppercase">{g.roomName}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0D1B3E] p-4 text-center border border-[#C9A84C]/20">
          <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">{orders.length}</p>
          <p className="font-[Cinzel] text-[#F5ECD7]/50 text-[10px] tracking-widest uppercase mt-1">Orders</p>
        </div>
        <div className="bg-[#0D1B3E] p-4 text-center border border-[#C9A84C]/20">
          <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">
            {loading ? '—' : `$${bill?.grandTotal?.toFixed(0) || '0'}`}
          </p>
          <p className="font-[Cinzel] text-[#F5ECD7]/50 text-[10px] tracking-widest uppercase mt-1">Total Bill</p>
        </div>
        <div className="bg-[#0D1B3E] p-4 text-center border border-[#C9A84C]/20">
          <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">
            {orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length}
          </p>
          <p className="font-[Cinzel] text-[#F5ECD7]/50 text-[10px] tracking-widest uppercase mt-1">Active Orders</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/guest/menu">
          <div className="bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C] p-6 text-center transition-colors group cursor-pointer">
            <div className="text-3xl text-[#C9A84C] mb-2 group-hover:scale-110 transition-transform">𓌀</div>
            <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Order Food</p>
          </div>
        </Link>
        <Link href="/guest/spa">
          <div className="bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C] p-6 text-center transition-colors group cursor-pointer">
            <div className="text-3xl text-[#C9A84C] mb-2 group-hover:scale-110 transition-transform">𓆉</div>
            <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Book Spa</p>
          </div>
        </Link>
        <Link href="/guest/orders">
          <div className="bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C] p-6 text-center transition-colors group cursor-pointer">
            <div className="text-3xl text-[#C9A84C] mb-2 group-hover:scale-110 transition-transform">𓏤</div>
            <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Track Orders</p>
          </div>
        </Link>
        <Link href="/guest/billing">
          <div className="bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C] p-6 text-center transition-colors group cursor-pointer">
            <div className="text-3xl text-[#C9A84C] mb-2 group-hover:scale-110 transition-transform">𓎛</div>
            <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">View Bill</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase mb-4">Recent Orders</h2>
          <div className="space-y-2">
            {orders.slice(0, 3).map((order: any) => (
              <div key={order._id} className="bg-white border border-[#0D1B3E]/10 p-4 flex justify-between items-center">
                <div>
                  <p className="font-[Cinzel] text-[#0D1B3E] text-xs">{order.items?.length} item(s)</p>
                  <p className="text-[#5A6478] text-xs">{new Date(order.placedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-[Cinzel] text-[#C9A84C] text-sm">${order.totalAmount}</p>
                  <span className={`font-[Cinzel] text-[10px] tracking-wider uppercase ${
                    order.status === 'delivered' ? 'text-green-600' :
                    order.status === 'cancelled' ? 'text-red-500' :
                    'text-[#C9A84C]'
                  }`}>{order.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
