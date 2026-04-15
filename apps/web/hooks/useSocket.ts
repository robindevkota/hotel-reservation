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

    const onConnect = () => {
      socket.emit('join:kitchen');
      socket.emit('join:admin');
    };
    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    const onNewOrder = (order: any) => addOrder(order);
    const onStatusUpdate = ({ orderId, status }: { orderId: string; status: string }) => updateOrderStatus(orderId, status);

    socket.on('order:new', onNewOrder);
    socket.on('order:status-update', onStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('order:new', onNewOrder);
      socket.off('order:status-update', onStatusUpdate);
    };
  }, [addOrder, updateOrderStatus]);
}
