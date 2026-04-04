'use client';
import React, { useState } from 'react';
import GoldDivider from '../../../components/ui/GoldDivider';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1200));
    toast.success('Your message has been received. We will respond within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <div className="pt-20 bg-[#F5ECD7] min-h-screen">
      <div className="bg-[#0D1B3E] py-20 text-center">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-2">Reach Us</p>
        <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-4xl">Contact Royal Suites</h1>
      </div>

      <div className="container py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Info */}
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-widest text-lg uppercase mb-6">Visit Us</h2>
          <GoldDivider />
          <div className="space-y-6 mt-6">
            {[
              { icon: '📍', label: 'Address', value: '1 Royal Suites Boulevard, Cairo, Egypt 11511' },
              { icon: '📞', label: 'Reservations', value: '+20 123 456 7890' },
              { icon: '✉️', label: 'Email', value: 'reservations@royalsuites.com' },
              { icon: '🕐', label: 'Check-In / Check-Out', value: '3:00 PM / 12:00 PM' },
              { icon: '🔑', label: 'Front Desk', value: '24 Hours' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex gap-4">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-widest uppercase mb-1">{label}</p>
                  <p className="text-[#5A6478]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div>
          <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-widest text-lg uppercase mb-6">Send a Message</h2>
          <GoldDivider />
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <div>
              <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Message</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                className="w-full px-4 py-3 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none text-[#0D1B3E] font-[Cormorant_Garamond] text-base resize-none bg-white"
              />
            </div>
            <Button type="submit" variant="primary" loading={loading}>Send Message</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
