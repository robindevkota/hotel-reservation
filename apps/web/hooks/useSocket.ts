'use client';
import { useEffect } from 'react';
import { getSocket, connectSocket } from '../lib/socket';
import { useOrderStore } from '../store/orderStore';

export function useGuestSocket(guestId: string | undefined) {
  const { updateOrderStatus } = useOrderStore();

  useEffect(() => {
    if (!guestId) return;
    const socket = getSocket();
    connectSocket();

    socket.emit('join:guest-room', guestId);

    socket.on('order:status-update', ({ orderId, status }: { orderId: string; status: string }) => {
      updateOrderStatus(orderId, status);
    });

    return () => {
      socket.off('order:status-update');
    };
  }, [guestId, updateOrderStatus]);
}

export function useKitchenSocket() {
  const { addOrder, updateOrderStatus } = useOrderStore();

  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    socket.emit('join:kitchen');
    socket.emit('join:admin');

    socket.on('order:new', (order) => addOrder(order));
    socket.on('order:status-update', ({ orderId, status }: { orderId: string; status: string }) => {
      updateOrderStatus(orderId, status);
    });

    return () => {
      socket.off('order:new');
      socket.off('order:status-update');
    };
  }, [addOrder, updateOrderStatus]);
}
