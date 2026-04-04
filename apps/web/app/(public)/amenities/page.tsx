import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import GoldDivider from '../../../components/ui/GoldDivider';
import Button from '../../../components/ui/Button';

const AMENITIES = [
  { icon: '𓆉', title: "Cleopatra's Spa", desc: 'Six ancient-inspired treatments. Milk & Honey rituals, Nile Stone therapy, couples journeys, and more.' },
  { icon: '🏊', title: 'Infinity Pool', desc: 'A rooftop infinity pool with panoramic city views, heated year-round and styled with mosaic hieroglyphic tiles.' },
  { icon: '𓌀', title: 'Royal Dining', desc: 'In-room dining and our main restaurant serving curated Egyptian cuisine around the clock.' },
  { icon: '𓏤', title: 'Butler Service', desc: '24/7 personal butler service for all Royal Suite guests. Every need anticipated, every request fulfilled.' },
  { icon: '🧖', title: 'Steam & Sauna', desc: 'Eucalyptus steam rooms and cedar saunas. The perfect prelude to your spa treatment.' },
  { icon: '🏋️', title: 'Royal Fitness', desc: 'State-of-the-art gym with personal trainers available on request. Open 24 hours.' },
];

async function getSpaServices() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/spa/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services || [];
  } catch { return []; }
}

export default async function AmenitiesPage() {
  const services = await getSpaServices();

  return (
    <div className="pt-20 bg-[#F5ECD7] min-h-screen">
      {/* Hero */}
      <div className="relative h-64 bg-[#0D1B3E]">
        <Image
          src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1600"
          alt="Royal Suites Spa"
          fill
          className="object-cover opacity-40"
        />
        <div className="relative container h-full flex flex-col justify-center">
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-2">Beyond the Room</p>
          <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-4xl md:text-5xl">Amenities & Spa</h1>
        </div>
      </div>

      {/* Hotel Amenities */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="font-[Cinzel] text-[#0D1B3E] text-2xl tracking-wider mb-2">Hotel Facilities</h2>
          <GoldDivider />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AMENITIES.map(({ icon, title, desc }) => (
            <div key={title} className="p-8 bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C] transition-colors group">
              <div className="text-3xl text-[#C9A84C] mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
              <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm tracking-wider uppercase mb-2">{title}</h3>
              <p className="text-[#5A6478] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spa Services */}
      <section className="bg-[#0D1B3E] py-16">
        <div className="container">
          <div className="text-center mb-12">
            <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-2">Ancient Rituals</p>
            <h2 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-3xl">Cleopatra's Spa</h2>
            <GoldDivider ornament="𓆉" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service: any) => (
              <div key={service._id} className="bg-[#1A2E6E]/40 border border-[#C9A84C]/20 overflow-hidden hover:border-[#C9A84C]/60 transition-colors">
                <div className="relative h-48">
                  <Image
                    src={service.image || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600'}
                    alt={service.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-[Cinzel] text-[#F5ECD7] text-sm tracking-wider">{service.name}</h3>
                    <span className="font-[Cinzel] text-[#C9A84C] text-xs bg-[#C9A84C]/10 px-2 py-1 capitalize">{service.category}</span>
                  </div>
                  <p className="text-[#F5ECD7]/60 text-xs mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-[Cinzel] text-[#F5ECD7]/40 text-xs">{service.duration} min</span>
                    <span className="font-[Cinzel_Decorative] text-[#C9A84C]">${service.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-[#F5ECD7]/60 font-[Cinzel] text-xs tracking-wider mb-4">Spa bookings available after check-in via your room's QR code</p>
          </div>
        </div>
      </section>
    </div>
  );
}
