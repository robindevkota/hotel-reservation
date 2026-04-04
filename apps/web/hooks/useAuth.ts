'use client';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRequireAuth(allowedTypes: ('staff' | 'guest')[] = ['staff']) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowedTypes.includes(user.type as 'staff' | 'guest')) {
      router.replace('/login');
    }
  }, [user, router, allowedTypes]);

  return user;
}

export function useRequireAdmin() {
  const { user, isAdmin } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || !isAdmin()) {
      router.replace('/login');
    }
  }, [user, isAdmin, router]);

  return user;
}
