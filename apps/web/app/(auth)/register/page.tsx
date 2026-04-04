'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import GoldDivider from '../../../components/ui/GoldDivider';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', inviteCode: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setUser({ ...data.user, type: 'staff' }, data.accessToken);
      toast.success('Account created!');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B3E] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-[Cinzel_Decorative] text-[#C9A84C] text-3xl cursor-pointer">ROYAL SUITES</h1>
          </Link>
          <p className="font-[Cinzel] text-[#F5ECD7]/50 text-xs tracking-widest uppercase mt-1">Staff Registration</p>
        </div>

        <div className="bg-[#F5ECD7] p-8">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent -mt-8 mb-8" />
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-lg tracking-widest uppercase mb-2">Create Account</h2>
          <GoldDivider ornament="𓂀" />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Minimum 8 characters" required />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'kitchen', label: 'Kitchen' },
                { value: 'waiter', label: 'Waiter' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Input label="Invite Code" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} hint="Required for non-first registration" />
            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">Register</Button>
          </form>

          <p className="text-center mt-6 font-[Cinzel] text-xs text-[#5A6478] tracking-wider">
            Already have an account?{' '}
            <Link href="/login" className="text-[#C9A84C] hover:text-[#0D1B3E] transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
