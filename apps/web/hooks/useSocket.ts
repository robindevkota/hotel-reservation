'use client';
import { useEffect } from 'react';
import { getSocket, connectSocket } from '../lib/socket';
import { useOrderStore } from '../store/orderStore';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beep(880, 0, 0.15);
    beep(1100, 0.18, 0.15);
    beep(880, 0.36, 0.2);
  } catch { /* browser blocked audio — silent fail */ }
}

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

export function useKitchenSocket(onNewOrder?: (order: any) => void) {
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

    const handleNewOrder = (order: any) => {
      addOrder(order);
      playBeep();
      onNewOrder?.(order);
    };
    const onStatusUpdate = ({ orderId, status }: { orderId: string; status: string }) => updateOrderStatus(orderId, status);

    socket.on('order:new', handleNewOrder);
    socket.on('order:status-update', onStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('order:new', handleNewOrder);
      socket.off('order:status-update', onStatusUpdate);
    };
  }, [addOrder, updateOrderStatus, onNewOrder]);
}
