import { create } from 'zustand';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  specialInstructions?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  updateInstructions: (menuItemId: string, instructions: string) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return { items: state.items.map((i) => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (menuItemId) => {
    set((state) => ({ items: state.items.filter((i) => i.menuItemId !== menuItemId) }));
  },

  updateQty: (menuItemId, qty) => {
    if (qty <= 0) { get().removeItem(menuItemId); return; }
    set((state) => ({ items: state.items.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: qty } : i) }));
  },

  updateInstructions: (menuItemId, instructions) => {
    set((state) => ({ items: state.items.map((i) => i.menuItemId === menuItemId ? { ...i, specialInstructions: instructions } : i) }));
  },

  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
