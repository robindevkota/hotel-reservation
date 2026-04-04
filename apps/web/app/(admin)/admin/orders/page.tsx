'use client';
import React, { useEffect } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useKitchenSocket } from '../../../../hooks/useSocket';
import { StatusBadge } from '../../../../components/ui/Badge';
import GoldDivider from '../../../../components/ui/GoldDivider';
import toast from 'react-hot-toast';

const STATUS_TRANSITIONS: Record<string, string> = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'delivering',
  delivering: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Accept',
  accepted: 'Start Cooking',
  preparing: 'Mark Ready',
  ready: 'Send Out',
  delivering: 'Mark Delivered',
};

export default function KitchenOrdersPage() {
  const { orders, setOrders, updateOrderStatus } = useOrderStore();
  useKitchenSocket();

  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data.orders));
  }, [setOrders]);

  const handleAdvance = async (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_TRANSITIONS[currentStatus];
    if (!nextStatus) return;
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      updateOrderStatus(orderId, nextStatus);
      toast.success(`Order ${nextStatus}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.patch(`/orders/${orderId}/cancel`, { reason: 'Cancelled by staff' });
      updateOrderStatus(orderId, 'cancelled');
      toast.success('Order cancelled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const done = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Live Board</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Kitchen Orders</h1>
        <GoldDivider />
        <p className="font-[Cinzel] text-[#5A6478] text-xs tracking-wider">Updates in real-time via Socket.io</p>
      </div>

      {/* Active Orders */}
      {active.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#0D1B3E]/10">
          <div className="text-4xl text-[#C9A84C] mb-3">𓌀</div>
          <p className="font-[Cinzel] text-[#5A6478] tracking-widest">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {active.map((order: any) => (
            <div key={order._id} className="bg-white border border-[#C9A84C]/30 overflow-hidden">
              <div className="bg-[#0D1B3E] px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-wider">Room {order.room?.roomNumber}</p>
                  <p className="font-[Cinzel] text-[#F5ECD7]/50 text-[10px]">{new Date(order.placedAt).toLocaleTimeString()}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="p-4">
                <div className="space-y-1 mb-4">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[#0D1B3E]">{item.quantity}× {item.menuItem?.name}</span>
                      <span className="font-[Cinzel] text-[#C9A84C]">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <p className="text-[#5A6478] text-xs italic border-t border-[#0D1B3E]/10 pt-2 mb-3">"{order.notes}"</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-lg">${order.totalAmount}</span>
                  <div className="flex gap-2">
                    {STATUS_TRANSITIONS[order.status] && (
                      <button
                        onClick={() => handleAdvance(order._id, order.status)}
                        className="font-[Cinzel] text-[9px] tracking-wider uppercase text-[#0D1B3E] bg-[#C9A84C] px-3 py-1.5 hover:bg-[#E8C97A] transition-colors"
                      >
                        {NEXT_LABEL[order.status]}
                      </button>
                    )}
                    {['pending', 'accepted'].includes(order.status) && (
                      <button
                        onClick={() => handleCancel(order._id)}
                        className="font-[Cinzel] text-[9px] tracking-wider uppercase text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Orders */}
      {done.length > 0 && (
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase mb-4">Completed / Cancelled</h2>
          <div className="bg-white border border-[#0D1B3E]/10 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0D1B3E]/5">
                <tr>
                  {['Order ID', 'Room', 'Items', 'Total', 'Status', 'Time'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-[Cinzel] text-[#5A6478] tracking-widest uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1B3E]/5">
                {done.map((o: any) => (
                  <tr key={o._id} className="hover:bg-[#F5ECD7]">
                    <td className="px-4 py-2 font-[Cinzel] text-[#5A6478]">#{String(o._id).slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-2">{o.room?.roomNumber}</td>
                    <td className="px-4 py-2">{o.items?.length}</td>
                    <td className="px-4 py-2 font-[Cinzel] text-[#C9A84C]">${o.totalAmount}</td>
                    <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2 text-[#5A6478]">{new Date(o.placedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
