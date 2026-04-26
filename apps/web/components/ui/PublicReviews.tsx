'use client';
import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const S = {
  gold: 'hsl(43 72% 55%)', navy: 'hsl(220 55% 18%)',
  cream: 'hsl(40 33% 96%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

function StarRow({ value, size = 14 }: { value: number | null; size?: number }) {
  if (!value) return <span style={{ color: S.muted, fontSize: '0.75rem' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} strokeWidth={1.5} fill={n <= Math.round(value) ? S.gold : 'none'} color={n <= Math.round(value) ? S.gold : S.muted} />
      ))}
      <span style={{ marginLeft: '0.35rem', fontFamily: S.cinzel, fontSize: '0.7rem', color: S.navy }}>{value.toFixed(1)}</span>
    </span>
  );
}

export default function PublicReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats]     = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/reviews/public?limit=4`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews ?? []); setStats(d.stats ?? null); })
      .catch(() => {});
  }, []);

  if (!stats || stats.total === 0) return null;

  return (
    <section style={{ padding: '6rem 0', background: S.navy }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Guest Voices
          </p>
          <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'hsl(40 30% 94%)', marginBottom: '1rem' }}>
            What Our Guests Say
          </h2>
          <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 2rem' }} />

          {/* Aggregate score + dept breakdown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: S.cinzel, color: S.gold, fontSize: '3rem', lineHeight: 1 }}>{stats.overall?.toFixed(1) ?? '—'}</p>
              <StarRow value={stats.overall} size={18} />
              <p style={{ fontFamily: S.cinzel, color: 'hsl(40 30% 70%)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.4rem' }}>
                Overall · {stats.total} review{stats.total !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={{ width: '1px', height: '4rem', background: 'hsl(43 72% 55% / 0.25)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Room & Hotel', val: stats.room },
                { label: 'Food & Dining', val: stats.food },
                { label: 'Spa',          val: stats.spa  },
              ].filter(d => d.val !== null).map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: S.cinzel, color: 'hsl(40 30% 65%)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', minWidth: '7rem', textAlign: 'right' }}>{label}</span>
                  <StarRow value={val} size={13} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Review cards */}
        {reviews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'hsl(220 40% 22%)', border: '1px solid hsl(43 72% 55% / 0.15)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Stars */}
                <StarRow value={r.overallRating} size={14} />

                {/* Feedback snippet — prefer room, fall back to food or spa */}
                {(r.roomFeedback || r.foodFeedback || r.spaFeedback) && (
                  <p style={{ fontFamily: S.cormo, fontStyle: 'italic', fontSize: '1rem', color: 'hsl(35 25% 88% / 0.85)', lineHeight: 1.65, flex: 1 }}>
                    "{(r.roomFeedback || r.foodFeedback || r.spaFeedback)?.slice(0, 180)}{(r.roomFeedback || r.foodFeedback || r.spaFeedback)?.length > 180 ? '…' : ''}"
                  </p>
                )}

                {/* Guest name + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid hsl(43 72% 55% / 0.12)', marginTop: 'auto' }}>
                  <span style={{ fontFamily: S.cinzel, color: S.gold, fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                    {r.guest?.name?.split(' ')[0] ?? 'Guest'}
                  </span>
                  <span style={{ fontFamily: S.raleway, color: 'hsl(40 30% 55%)', fontSize: '0.68rem' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
