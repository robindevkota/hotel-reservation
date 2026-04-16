'use client';
import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { useActiveOffer, ActiveOffer } from '../../hooks/useActiveOffer';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)', goldDark: 'hsl(43 75% 40%)',
  navy: 'hsl(220 55% 18%)',
  cinzel: "'Cinzel', serif" as const,
  cormo: "'Cormorant Garamond', serif" as const,
};

function DiscountPill({ label, pct }: { label: string; pct: number }) {
  if (!pct) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
      color: '#fff', fontFamily: S.cinzel, fontSize: '0.62rem',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '0.25rem 0.65rem', whiteSpace: 'nowrap',
    }}>
      <strong style={{ color: S.goldLight }}>{pct}%</strong> off {label}
    </span>
  );
}

interface Props {
  /** Restrict to only showing a banner when this category has a discount */
  filter?: 'room' | 'food' | 'spa';
}

export default function OfferBanner({ filter }: Props) {
  const { offer, loading } = useActiveOffer();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !offer) return null;

  // If a filter is given, skip the banner when that category has 0% discount
  if (filter === 'room' && !offer.roomDiscount) return null;
  if (filter === 'food' && !offer.foodDiscount) return null;
  if (filter === 'spa'  && !offer.spaDiscount)  return null;

  const end = new Date(offer.endDate);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);

  return (
    <>
      <style>{`
        @keyframes rs-offer-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .rs-offer-banner {
          background: linear-gradient(
            135deg,
            hsl(220 55% 18%) 0%,
            hsl(220 45% 24%) 40%,
            hsl(43 72% 38%) 60%,
            hsl(220 45% 24%) 80%,
            hsl(220 55% 18%) 100%
          );
          background-size: 400px 100%;
          animation: rs-offer-shimmer 4s linear infinite;
        }
      `}</style>
      <div
        className="rs-offer-banner"
        role="banner"
        style={{
          position: 'relative',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', flexWrap: 'wrap',
          borderBottom: '1px solid hsl(43 72% 55% / 0.35)',
        }}
      >
        {/* Tag icon */}
        <Tag size={14} color={S.goldLight} style={{ flexShrink: 0 }} />

        {/* Title + description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: S.goldLight, fontWeight: 700 }}>
            {offer.title}
          </span>
          {offer.description && (
            <span style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(245,236,215,0.75)' }}>
              — {offer.description}
            </span>
          )}
        </div>

        {/* Discount pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(!filter || filter === 'room') && <DiscountPill label="Rooms" pct={offer.roomDiscount} />}
          {(!filter || filter === 'food') && <DiscountPill label="Food"  pct={offer.foodDiscount} />}
          {(!filter || filter === 'spa')  && <DiscountPill label="Spa"   pct={offer.spaDiscount}  />}
        </div>

        {/* Expires */}
        {daysLeft > 0 && daysLeft <= 7 && (
          <span style={{ fontFamily: S.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', color: 'rgba(245,236,215,0.55)', whiteSpace: 'nowrap' }}>
            Ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </span>
        )}

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offer"
          style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(245,236,215,0.45)', display: 'flex', padding: '0.25rem',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </>
  );
}
