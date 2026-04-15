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

function playOrderAlert() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch {}
}

export function useKitchenSocket() {
  const { addOrder, updateOrderStatus } = useOrderStore();

  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    socket.emit('join:kitchen');
    socket.emit('join:admin');

    socket.on('order:new', (order) => {
      addOrder(order);
      playOrderAlert();
    });
    socket.on('order:status-update', ({ orderId, status }: { orderId: string; status: string }) => {
      updateOrderStatus(orderId, status);
    });

    return () => {
      socket.off('order:new');
      socket.off('order:status-update');
    };
  }, [addOrder, updateOrderStatus]);
}
