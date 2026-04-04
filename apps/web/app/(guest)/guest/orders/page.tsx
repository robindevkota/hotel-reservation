'use client';
import React, { useEffect } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useAuthStore } from '../../../../store/authStore';
import { useGuestSocket } from '../../../../hooks/useSocket';
import { StatusBadge } from '../../../../components/ui/Badge';
import GoldDivider from '../../../../components/ui/GoldDivider';

const STATUS_STEPS = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { orders, setOrders } = useOrderStore();
  const guestId = user?.type === 'guest' ? (user as any).guestId : undefined;
  useGuestSocket(guestId);

  useEffect(() => {
    api.get('/orders/my').then(({ data }) => setOrders(data.orders));
  }, [setOrders]);

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Live Tracking</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-2xl">My Orders</h1>
        <GoldDivider ornament="𓏤" />
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase mb-4">Active Orders</h2>
          <div className="space-y-4">
            {activeOrders.map((order) => {
              const stepIndex = STATUS_STEPS.indexOf(order.status);
              return (
                <div key={order._id} className="bg-white border border-[#C9A84C]/30 p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-[Cinzel] text-[#0D1B3E] text-sm">Order #{String(order._id).slice(-6).toUpperCase()}</p>
                      <p className="text-[#5A6478] text-xs mt-0.5">{new Date(order.placedAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-lg">${order.totalAmount}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex gap-1 mb-2">
                      {STATUS_STEPS.slice(0, -1).map((s, i) => (
                        <div
                          key={s}
                          className={[
                            'flex-1 h-1.5',
                            i <= stepIndex - 1 ? 'bg-[#C9A84C]' : i === stepIndex ? 'bg-[#C9A84C]/50' : 'bg-[#0D1B3E]/10',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between">
                      {['Placed', 'Accepted', 'Cooking', 'Ready', 'On Way'].map((label, i) => (
                        <span key={label} className={`font-[Cinzel] text-[8px] tracking-wider uppercase ${i <= stepIndex ? 'text-[#C9A84C]' : 'text-[#5A6478]'}`}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-[#0D1B3E]/10 pt-3 space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[#5A6478]">{item.quantity}× {item.menuItem?.name}</span>
                        <span className="font-[Cinzel] text-[#0D1B3E]">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase mb-4">Past Orders</h2>
          <div className="space-y-2">
            {pastOrders.map((order) => (
              <div key={order._id} className="bg-white border border-[#0D1B3E]/10 p-4 flex justify-between items-center">
                <div>
                  <p className="font-[Cinzel] text-[#0D1B3E] text-xs">#{String(order._id).slice(-6).toUpperCase()} · {order.items.length} item(s)</p>
                  <p className="text-[#5A6478] text-xs">{new Date(order.placedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-[Cinzel_Decorative] text-[#C9A84C]">${order.totalAmount}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl text-[#C9A84C] mb-4">𓌀</div>
          <p className="font-[Cinzel] text-[#5A6478] tracking-widest">No orders yet</p>
          <p className="text-[#5A6478] text-sm mt-1">Visit the Menu to place your first order</p>
        </div>
      )}
    </div>
  );
}
