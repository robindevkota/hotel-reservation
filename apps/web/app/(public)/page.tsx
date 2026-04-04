import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '../../components/ui/Button';
import GoldDivider from '../../components/ui/GoldDivider';

const STATS = [
  { value: '8', label: 'Luxury Rooms' },
  { value: '6', label: 'Spa Rituals' },
  { value: '5★', label: 'Rating' },
  { value: '24/7', label: 'Butler Service' },
];

const FEATURES = [
  {
    icon: '𓏤',
    title: 'Royal Chambers',
    desc: 'Eight meticulously designed rooms, from standard comfort to the legendary Pharaoh\'s Royal Chamber with private pool terrace.',
  },
  {
    icon: '𓆉',
    title: 'Cleopatra\'s Spa',
    desc: 'Six ancient-inspired treatments including the legendary Milk & Honey Ritual, Nile Stone Therapy, and Couples\' Golden Journey.',
  },
  {
    icon: '𓌀',
    title: 'Fine Dining',
    desc: 'A curated menu of royal Egyptian cuisine — from Hamam Mahshi to Gold Leaf Baklava — delivered to your chamber.',
  },
  {
    icon: '𓎛',
    title: 'QR Portal',
    desc: 'Scan your room\'s QR code to order food, book spa, track orders, and manage your bill — all from your phone.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1920"
            alt="Royal Suites luxury hotel room"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B3E]/70 via-[#0D1B3E]/50 to-[#0D1B3E]/90" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-6 animate-fade-in">
            Cairo's Most Exclusive Address
          </p>
          <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-5xl md:text-7xl font-bold mb-4 leading-tight animate-fade-up">
            ROYAL
            <span className="block text-[#C9A84C]">SUITES</span>
          </h1>
          <p className="font-[Cormorant_Garamond] text-[#F5ECD7]/80 text-xl md:text-2xl italic mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Where pharaoh luxury meets timeless elegance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/reserve">
              <Button variant="primary" size="lg">Reserve Your Chamber</Button>
            </Link>
            <Link href="/rooms">
              <Button variant="ghost" size="lg">Explore Rooms</Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[#C9A84C]/60">
          <span className="font-[Cinzel] text-[10px] tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-[#C9A84C]/60 to-transparent animate-pulse" />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0D1B3E] py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-[Cinzel_Decorative] text-[#C9A84C] text-3xl md:text-4xl mb-1">{value}</p>
                <p className="font-[Cinzel] text-[#F5ECD7]/60 text-xs tracking-widest uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section bg-[#F5ECD7]">
        <div className="container">
          <div className="text-center mb-12">
            <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3">The Royal Experience</p>
            <h2 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl md:text-4xl">Ancient Luxury, Modern Comfort</h2>
          </div>
          <GoldDivider />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-8 border border-[#C9A84C]/20 hover:border-[#C9A84C] transition-colors duration-300 group">
                <div className="text-4xl mb-4 text-[#C9A84C] group-hover:scale-110 transition-transform duration-300">{icon}</div>
                <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm tracking-wider uppercase mb-3">{title}</h3>
                <p className="text-[#5A6478] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Room */}
      <section className="section bg-[#0D1B3E]">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 lg:h-full min-h-[400px]">
              <Image
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900"
                alt="Pharaoh's Royal Chamber"
                fill
                className="object-cover"
              />
              <div className="absolute top-4 left-4 bg-[#C9A84C] px-4 py-2">
                <span className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Royal Suite</span>
              </div>
            </div>
            <div className="text-[#F5ECD7]">
              <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-3">Featured</p>
              <h2 className="font-[Cinzel_Decorative] text-3xl md:text-4xl mb-4">Pharaoh's Royal Chamber</h2>
              <GoldDivider ornament="𓂀" />
              <p className="text-[#F5ECD7]/70 leading-relaxed mb-6">
                120 sqm of hand-painted hieroglyphics, private pool terrace with panoramic views,
                24K gold-leaf accents, and round-the-clock butler service. The ultimate Egyptian luxury experience.
              </p>
              <div className="flex items-center gap-4 mb-8">
                <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">$1,200</span>
                <span className="font-[Cinzel] text-[#F5ECD7]/40 text-xs tracking-widest uppercase">per night</span>
              </div>
              <Link href="/rooms/pharaohs-royal-chamber">
                <Button variant="primary">View Suite</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#F5ECD7] text-center">
        <div className="container max-w-2xl">
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-4">Begin Your Journey</p>
          <h2 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl md:text-4xl mb-4">
            Reserve Your Royal Chamber
          </h2>
          <p className="text-[#5A6478] mb-8 text-lg">
            Experience luxury as the ancients knew it. Your pharaoh's sanctuary awaits.
          </p>
          <Link href="/reserve">
            <Button variant="primary" size="lg">Book Now</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
