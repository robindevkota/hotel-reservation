import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export type UserRole = 'admin' | 'staff' | 'kitchen' | 'waiter';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface GuestUser {
  id: string;
  guestId: string;
  roomId: string;
  roomName: string;
  type: 'guest';
}

type AuthUser = (StaffUser & { type: 'staff' }) | GuestUser;

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: (token: string, guestId: string, roomId: string, roomName: string) => void;
  logout: () => Promise<void>;
  setUser: (user: AuthUser, token: string) => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isGuest: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const { data } = await api.post('/auth/login', { email, password });
        const token = data.accessToken;
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', token);
        set({ user: { ...data.user, type: 'staff' }, accessToken: token, isLoading: false });
      },

      loginAsGuest: (token, guestId, roomId, roomName) => {
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', token);
        set({
          user: { id: guestId, guestId, roomId, roomName, type: 'guest' },
          accessToken: token,
        });
      },

      logout: async () => {
        await api.post('/auth/logout').catch(() => {});
        if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },

      setUser: (user, token) => {
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', token);
        set({ user, accessToken: token });
      },

      isAdmin: () => get().user?.type === 'staff' && (get().user as StaffUser & {type:'staff'})?.role === 'admin',
      isStaff: () => get().user?.type === 'staff',
      isGuest: () => get().user?.type === 'guest',
    }),
    { name: 'royal-suites-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken }) }
  )
);
