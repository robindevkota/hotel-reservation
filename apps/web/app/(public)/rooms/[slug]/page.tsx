import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, ConciergeBell } from 'lucide-react';

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
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rooms/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()).room;
  } catch { return null; }
}

export default async function RoomDetailPage({ params }: { params: { slug: string } }) {
  const room = await getRoom(params.slug);
  if (!room) notFound();

  const fallback = '/room-pharaoh.jpg';
  const heroImg  = room.images?.[0] || fallback;
  const gallery  = room.images?.slice(1) || [];

  const typeLabel = (room.type as string).charAt(0).toUpperCase() + room.type.slice(1);

  return (
    <>
      <style>{`
        .gal-img{transition:transform 0.7s ease;}
        .gal-wrap:hover .gal-img{transform:scale(1.08);}
        .amenity-item{display:flex;align-items:center;gap:0.625rem;padding:0.625rem 0.75rem;background:#fff;border:1px solid hsl(35 25% 82%);font-family:'Raleway',sans-serif;font-size:0.8rem;color:hsl(220 15% 40%);}
        .res-cta{display:block;text-align:center;background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;padding:1rem;font-weight:600;transition:opacity 0.2s;}
        .res-cta:hover{opacity:0.88;}
        .back-link{display:block;text-align:center;margin-top:0.875rem;font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,236,215,0.4);transition:color 0.2s;}
        .back-link:hover{color:hsl(43 72% 55%);}
      `}</style>

      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: S.cream }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', height: '70vh', minHeight: '480px', overflow: 'hidden', background: S.navy }}>
          <Image src={heroImg} alt={room.name} fill style={{ objectFit: 'cover', opacity: 0.75 }} priority />
          {/* layered overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(220 55% 18%) 0%, hsl(220 55% 18% / 0.55) 40%, transparent 75%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, hsl(220 55% 18% / 0.4) 0%, transparent 60%)' }} />

          {/* Text */}
          <div style={{ position: 'absolute', bottom: '3rem', left: 0, right: 0, maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {typeLabel} · Floor {room.floorNumber}
            </p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: S.goldLight, marginBottom: '1rem', lineHeight: 1.1 }}>
              {room.name}
            </h1>
            <div style={{ width: '5rem', height: '1px', background: S.divider }} />
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3.5rem', alignItems: 'start' }}>

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
            <div style={{ position: 'sticky', top: '6rem' }}>
              <div style={{ background: S.navy, border: `1px solid hsl(43 72% 55% / 0.2)`, overflow: 'hidden' }}>
                {/* Price header */}
                <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: `1px solid hsl(43 72% 55% / 0.15)`, textAlign: 'center' }}>
                  <div style={{ fontFamily: S.cinzel, fontSize: '2.5rem', fontWeight: 700, color: S.gold, lineHeight: 1 }}>
                    ${room.pricePerNight}
                  </div>
                  <div style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: 'rgba(245,236,215,0.45)', marginTop: '0.25rem', letterSpacing: '0.08em' }}>per night</div>
                  <div style={{ width: '4rem', height: '1px', background: S.divider, margin: '1.25rem auto 0' }} />
                </div>

                {/* Details */}
                <div style={{ padding: '1.5rem 2rem' }}>
                  {[
                    ['Capacity', `${room.capacity} Guests`],
                    ['Room No.', `#${room.roomNumber}`],
                    ['Floor',    `${room.floorNumber}`],
                    ['Type',     typeLabel],
                  ].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid hsl(43 72% 55% / 0.1)' }}>
                      <span style={{ fontFamily: S.cinzel, fontSize: '0.63rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.4)' }}>{k}</span>
                      <span style={{ fontFamily: S.raleway, fontSize: '0.85rem', color: 'rgba(245,236,215,0.85)', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: '1.25rem 1.5rem 1.75rem' }}>
                  {room.isAvailable ? (
                    <Link
                      href={`/reserve?room=${room._id}&roomName=${encodeURIComponent(room.name)}&price=${room.pricePerNight}`}
                      className="res-cta"
                    >
                      Reserve This Room
                    </Link>
                  ) : (
                    <div style={{ display: 'block', textAlign: 'center', border: '1px solid rgba(245,236,215,0.15)', color: 'rgba(245,236,215,0.3)', fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem', cursor: 'not-allowed' }}>
                      Currently Unavailable
                    </div>
                  )}
                  <Link href="/rooms" className="back-link">← All Rooms</Link>
                </div>
              </div>

              {/* Trust strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                {[
                  { Icon: CheckCircle2, title: 'Free Cancellation', sub: '24h before check-in' },
                  { Icon: ConciergeBell, title: 'Butler Service',   sub: 'Available 24/7' },
                ].map(({ Icon, title, sub }) => (
                  <div key={title} style={{ background: '#fff', border: `1px solid ${S.border}`, padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', color: S.gold, marginBottom: '0.3rem' }}><Icon size={20} strokeWidth={1.5} /></div>
                    <div style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.2rem' }}>{title}</div>
                    <div style={{ fontFamily: S.raleway, fontSize: '0.65rem', color: S.muted }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
