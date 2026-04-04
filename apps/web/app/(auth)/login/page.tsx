'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import GoldDivider from '../../../components/ui/GoldDivider';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B3E] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-[Cinzel_Decorative] text-[#C9A84C] text-3xl cursor-pointer hover:opacity-80 transition-opacity">
              ROYAL SUITES
            </h1>
          </Link>
          <p className="font-[Cinzel] text-[#F5ECD7]/50 text-xs tracking-widest uppercase mt-1">Staff Portal</p>
        </div>

        <div className="bg-[#F5ECD7] p-8">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent -mt-8 mb-8" />
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-lg tracking-widest uppercase mb-2">Sign In</h2>
          <GoldDivider ornament="𓂀" />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              error={errors.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Enter the Palace
            </Button>
          </form>

          <p className="text-center mt-6 font-[Cinzel] text-xs text-[#5A6478] tracking-wider">
            New staff member?{' '}
            <Link href="/register" className="text-[#C9A84C] hover:text-[#0D1B3E] transition-colors">
              Register
            </Link>
          </p>
        </div>

        <p className="text-center mt-4 font-[Cinzel] text-xs text-[#F5ECD7]/30 tracking-wider">
          Guest? Scan the QR code in your room.
        </p>
      </div>
    </div>
  );
}
