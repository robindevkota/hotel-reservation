import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FeaturedRoomsClient from '../../components/ui/FeaturedRoomsClient';
import OfferBanner from '../../components/ui/OfferBanner';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)', goldDark: 'hsl(43 75% 40%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  gradGoldTxt: 'linear-gradient(135deg, hsl(43 75% 40%), hsl(43 72% 55%), hsl(43 65% 72%), hsl(43 72% 55%), hsl(43 75% 40%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

async function getFeaturedRooms() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const [roomsRes, catsRes] = await Promise.all([
      fetch(`${base}/rooms`, { next: { revalidate: 60 } }),
      fetch(`${base}/room-categories`, { next: { revalidate: 60 } }),
    ]);
    if (!roomsRes.ok) return [];
    const rooms: any[] = (await roomsRes.json()).rooms || [];
    const categories: any[] = catsRes.ok ? ((await catsRes.json()).categories || []) : [];

    // Pick the cheapest available room per category, in category order
    const seen = new Set<string>();
    const featured: any[] = [];
    for (const cat of categories) {
      const match = rooms
        .filter(r => (r.categorySlug || r.type) === cat.slug)
        .sort((a, b) => a.pricePerNight - b.pricePerNight)[0];
      if (match && !seen.has(match._id)) {
        seen.add(match._id);
        featured.push({ ...match, _categoryName: cat.name, _categoryIcon: cat.icon });
      }
    }
    return featured;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const rooms = await getFeaturedRooms();
  return (
    <>
      <style>{`
        .room-card{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:all 0.5s ease;box-shadow:0 8px 32px -8px hsl(220 55% 18%/0.12);}
        .room-card:hover{border-color:hsl(43 72% 55%/0.5);box-shadow:0 4px 20px -4px hsl(43 72% 55%/0.3);}
        .room-card:hover .room-img{transform:scale(1.08);}
        .room-img{transition:transform 0.7s ease;width:100%;height:100%;object-fit:cover;display:block;}
        .rooms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem;}
        @media(max-width:640px){.rooms-grid{grid-template-columns:1fr;}}
      `}</style>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/hero-bg.jpg" alt="Royal Suites Hotel" fill style={{ objectFit: 'cover' }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18% / 0.55)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(220 55% 18% / 0.85) 0%, transparent 50%, hsl(220 55% 18% / 0.3) 100%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 1rem', maxWidth: '56rem', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '128px', height: '128px', borderRadius: '50%', border: `4px solid ${S.gold}`, boxShadow: '0 4px 24px hsl(43 72% 55% / 0.4)', overflow: 'hidden', flexShrink: 0 }}>
              <Image src="/logo.jpg" alt="Royal Suites Logo" width={128} height={128} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} priority />
            </div>
          </div>

          <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1.1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem' }}>Welcome to</p>
          <h1 style={{ fontFamily: S.cinzel, fontWeight: 800, fontSize: 'clamp(3rem, 8vw, 6rem)', background: S.gradGoldTxt, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1, marginBottom: '0.75rem' }}>
            Royal Suites
          </h1>
          <p style={{ fontFamily: S.cinzel, fontWeight: 400, fontSize: '1.2rem', color: S.cream, letterSpacing: '0.15em', marginBottom: '1.5rem' }}>Boutique Hotel &amp; Spa</p>
          <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 2rem' }} />
          <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '1.15rem', color: 'hsl(35 25% 88% / 0.8)', maxWidth: '36rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Experience the grandeur of ancient Egypt reimagined for the modern traveler. Where timeless luxury meets pharaonic splendor.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/reserve" style={{ display: 'inline-block', background: S.gradGold, color: S.navy, fontFamily: S.cinzel, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 2.5rem', fontWeight: 600 }}>Reserve Now</Link>
            <Link href="/rooms" style={{ display: 'inline-block', border: `1px solid ${S.gold}`, color: S.gold, fontFamily: S.cinzel, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 2.5rem' }}>Explore Rooms</Link>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ width: '1.5rem', height: '2.5rem', border: `2px solid hsl(43 72% 55% / 0.5)`, borderRadius: '9999px', display: 'flex', justifyContent: 'center', paddingTop: '0.4rem' }}>
            <div style={{ width: '0.25rem', height: '0.5rem', background: S.gold, borderRadius: '9999px' }} />
          </div>
        </div>
      </section>

      <OfferBanner />
      {/* ── Featured Rooms ── */}
      <section style={{ padding: '6rem 0', background: S.cream }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Accommodations</p>
            <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: S.navy, marginBottom: '1rem' }}>Our Royal Chambers</h2>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 1.5rem' }} />
            <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1.1rem', maxWidth: '36rem', margin: '0 auto' }}>
              Each room tells a story of ancient grandeur, meticulously crafted for your comfort and wonder.
            </p>
          </div>

          <FeaturedRoomsClient rooms={rooms} />

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/rooms" style={{ display: 'inline-block', border: `1px solid ${S.gold}`, color: S.gold, fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem 2.5rem' }}>View All Rooms</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 0', background: S.navy, textAlign: 'center' }}>
        <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem' }}>Begin Your Journey</p>
          <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', color: S.goldLight, marginBottom: '1rem' }}>Reserve Your Royal Chamber</h2>
          <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 1.5rem' }} />
          <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.6)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Experience luxury as the ancients knew it. Your pharaoh&apos;s sanctuary awaits.
          </p>
          <Link href="/reserve" style={{ display: 'inline-block', background: S.gradGold, color: S.navy, fontFamily: S.cinzel, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem 3rem', fontWeight: 600 }}>
            Book Your Stay
          </Link>
        </div>
      </section>
    </>
  );
}
