'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email)    e.email    = 'Email is required';
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
    <div className="min-h-screen bg-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10">
        <Image src="/hero-bg.jpg" alt="" fill className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-primary/90" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Royal Suites"
              width={72}
              height={72}
              className="rounded-full border-2 border-gold shadow-gold object-cover"
            />
            <div>
              <p className="font-display text-primary-foreground text-xl tracking-widest">Royal Suites</p>
              <p className="font-body text-gold-light text-xs tracking-wider">Staff Portal</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="glass p-8">
          <div className="w-full h-px bg-gradient-gold mb-8" />

          <h2 className="font-display text-primary-foreground text-lg tracking-widest uppercase mb-1">Sign In</h2>
          <p className="font-elegant text-cream-dark/60 text-sm italic mb-6">Enter your credentials to access the staff portal</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <div className="pt-2">
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Enter the Palace
              </Button>
            </div>
          </form>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent my-6" />

          <p className="text-center font-body text-xs text-cream-dark/60">
            New staff member?{' '}
            <Link href="/register" className="text-gold hover:text-gold-light transition-colors">
              Register here
            </Link>
          </p>
        </div>

        <p className="text-center mt-4 font-body text-xs text-cream-dark/30">
          Guest? Scan the QR code in your room.
        </p>
      </div>
    </div>
  );
}
