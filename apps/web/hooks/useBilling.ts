'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getSocket, connectSocket } from '../lib/socket';

export interface Bill {
  _id: string;
  lineItems: Array<{ type: string; description: string; amount: number; date: string }>;
  roomCharges: number;
  foodCharges: number;
  spaCharges: number;
  otherCharges: number;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  paymentMethod?: string;
}

export function useBilling(isGuest: boolean) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBill = async () => {
    try {
      const { data } = await api.get(isGuest ? '/billing/my' : '/billing/my');
      setBill(data.bill);
    } catch {
      // guest may not have a bill yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
    const socket = getSocket();
    connectSocket();
    socket.on('bill:updated', ({ totalAmount }: { totalAmount: number }) => {
      setBill((prev) => prev ? { ...prev, grandTotal: totalAmount } : prev);
    });
    return () => { socket.off('bill:updated'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { bill, loading, refetch: fetchBill };
}
