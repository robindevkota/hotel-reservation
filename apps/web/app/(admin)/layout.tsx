'use client';
import React from 'react';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.type !== 'staff') router.replace('/login');
  }, [user, router]);

  if (!user || user.type !== 'staff') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5ECD7]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
