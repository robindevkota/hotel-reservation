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

export function useGuestSocket(
  guestId: string | undefined,
  onServiceUpdated?: (req: any) => void,
  onSpaConfirmed?: (bookingId: string) => void,
  onSpaRescheduled?: (data: { bookingId: string; newStart: string; newDate: string }) => void,
) {
  const { updateOrderStatus } = useOrderStore();

  useEffect(() => {
    if (!guestId) return;
    const socket = getSocket();
    connectSocket();

    const joinRoom = () => { socket.emit('join:guest-room', guestId); };
    if (socket.connected) joinRoom(); else socket.on('connect', joinRoom);

    const handleOrder   = ({ orderId, status }: { orderId: string; status: string }) => updateOrderStatus(orderId, status);
    const handleSvc     = (req: any) => onServiceUpdated?.(req);
    const handleSpaConf = ({ bookingId }: { bookingId: string }) => onSpaConfirmed?.(bookingId);
    const handleSpaResc = (data: any) => onSpaRescheduled?.(data);

    socket.on('order:status-update',    handleOrder);
    socket.on('service:updated',        handleSvc);
    socket.on('spa:booking-confirmed',  handleSpaConf);
    socket.on('spa:rescheduled',        handleSpaResc);

    return () => {
      socket.off('connect',              joinRoom);
      socket.off('order:status-update',  handleOrder);
      socket.off('service:updated',      handleSvc);
      socket.off('spa:booking-confirmed', handleSpaConf);
      socket.off('spa:rescheduled',      handleSpaResc);
    };
  }, [guestId, updateOrderStatus, onServiceUpdated, onSpaConfirmed, onSpaRescheduled]);
}

export function useFrontDeskSocket(
  onServiceNew?:     (req: any) => void,
  onServiceUpdated?: (req: any) => void,
) {
  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    const onConnect = () => { socket.emit('join:admin'); };
    if (socket.connected) onConnect(); else socket.on('connect', onConnect);

    const handleNew     = (req: any) => onServiceNew?.(req);
    const handleUpdated = (req: any) => onServiceUpdated?.(req);

    socket.on('service:new',     handleNew);
    socket.on('service:updated', handleUpdated);

    return () => {
      socket.off('connect',          onConnect);
      socket.off('service:new',      handleNew);
      socket.off('service:updated',  handleUpdated);
    };
  }, [onServiceNew, onServiceUpdated]);
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
