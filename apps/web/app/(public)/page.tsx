import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const ROOMS = [
  {
    name: 'Pharaoh Suite',
    description: 'The crown jewel — a palatial suite with hieroglyphic murals, gold-leaf furnishings, and a private terrace overlooking the gardens.',
    price: '$450',
    image: '/room-pharaoh.jpg',
    guests: 4,
    size: '95 m²',
    features: ['King Bed', 'Private Terrace', 'Jacuzzi', 'Living Area'],
    slug: 'pharaoh-suite',
  },
  {
    name: 'Royal Chamber',
    description: 'Opulent quarters adorned with navy and gold, featuring handcrafted Egyptian-inspired décor and premium amenities.',
    price: '$320',
    image: '/room-royal.jpg',
    guests: 2,
    size: '65 m²',
    features: ['King Bed', 'City View', 'Mini Bar', 'Sitting Area'],
    slug: 'royal-chamber',
  },
  {
    name: 'Deluxe Tomb',
    description: 'Elegantly appointed twin rooms inspired by the artistry of ancient tombs — a cozy sanctuary with authentic charm.',
    price: '$220',
    image: '/room-deluxe.jpg',
    guests: 2,
    size: '45 m²',
    features: ['Twin Beds', 'Garden View', 'Work Desk', 'Rain Shower'],
    slug: 'deluxe-tomb',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div className="absolute inset-0">
          <Image src="/hero-bg.jpg" alt="Royal Suites Hotel" fill className="object-cover" priority />
          <div className="absolute inset-0" style={{ background: 'hsl(220 55% 18% / 0.55)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(220 55% 18% / 0.85) 0%, transparent 50%, hsl(220 55% 18% / 0.3) 100%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 1rem', maxWidth: '56rem', margin: '0 auto', width: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div
              className="animate-fade-in-up"
              style={{ width: '128px', height: '128px', borderRadius: '50%', border: '4px solid hsl(43 72% 55%)', boxShadow: '0 4px 24px hsl(43 72% 55% / 0.4)', overflow: 'hidden', flexShrink: 0 }}
            >
              <Image src="/logo.jpg" alt="Royal Suites Logo" width={128} height={128} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} priority />
            </div>
          </div>

          <p className="animate-fade-in-up" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1.1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem', animationDelay: '0.2s', opacity: 0 }}>
            Welcome to
          </p>

          <h1 className="animate-fade-in-up" style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 'clamp(3rem, 8vw, 6rem)', background: 'linear-gradient(135deg, hsl(43 75% 40%), hsl(43 72% 55%), hsl(43 65% 72%), hsl(43 72% 55%), hsl(43 75% 40%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1, marginBottom: '0.75rem', animationDelay: '0.4s', opacity: 0 }}>
            Royal Suites
          </h1>

          <p className="animate-fade-in-up" style={{ fontFamily: "'Cinzel', serif", fontWeight: 400, fontSize: '1.2rem', color: 'hsl(35 25% 88%)', letterSpacing: '0.15em', marginBottom: '1.5rem', animationDelay: '0.5s', opacity: 0 }}>
            Boutique Hotel &amp; Spa
          </p>

          <div className="animate-fade-in-up" style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', margin: '0 auto 2rem', animationDelay: '0.6s', opacity: 0 }} />

          <p className="animate-fade-in-up" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.15rem', color: 'hsl(35 25% 88% / 0.8)', maxWidth: '36rem', margin: '0 auto 2.5rem', lineHeight: 1.7, animationDelay: '0.7s', opacity: 0 }}>
            Experience the grandeur of ancient Egypt reimagined for the modern traveler.
            Where timeless luxury meets pharaonic splendor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.9s', opacity: 0 }}>
            <Link href="/reserve" style={{ display: 'inline-block', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 2.5rem', transition: 'all 0.3s ease', fontWeight: 600 }}>
              Reserve Now
            </Link>
            <Link href="/rooms" style={{ display: 'inline-block', border: '1px solid hsl(43 72% 55%)', color: 'hsl(43 72% 55%)', fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 2.5rem', transition: 'all 0.3s ease' }}>
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

      {/* ── Rooms Section ── */}
      <section style={{ padding: '6rem 0', background: 'hsl(40 33% 96%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Accommodations
            </p>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: 'hsl(220 30% 12%)', marginBottom: '1rem' }}>
              Our Royal Chambers
            </h2>
            <div style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', margin: '0 auto 1.5rem' }} />
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'hsl(220 15% 40%)', fontSize: '1.1rem', maxWidth: '36rem', margin: '0 auto' }}>
              Each room tells a story of ancient grandeur, meticulously crafted for your comfort and wonder.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {ROOMS.map((room) => (
              <div
                key={room.name}
                className="group"
                style={{ background: '#fff', border: '1px solid hsl(35 25% 82%)', overflow: 'hidden', transition: 'all 0.5s ease', boxShadow: '0 8px 32px -8px hsl(220 55% 18% / 0.12)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(43 72% 55% / 0.5)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px -4px hsl(43 72% 55% / 0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(35 25% 82%)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px -8px hsl(220 55% 18% / 0.12)'; }}
              >
                {/* Image */}
                <div style={{ position: 'relative', overflow: 'hidden', height: '16rem' }}>
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'hsl(220 55% 18% / 0.9)', color: 'hsl(43 72% 65%)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', padding: '0.4rem 1rem', letterSpacing: '0.05em' }}>
                    {room.price}<span style={{ fontSize: '0.7rem', color: 'hsl(35 25% 88% / 0.7)' }}> / night</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: '1.2rem', color: 'hsl(220 30% 12%)', marginBottom: '0.75rem' }}>
                    {room.name}
                  </h3>
                  <p style={{ fontFamily: "'Raleway', sans-serif", color: 'hsl(220 15% 40%)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {room.description}
                  </p>

                  {/* Guests + Size */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'hsl(220 15% 40%)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Raleway', sans-serif" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(43 72% 55%)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {room.guests} Guests
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Raleway', sans-serif" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(43 72% 55%)" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                      {room.size}
                    </span>
                  </div>

                  {/* Feature tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {room.features.map((f) => (
                      <span key={f} style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.7rem', background: 'hsl(38 40% 92%)', color: 'hsl(220 15% 40%)', padding: '0.25rem 0.75rem' }}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Book Now */}
                  <Link
                    href={`/reserve?roomName=${encodeURIComponent(room.name)}`}
                    style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))', color: 'hsl(43 72% 65%)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem', transition: 'opacity 0.2s ease' }}
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* View all rooms */}
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link
              href="/rooms"
              style={{ display: 'inline-block', border: '1px solid hsl(43 72% 55%)', color: 'hsl(43 72% 55%)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem 2.5rem', transition: 'all 0.3s ease' }}
            >
              View All Rooms
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Room ── */}
      <section style={{ padding: '6rem 0', background: 'hsl(220 55% 18%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', minHeight: '480px', overflow: 'hidden' }} className="group">
              <Image src="/room-pharaoh.jpg" alt="Pharaoh's Royal Chamber" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.4rem 1rem', fontWeight: 600 }}>
                Featured Suite
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Crown Jewel</p>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', color: 'hsl(43 72% 65%)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                Pharaoh&apos;s Royal Chamber
              </h2>
              <div style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', marginBottom: '1.5rem' }} />
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.7)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                120 m² of hand-painted hieroglyphics, private pool terrace with panoramic views,
                24K gold-leaf accents, and round-the-clock butler service.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                {['Private Pool', 'Butler Service', 'King Bed', 'Panoramic View'].map((f) => (
                  <span key={f} style={{ fontFamily: "'Raleway', sans-serif", fontSize: '0.72rem', background: 'hsl(43 72% 65% / 0.1)', color: 'hsl(35 25% 88%)', padding: '0.3rem 0.8rem', border: '1px solid hsl(43 72% 55% / 0.2)' }}>
                    {f}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '2rem' }}>
                <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(43 72% 55%)', fontSize: '2rem', fontWeight: 600 }}>$1,200</span>
                <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(35 25% 88% / 0.4)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>per night</span>
              </div>
              <Link
                href="/rooms/pharaohs-royal-chamber"
                style={{ display: 'inline-block', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 2.5rem', fontWeight: 600, transition: 'all 0.3s ease' }}
              >
                View Suite
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '6rem 0', background: 'hsl(38 40% 92%)', textAlign: 'center' }}>
        <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem' }}>Begin Your Journey</p>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', color: 'hsl(220 30% 12%)', marginBottom: '1rem' }}>
            Reserve Your Royal Chamber
          </h2>
          <div style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', margin: '0 auto 1.5rem' }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'hsl(220 15% 40%)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Experience luxury as the ancients knew it. Your pharaoh&apos;s sanctuary awaits.
          </p>
          <Link
            href="/reserve"
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 3rem', fontWeight: 600, transition: 'all 0.3s ease' }}
          >
            Book Your Stay
          </Link>
        </div>
      </section>
    </>
  );
}
