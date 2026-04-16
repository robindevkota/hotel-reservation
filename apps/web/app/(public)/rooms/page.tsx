'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, ArrowRight, Maximize2 } from 'lucide-react';

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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCat, setActiveCat] = useState('all');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(9999);
  const [priceMaxBound, setPriceMaxBound] = useState(9999);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    Promise.all([
      fetch(`${base}/rooms`).then(r => r.json()),
      fetch(`${base}/room-categories`).then(r => r.json()),
    ]).then(([rd, cd]) => {
      const r: any[] = rd.rooms || [];
      const c: any[] = cd.categories || [];
      setRooms(r);
      setCategories(c);
      if (r.length) {
        const max = Math.max(...r.map((x: any) => x.pricePerNight));
        setPriceMax(max);
        setPriceMaxBound(max);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rooms.filter(r => {
    const catMatch = activeCat === 'all' || (r.categorySlug || r.type) === activeCat;
    const priceMatch = r.pricePerNight >= priceMin && r.pricePerNight <= priceMax;
    return catMatch && priceMatch;
  }), [rooms, activeCat, priceMin, priceMax]);

  return (
    <>
      <style>{`
        .rc{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:all 0.4s ease;box-shadow:0 4px 24px -4px hsl(220 55% 18%/0.1);}
        .rc:hover{border-color:hsl(43 72% 55%/0.5);box-shadow:0 4px 20px -4px hsl(43 72% 55%/0.25);transform:translateY(-2px);}
        .rc:hover .rc-img{transform:scale(1.07);}
        .rc-img{transition:transform 0.7s ease;width:100%;height:100%;object-fit:cover;display:block;}
        .rc-btn{display:block;text-align:center;background:linear-gradient(135deg,hsl(220 55% 18%),hsl(220 40% 28%));color:hsl(43 72% 65%);font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem;transition:opacity 0.2s;}
        .rc-btn:hover{opacity:0.88;}
        .cat-tab{font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.5rem 1.1rem;cursor:pointer;border:1px solid;transition:all 0.2s;white-space:nowrap;}
        .price-slider{-webkit-appearance:none;appearance:none;width:100%;height:3px;background:hsl(35 25% 82%);outline:none;border-radius:0;margin:0;}
        .price-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;background:hsl(43 72% 55%);cursor:pointer;border-radius:0;}
        .price-slider::-webkit-slider-thumb:hover{background:hsl(43 65% 72%);}
        .slider-wrap{overflow:hidden;padding:8px 0;}
        .cat-tabs::-webkit-scrollbar{display:none;}
        .price-filter-row{display:flex;justify-content:center;align-items:center;gap:1.25rem;padding:0.875rem 0 1rem;flex-wrap:wrap;}
        .slider-container{display:flex;align-items:center;gap:0.5rem;width:16rem;max-width:calc(100vw - 12rem);}
        @media(max-width:600px){.price-filter-row{gap:0.75rem;}.slider-container{width:100%;max-width:100%;min-width:0;}}
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

        {/* Filters */}
        <div style={{ background: '#fff', borderBottom: 'none', position: 'sticky', top: '4rem', zIndex: 20, boxShadow: '0 1px 0 0 transparent' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            {/* Category tabs — centred */}
            <div className="cat-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '0', overflowX: 'auto', paddingTop: '1rem', scrollbarWidth: 'none' }}>
              <button className="cat-tab" onClick={() => setActiveCat('all')}
                style={{ color: activeCat === 'all' ? S.navy : S.muted, borderColor: 'transparent', borderBottom: activeCat === 'all' ? `2px solid ${S.gold}` : `2px solid transparent`, background: activeCat === 'all' ? `${S.gold}10` : 'transparent', marginBottom: '-1px' }}>
                All Rooms
              </button>
              {categories.map(cat => (
                <button key={cat.slug} className="cat-tab" onClick={() => setActiveCat(cat.slug)}
                  style={{ color: activeCat === cat.slug ? S.navy : S.muted, borderColor: 'transparent', borderBottom: activeCat === cat.slug ? `2px solid ${S.gold}` : `2px solid transparent`, background: activeCat === cat.slug ? `${S.gold}10` : 'transparent', marginBottom: '-1px' }}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Price range — centred */}
            <div className="price-filter-row">
              <span style={{ fontFamily: S.cinzel, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: S.muted, flexShrink: 0 }}>Price / Night</span>
              <span style={{ fontFamily: S.raleway, fontSize: '0.78rem', color: S.gold, fontWeight: 600, flexShrink: 0, minWidth: '2.5rem' }}>${priceMin}</span>
              <div className="slider-wrap slider-container">
                <input type="range" className="price-slider" min={0} max={priceMaxBound} value={priceMin}
                  onChange={e => setPriceMin(Math.min(Number(e.target.value), priceMax - 10))} />
                <input type="range" className="price-slider" min={0} max={priceMaxBound} value={priceMax}
                  onChange={e => setPriceMax(Math.max(Number(e.target.value), priceMin + 10))} />
              </div>
              <span style={{ fontFamily: S.raleway, fontSize: '0.78rem', color: S.gold, fontWeight: 600, flexShrink: 0, minWidth: '2.5rem', textAlign: 'right' }}>${priceMax}</span>
              <span style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted, flexShrink: 0 }}>
                {filtered.length} room{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {/* Gold divider */}
          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55% / 0.5), transparent)' }} />
        </div>

        {/* Grid */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '6rem 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '2rem', height: '2rem', border: `2px solid ${S.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem 0' }}>
              <p style={{ fontFamily: S.cinzel, color: S.muted, letterSpacing: '0.1em' }}>No rooms match your filters.</p>
              <button onClick={() => { setActiveCat('all'); setPriceMin(0); setPriceMax(priceMaxBound); }}
                style={{ marginTop: '1rem', fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.gold, background: 'none', border: `1px solid ${S.gold}`, padding: '0.5rem 1.25rem', cursor: 'pointer' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
              {filtered.map((room: any) => {
                const cat = categories.find(c => c.slug === (room.categorySlug || room.type));
                return (
                  <Link key={room._id} href={`/rooms/${room.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div className="rc">
                      {/* Image */}
                      <div style={{ position: 'relative', overflow: 'hidden', height: '15rem' }}>
                        <Image src={room.images?.[0] || '/room-deluxe.jpg'} alt={room.name} fill className="rc-img" />
                        {/* Category badge */}
                        <div style={{ position: 'absolute', top: '0.875rem', left: '0.875rem', background: S.gradGold, color: S.navy, fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', fontWeight: 700 }}>
                          {cat?.name || room.type}
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

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted }}>
                            <Users size={13} color={S.gold} strokeWidth={1.8} />
                            {room.capacity} Guests
                          </span>
                          {room.areaSqm > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted }}>
                              <Maximize2 size={13} color={S.gold} strokeWidth={1.8} />
                              {room.areaSqm} m²
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
