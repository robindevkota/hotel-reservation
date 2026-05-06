import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Star, Maximize2, Users } from 'lucide-react';
import RoomBookingCard from '../../../../components/ui/RoomBookingCard';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

async function getRoom(slug: string) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const [roomRes, reviewsRes] = await Promise.all([
      fetch(`${base}/rooms/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${base}/reviews/public?limit=1`, { next: { revalidate: 60 } }).catch(() => null),
    ]);
    if (!roomRes.ok) return null;
    const room = (await roomRes.json()).room;
    const roomRating: number | null = reviewsRes?.ok ? ((await reviewsRes.json()).stats?.room ?? null) : null;
    return { room, roomRating };
  } catch { return null; }
}

export default async function RoomDetailPage({ params }: { params: { slug: string } }) {
  const result = await getRoom(params.slug);
  if (!result) notFound();
  const { room, roomRating } = result;

  const fallback = '/room-pharaoh.jpg';
  const heroImg  = room.images?.[0] || fallback;
  const gallery  = room.images?.slice(1) || [];

  const typeLabel = (room.type as string).charAt(0).toUpperCase() + room.type.slice(1);

  return (
    <>
      <style suppressHydrationWarning>{`
        .gal-img{transition:transform 0.7s ease;}
        .gal-wrap:hover .gal-img{transform:scale(1.08);}
        .amenity-item{display:flex;align-items:center;gap:0.625rem;padding:0.625rem 0.75rem;background:#fff;border:1px solid hsl(35 25% 82%);font-family:'Raleway',sans-serif;font-size:0.8rem;color:hsl(220 15% 40%);}
        .res-cta{display:block;text-align:center;background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;padding:1rem;font-weight:600;transition:opacity 0.2s;}
        .res-cta:hover{opacity:0.88;}
        .back-link{display:block;text-align:center;margin-top:0.875rem;font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,236,215,0.4);transition:color 0.2s;}
        .back-link:hover{color:hsl(43 72% 55%);}
      `}</style>

      <div style={{ minHeight: '100vh', background: S.navy }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', height: '70vh', minHeight: '480px', overflow: 'hidden', background: S.navy, marginTop: 0 }}>
          <Image src={heroImg} alt={room.name} fill style={{ objectFit: 'cover', opacity: 0.75 }} priority />
          {/* layered overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(220 55% 18%) 0%, hsl(220 55% 18% / 0.55) 40%, transparent 75%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, hsl(220 55% 18% / 0.4) 0%, transparent 60%)' }} />

          {/* Text */}
          <div className="room-hero-text">
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {typeLabel} · Floor {room.floorNumber}
            </p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: S.goldLight, marginBottom: '1rem', lineHeight: 1.1 }}>
              {room.name}
            </h1>
            <div style={{ width: '5rem', height: '1px', background: S.divider, marginBottom: '1rem' }} />
            {/* Specs row */}
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {room.capacity > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: S.raleway, fontSize: '0.82rem', color: 'hsl(35 25% 88% / 0.75)' }}>
                  <Users size={14} color={S.gold} strokeWidth={1.5} />
                  {room.capacity} Guests
                </span>
              )}
              {room.areaSqm > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: S.raleway, fontSize: '0.82rem', color: 'hsl(35 25% 88% / 0.75)' }}>
                  <Maximize2 size={14} color={S.gold} strokeWidth={1.5} />
                  {room.areaSqm} m²
                </span>
              )}
              {roomRating != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={14} strokeWidth={1.5} fill={n <= Math.round(roomRating) ? S.gold : 'none'} color={n <= Math.round(roomRating) ? S.gold : 'hsl(35 25% 82% / 0.5)'} />
                  ))}
                  <span style={{ fontFamily: S.cinzel, fontSize: '0.78rem', color: S.gold, fontWeight: 600, marginLeft: '0.2rem' }}>{roomRating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="room-body">
          <div className="room-grid">

            {/* ── Left: main content ── */}
            <div>
              {/* Description */}
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '1.2rem', color: S.muted, lineHeight: 1.75, marginBottom: '2.5rem' }}>
                {room.description}
              </p>

              {/* Gallery */}
              {gallery.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem', marginBottom: '3rem' }}>
                  {gallery.map((img: string, i: number) => (
                    <div key={i} className="gal-wrap" style={{ position: 'relative', height: '13rem', overflow: 'hidden' }}>
                      <Image src={img} alt={`${room.name} view ${i + 2}`} fill className="gal-img" style={{ objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Amenities */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.navy }}>Room Amenities</h2>
                  <div style={{ flex: 1, height: '1px', background: S.divider }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
                  {room.amenities?.map((a: string) => (
                    <div key={a} className="amenity-item">
                      <CheckCircle2 size={14} color={S.gold} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: booking card ── */}
            <RoomBookingCard room={room} typeLabel={typeLabel} />
          </div>
        </div>
      </div>
    </>
  );
}
