'use client';
import React, { useEffect, useState } from 'react';
import { X, Tag, Sparkles } from 'lucide-react';
import { useActiveOffer } from '../../hooks/useActiveOffer';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cinzel: "'Cinzel', serif" as const,
  cormo: "'Cormorant Garamond', serif" as const,
  raleway: "'Raleway', sans-serif" as const,
};

function DiscountRow({ label, pct, icon }: { label: string; pct: number; icon: string }) {
  if (!pct) return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid hsl(43 72% 55% / 0.12)',
    }}>
      <span style={{ fontFamily: S.raleway, fontSize: '0.88rem', color: 'rgba(245,236,215,0.75)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{icon}</span> {label}
      </span>
      <span style={{
        fontFamily: S.cinzel, fontWeight: 700, fontSize: '1.1rem',
        background: `linear-gradient(135deg, ${S.gold}, ${S.goldLight})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {pct}% OFF
      </span>
    </div>
  );
}

export default function OfferPopup() {
  const { offer, loading } = useActiveOffer();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !offer) return;
    // Show once per session
    const key = `offer_seen_${offer._id}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(key, '1');
    }, 1200);
    return () => clearTimeout(timer);
  }, [offer, loading]);

  if (!visible || !offer) return null;

  const end = new Date(offer.endDate);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);

  return (
    <>
      <style>{`
        @keyframes rs-popup-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .rs-popup-card { animation: rs-popup-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => setVisible(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(13,27,62,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        {/* Card */}
        <div
          className="rs-popup-card"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '420px',
            background: `linear-gradient(160deg, ${S.navy} 0%, ${S.navyLight} 100%)`,
            border: '1px solid hsl(43 72% 55% / 0.35)',
            boxShadow: '0 32px 80px hsl(220 55% 10% / 0.6)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Decorative top bar */}
          <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${S.gold}, ${S.goldLight}, ${S.gold}, transparent)` }} />

          {/* Close button */}
          <button
            onClick={() => setVisible(false)}
            style={{
              position: 'absolute', top: '0.875rem', right: '0.875rem',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', color: 'rgba(245,236,215,0.5)',
              width: '1.75rem', height: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={13} />
          </button>

          {/* Header */}
          <div style={{ padding: '2rem 2rem 1.25rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'hsl(43 72% 55% / 0.15)', border: `1px solid hsl(43 72% 55% / 0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={20} color={S.gold} />
              </div>
            </div>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '0.85rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Limited Time Offer
            </p>
            <h2 style={{ fontFamily: S.cinzel, fontWeight: 700, fontSize: '1.35rem', color: S.goldLight, lineHeight: 1.2, marginBottom: '0.625rem' }}>
              {offer.title}
            </h2>
            {offer.description && (
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: 'rgba(245,236,215,0.6)', fontSize: '1rem', lineHeight: 1.5 }}>
                {offer.description}
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55% / 0.3), transparent)', margin: '0 1.5rem' }} />

          {/* Discounts */}
          <div style={{ margin: '0.75rem 0' }}>
            <DiscountRow label="Room Reservations" pct={offer.roomDiscount} icon="🏛️" />
            <DiscountRow label="In-Room Dining"    pct={offer.foodDiscount} icon="🍽️" />
            <DiscountRow label="Spa & Wellness"    pct={offer.spaDiscount}  icon="✨" />
          </div>

          {/* Footer */}
          <div style={{ padding: '1rem 2rem 1.75rem', textAlign: 'center' }}>
            {daysLeft > 0 && daysLeft <= 14 && (
              <p style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.4)', marginBottom: '1rem' }}>
                Offer ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </p>
            )}
            <button
              onClick={() => setVisible(false)}
              style={{
                width: '100%', padding: '0.875rem',
                background: `linear-gradient(135deg, ${S.gold}, ${S.goldLight})`,
                color: S.navy, border: 'none', cursor: 'pointer',
                fontFamily: S.cinzel, fontSize: '0.7rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <Sparkles size={14} />
              Claim This Offer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
