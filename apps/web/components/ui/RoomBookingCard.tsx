'use client';
import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ConciergeBell } from 'lucide-react';
import { useActiveOffer } from '../../hooks/useActiveOffer';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)',
  cream: 'hsl(40 33% 96%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif" as const,
  raleway: "'Raleway', sans-serif" as const,
};

interface Props {
  room: {
    _id: string;
    name: string;
    pricePerNight: number;
    capacity: number;
    roomNumber: string | number;
    floorNumber: string | number;
    type: string;
    slug: string;
    isAvailable: boolean;
  };
  typeLabel: string;
}

export default function RoomBookingCard({ room, typeLabel }: Props) {
  const { offer } = useActiveOffer();
  const mult = offer?.roomDiscount ? (1 - offer.roomDiscount / 100) : 1;
  const discPrice = Math.round(room.pricePerNight * mult * 100) / 100;

  return (
    <div style={{ position: 'sticky', top: '6rem' }}>
      <div style={{ background: S.navy, border: `1px solid hsl(43 72% 55% / 0.2)`, overflow: 'hidden' }}>
        {/* Price header */}
        <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: `1px solid hsl(43 72% 55% / 0.15)`, textAlign: 'center' }}>
          {mult < 1 ? (
            <>
              {/* Offer discount badge */}
              <div style={{ display: 'inline-block', background: 'hsl(43 72% 55% / 0.15)', border: '1px solid hsl(43 72% 55% / 0.3)', fontFamily: S.cinzel, fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.goldLight, padding: '0.25rem 0.75rem', marginBottom: '0.75rem' }}>
                {offer!.title} — {offer!.roomDiscount}% OFF
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.6rem' }}>
                <div style={{ fontFamily: S.cinzel, fontSize: '2.5rem', fontWeight: 700, color: S.gold, lineHeight: 1 }}>
                  ${discPrice}
                </div>
                <div style={{ fontFamily: S.cinzel, fontSize: '1.1rem', color: 'rgba(245,236,215,0.3)', textDecoration: 'line-through' }}>
                  ${room.pricePerNight}
                </div>
              </div>
              <div style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: 'rgba(245,236,215,0.45)', marginTop: '0.25rem', letterSpacing: '0.08em' }}>per night</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: S.cinzel, fontSize: '2.5rem', fontWeight: 700, color: S.gold, lineHeight: 1 }}>
                ${room.pricePerNight}
              </div>
              <div style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: 'rgba(245,236,215,0.45)', marginTop: '0.25rem', letterSpacing: '0.08em' }}>per night</div>
            </>
          )}
          <div style={{ width: '4rem', height: '1px', background: S.divider, margin: '1.25rem auto 0' }} />
        </div>

        {/* Details */}
        <div style={{ padding: '1.5rem 2rem' }}>
          {([
            ['Capacity', `${room.capacity} Guests`],
            ['Room No.', `#${room.roomNumber}`],
            ['Floor',    `${room.floorNumber}`],
            ['Type',     typeLabel],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid hsl(43 72% 55% / 0.1)' }}>
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
              style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: S.navy, fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem', fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s' }}
            >
              Reserve This Room
            </Link>
          ) : (
            <div style={{ display: 'block', textAlign: 'center', border: '1px solid rgba(245,236,215,0.15)', color: 'rgba(245,236,215,0.3)', fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem', cursor: 'not-allowed' }}>
              Currently Unavailable
            </div>
          )}
          <Link href="/rooms" style={{ display: 'block', textAlign: 'center', marginTop: '0.875rem', fontFamily: S.cinzel, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.4)', textDecoration: 'none' }}>
            ← All Rooms
          </Link>
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
  );
}
