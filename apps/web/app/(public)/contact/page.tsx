'use client';
import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

const INFO = [
  { icon: '📍', label: 'Address',            value: '1 Royal Suites Boulevard, Cairo, Egypt 11511' },
  { icon: '📞', label: 'Reservations',        value: '+20 123 456 7890' },
  { icon: '✉️', label: 'Email',               value: 'reservations@royalsuites.com' },
  { icon: '🕐', label: 'Check-In / Check-Out', value: '3:00 PM / 12:00 PM' },
  { icon: '🔑', label: 'Front Desk',          value: '24 Hours' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success('Your message has been received. We will respond within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <div className="pt-20 bg-background min-h-screen">
      {/* Header */}
      <div className="bg-primary py-24 text-center">
        <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Reach Us</p>
        <h1 className="font-display text-4xl md:text-5xl text-primary-foreground mb-6">Contact Royal Suites</h1>
        <div className="w-24 h-px bg-gradient-gold mx-auto" />
      </div>

      <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Info */}
        <div>
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Location</p>
          <h2 className="font-display text-2xl text-foreground mb-6">Visit Us</h2>
          <div className="w-16 h-px bg-gradient-gold mb-8" />
          <div className="space-y-6">
            {INFO.map(({ icon, label, value }) => (
              <div key={label} className="flex gap-4 group">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-display text-secondary text-xs tracking-widest uppercase mb-1">{label}</p>
                  <p className="font-body text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div>
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Enquiries</p>
          <h2 className="font-display text-2xl text-foreground mb-6">Send a Message</h2>
          <div className="w-16 h-px bg-gradient-gold mb-8" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <Input
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
            <div>
              <label className="text-xs font-display tracking-widest uppercase text-foreground block mb-1.5">
                Message
              </label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                className="w-full px-4 py-3 border border-border focus:border-gold outline-none text-foreground font-elegant text-base resize-none bg-card transition-colors duration-200"
              />
            </div>
            <Button type="submit" variant="primary" loading={loading}>Send Message</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
