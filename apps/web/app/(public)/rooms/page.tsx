import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, BedDouble, ArrowRight, Star } from 'lucide-react';

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

const TYPE_LABELS: Record<string, string> = {
  standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite', royal: 'Royal',
};

async function getRooms() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rooms`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()).rooms || [];
  } catch { return []; }
}

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <>
      <style>{`
        .rc{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:all 0.4s ease;box-shadow:0 4px 24px -4px hsl(220 55% 18%/0.1);}
        .rc:hover{border-color:hsl(43 72% 55%/0.5);box-shadow:0 4px 20px -4px hsl(43 72% 55%/0.25);transform:translateY(-2px);}
        .rc:hover .rc-img{transform:scale(1.07);}
        .rc-img{transition:transform 0.7s ease;width:100%;height:100%;object-fit:cover;display:block;}
        .rc-btn{display:block;text-align:center;background:linear-gradient(135deg,hsl(220 55% 18%),hsl(220 40% 28%));color:hsl(43 72% 65%);font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem;transition:opacity 0.2s;}
        .rc-btn:hover{opacity:0.88;}
      `}</style>

      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: S.cream }}>
        {/* Header */}
        <div style={{ background: S.navy, padding: '5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <Image src="/hero-bg.jpg" alt="" fill style={{ objectFit: 'cover', opacity: 0.18 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Our Collection</p>
          <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Royal Chambers</h1>
          <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 1.5rem' }} />
          <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.7)', fontSize: '1.15rem', maxWidth: '36rem', margin: '0 auto' }}>
            Each room is a tribute to Egyptian splendor — from the gods-blessed Standard to the legendary Pharaoh&apos;s Royal Chamber.
          </p>
          </div>
        </div>

        {/* Grid */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem 0' }}>
              <p style={{ fontFamily: S.cinzel, color: S.muted, letterSpacing: '0.1em' }}>No rooms available at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
              {rooms.map((room: any) => (
                <Link key={room._id} href={`/rooms/${room.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div className="rc">
                    {/* Image */}
                    <div style={{ position: 'relative', overflow: 'hidden', height: '15rem' }}>
                      <Image src={room.images?.[0] || '/room-deluxe.jpg'} alt={room.name} fill className="rc-img" />
                      {/* Type badge */}
                      <div style={{ position: 'absolute', top: '0.875rem', left: '0.875rem', background: S.gradGold, color: S.navy, fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', fontWeight: 700 }}>
                        {TYPE_LABELS[room.type] || room.type}
                      </div>
                      {/* Price badge */}
                      <div style={{ position: 'absolute', top: '0.875rem', right: '0.875rem', background: 'hsl(220 55% 18% / 0.92)', color: 'hsl(43 72% 65%)', fontFamily: S.cinzel, fontSize: '0.82rem', padding: '0.35rem 0.875rem', letterSpacing: '0.05em' }}>
                        ${room.pricePerNight}<span style={{ fontSize: '0.65rem', color: 'hsl(35 25% 88% / 0.6)' }}> / night</span>
                      </div>
                      {!room.isAvailable && (
                        <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18% / 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: S.cinzel, color: S.cream, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.85rem' }}>Unavailable</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem' }}>
                      <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: '1.05rem', color: S.navy, marginBottom: '0.5rem' }}>{room.name}</h2>
                      <p style={{ fontFamily: S.raleway, color: S.muted, fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {room.description}
                      </p>

                      {/* Quick stats */}
                      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem' }}>
                        {room.capacity && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted }}>
                            <Users size={13} color={S.gold} strokeWidth={1.8} />
                            {room.capacity} Guests
                          </span>
                        )}
                        {room.type && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted }}>
                            <BedDouble size={13} color={S.gold} strokeWidth={1.8} />
                            {TYPE_LABELS[room.type] || room.type}
                          </span>
                        )}
                        {room.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted }}>
                            <Star size={12} color={S.gold} strokeWidth={1.8} fill={S.gold} />
                            {room.rating}
                          </span>
                        )}
                      </div>

                      {/* Amenity tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                        {room.amenities?.slice(0, 3).map((a: string) => (
                          <span key={a} style={{ fontFamily: S.raleway, fontSize: '0.68rem', background: S.papyrus, color: S.muted, padding: '0.2rem 0.6rem', border: `1px solid ${S.border}` }}>{a}</span>
                        ))}
                        {room.amenities?.length > 3 && (
                          <span style={{ fontFamily: S.raleway, fontSize: '0.68rem', color: S.gold }}>+{room.amenities.length - 3}</span>
                        )}
                      </div>

                      <div className="rc-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        View Room <ArrowRight size={13} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
