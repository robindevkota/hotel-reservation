import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import GoldDivider from '../../components/ui/GoldDivider';

const STATS = [
  { value: '8',   label: 'Luxury Rooms' },
  { value: '6',   label: 'Spa Rituals' },
  { value: '5★',  label: 'Rating' },
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
      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt="Royal Suites Hotel"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'hsl(220 55% 18% / 0.55)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(220 55% 18% / 0.85) 0%, transparent 50%, hsl(220 55% 18% / 0.3) 100%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 1rem', maxWidth: '56rem', margin: '0 auto', width: '100%' }}>
          {/* Logo — circular, fixed size, forced center */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div
              className="animate-fade-in-up"
              style={{
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                border: '4px solid hsl(43 72% 55%)',
                boxShadow: '0 4px 24px hsl(43 72% 55% / 0.4)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <Image
                src="/logo.jpg"
                alt="Royal Suites Logo"
                width={128}
                height={128}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                priority
              />
            </div>
          </div>

          <p
            className="animate-fade-in-up"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: 'hsl(43 72% 55%)',
              fontSize: '1.1rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              animationDelay: '0.2s',
              opacity: 0,
            }}
          >
            Welcome to
          </p>

          <h1
            className="animate-fade-in-up"
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800,
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              background: 'linear-gradient(135deg, hsl(43 75% 40%), hsl(43 72% 55%), hsl(43 65% 72%), hsl(43 72% 55%), hsl(43 75% 40%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
              marginBottom: '0.75rem',
              animationDelay: '0.4s',
              opacity: 0,
            }}
          >
            Royal Suites
          </h1>

          <p
            className="animate-fade-in-up"
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 400,
              fontSize: '1.2rem',
              color: 'hsl(35 25% 88%)',
              letterSpacing: '0.15em',
              marginBottom: '1.5rem',
              animationDelay: '0.5s',
              opacity: 0,
            }}
          >
            Boutique Hotel &amp; Spa
          </p>

          <div
            className="animate-fade-in-up"
            style={{
              width: '6rem',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
              margin: '0 auto 2rem',
              animationDelay: '0.6s',
              opacity: 0,
            }}
          />

          <p
            className="animate-fade-in-up"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: '1.15rem',
              color: 'hsl(35 25% 88% / 0.8)',
              maxWidth: '36rem',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
              animationDelay: '0.7s',
              opacity: 0,
            }}
          >
            Experience the grandeur of ancient Egypt reimagined for the modern traveler.
            Where timeless luxury meets pharaonic splendor.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
            style={{ animationDelay: '0.9s', opacity: 0 }}
          >
            <Link
              href="/reserve"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
                color: 'hsl(220 55% 18%)',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '1rem 2.5rem',
                transition: 'all 0.3s ease',
                fontWeight: 600,
              }}
            >
              Reserve Now
            </Link>
            <Link
              href="/rooms"
              style={{
                display: 'inline-block',
                border: '1px solid hsl(43 72% 55%)',
                color: 'hsl(43 72% 55%)',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '1rem 2.5rem',
                transition: 'all 0.3s ease',
              }}
            >
              Explore Rooms
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div style={{ width: '1.5rem', height: '2.5rem', border: '2px solid hsl(43 72% 55% / 0.5)', borderRadius: '9999px', display: 'flex', justifyContent: 'center', paddingTop: '0.4rem' }}>
            <div style={{ width: '0.25rem', height: '0.5rem', background: 'hsl(43 72% 55%)', borderRadius: '9999px' }} />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-gold text-3xl md:text-4xl mb-1">{value}</p>
                <p className="font-display text-cream-dark/60 text-xs tracking-widest uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">The Royal Experience</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4">Ancient Luxury, Modern Comfort</h2>
            <div className="w-24 h-px bg-gradient-gold mx-auto mb-6" />
            <p className="font-elegant text-muted-foreground text-lg max-w-2xl mx-auto italic">
              Every detail has been crafted to transport you to the golden age of the pharaohs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="text-center p-8 border border-border hover:border-gold/50 bg-card transition-all duration-500 hover:shadow-gold group"
              >
                <div className="text-4xl mb-4 text-secondary group-hover:scale-110 transition-transform duration-300">
                  {icon}
                </div>
                <h3 className="font-display text-sm tracking-wider uppercase mb-3 text-foreground">{title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Room ── */}
      <section className="py-24 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 lg:h-full min-h-[480px] overflow-hidden group">
              <Image
                src="/room-pharaoh.jpg"
                alt="Pharaoh's Royal Chamber"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 bg-gradient-gold px-4 py-2">
                <span className="font-display text-primary text-xs tracking-widest uppercase">Featured Suite</span>
              </div>
            </div>
            <div>
              <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Crown Jewel</p>
              <h2 className="font-display text-3xl md:text-4xl text-primary-foreground mb-6">
                Pharaoh&apos;s Royal Chamber
              </h2>
              <div className="w-24 h-px bg-gradient-gold mb-6" />
              <p className="font-elegant text-cream-dark/70 text-lg italic leading-relaxed mb-6">
                120 m² of hand-painted hieroglyphics, private pool terrace with panoramic views,
                24K gold-leaf accents, and round-the-clock butler service.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['Private Pool', 'Butler Service', 'King Bed', 'Panoramic View'].map((f) => (
                  <span key={f} className="text-xs font-body bg-primary-foreground/10 text-cream-dark px-3 py-1 border border-gold/20">
                    {f}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-6 mb-8">
                <span className="font-display text-gold text-3xl">$1,200</span>
                <span className="font-display text-cream-dark/40 text-xs tracking-widest uppercase">per night</span>
              </div>
              <Link
                href="/rooms/pharaohs-royal-chamber"
                className="inline-block bg-gradient-gold text-primary font-display text-sm tracking-[0.2em] uppercase px-10 py-4 hover:shadow-gold transition-all duration-300 hover:-translate-y-0.5"
              >
                View Suite
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-papyrus text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-4">Begin Your Journey</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">Reserve Your Royal Chamber</h2>
          <div className="w-24 h-px bg-gradient-gold mx-auto mb-6" />
          <p className="font-elegant text-muted-foreground text-lg italic mb-10">
            Experience luxury as the ancients knew it. Your pharaoh&apos;s sanctuary awaits.
          </p>
          <Link
            href="/reserve"
            className="inline-block bg-gradient-gold text-primary font-display text-sm tracking-[0.2em] uppercase px-12 py-4 hover:shadow-gold transition-all duration-300 hover:-translate-y-0.5"
          >
            Book Your Stay
          </Link>
        </div>
      </section>
    </>
  );
}
