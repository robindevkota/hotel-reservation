import { create } from 'zustand';

export interface Order {
  _id: string;
  status: string;
  items: Array<{ menuItem: { name: string; image: string }; quantity: number; unitPrice: number }>;
  totalAmount: number;
  placedAt: string;
  notes?: string;
}

interface OrderState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  addOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o._id === orderId ? { ...o, status } : o)),
    })),
  addOrder: (order) => set((state) => {
    if (state.orders.some((o) => o._id === order._id)) return state;
    return { orders: [order, ...state.orders] };
  }),
}));
