'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Maximize2, Star } from 'lucide-react';
import { useActiveOffer } from '../../hooks/useActiveOffer';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif" as const,
  cormo: "'Cormorant Garamond', serif" as const,
  raleway: "'Raleway', sans-serif" as const,
};

export default function FeaturedRoomsClient({ rooms, roomRating }: { rooms: any[]; roomRating?: number | null }) {
  const { offer } = useActiveOffer();
  const mult = offer?.roomDiscount ? (1 - offer.roomDiscount / 100) : 1;
  const disc = (p: number) => Math.round(p * mult * 100) / 100;

  return (
    <div className="rooms-grid">
      {rooms.map((room: any) => (
        <div key={room._id || room.name} className="room-card">
          <div style={{ position: 'relative', overflow: 'hidden', height: '16rem' }}>
            <Image src={room.images?.[0] || '/room-deluxe.jpg'} alt={room.name} fill className="room-img" />
            {room._categoryName && (
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: S.gradGold, color: S.navy, fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', fontWeight: 700 }}>
                {room._categoryName}
              </div>
            )}
            {/* Price badge — shows discounted price when offer active */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'hsl(220 55% 18% / 0.9)', fontFamily: S.cinzel, fontSize: '0.85rem', padding: '0.4rem 1rem', textAlign: 'right' }}>
              {mult < 1 ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', flexWrap: 'nowrap' }}>
                  <span style={{ color: S.goldLight, fontWeight: 700, fontSize: '0.9rem' }}>${disc(room.pricePerNight)}</span>
                  <span style={{ fontSize: '0.68rem', color: 'hsl(35 25% 88% / 0.8)', textDecoration: 'line-through' }}>${room.pricePerNight}</span>
                  <span style={{ fontSize: '0.6rem', color: 'hsl(35 25% 88% / 0.65)' }}>/nt</span>
                </span>
              ) : (
                <>
                  <span style={{ color: 'hsl(43 72% 65%)' }}>From ${room.pricePerNight}</span>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(35 25% 88% / 0.7)' }}> / night</span>
                </>
              )}
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: '1.1rem', color: S.navy, marginBottom: '0.6rem' }}>{room.name}</h3>
            <p style={{ fontFamily: S.raleway, color: S.muted, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>{room.description}</p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem', fontSize: '0.75rem', color: S.muted, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway }}>
                <Users size={13} color={S.gold} />
                {room.capacity} Guests
              </span>
              {room.areaSqm > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway }}>
                  <Maximize2 size={13} color={S.gold} />
                  {room.areaSqm} m²
                </span>
              )}
              {roomRating != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={12} fill={S.gold} color={S.gold} strokeWidth={1.5} />
                  <span style={{ fontFamily: S.cinzel, fontSize: '0.72rem', color: S.navy, fontWeight: 600 }}>{roomRating.toFixed(1)}</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {(room.amenities || []).slice(0, 4).map((f: string) => (
                <span key={f} style={{ fontFamily: S.raleway, fontSize: '0.68rem', background: S.papyrus, color: S.muted, padding: '0.2rem 0.6rem', border: '1px solid hsl(35 25% 82%)' }}>{f}</span>
              ))}
            </div>
            <Link href={`/rooms/${room.slug}`} style={{ display: 'block', textAlign: 'center', background: S.gradNavy, color: 'hsl(43 72% 65%)', fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem' }}>
              View Room →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
