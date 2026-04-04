'use client';
import { useCartStore } from '../store/cartStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function useCart() {
  const store = useCartStore();

  const placeOrder = async (notes?: string): Promise<boolean> => {
    if (store.items.length === 0) {
      toast.error('Cart is empty');
      return false;
    }
    try {
      await api.post('/orders', {
        items: store.items.map((i) => ({
          menuItem: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
        notes,
      });
      store.clearCart();
      toast.success('Order placed successfully!');
      return true;
    } catch {
      toast.error('Failed to place order');
      return false;
    }
  };

  return { ...store, placeOrder };
}
