import React from 'react';
import Image from 'next/image';
import { Sparkles, Waves, UtensilsCrossed, ConciergeBell, Wind, Dumbbell } from 'lucide-react';

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

const AMENITIES = [
  { Icon: Sparkles,      title: "Cleopatra's Spa",  desc: "Six ancient-inspired treatments. Milk & Honey rituals, Nile Stone therapy, couples journeys, and more." },
  { Icon: Waves,         title: 'Infinity Pool',     desc: 'A rooftop infinity pool with panoramic city views, heated year-round and styled with mosaic hieroglyphic tiles.' },
  { Icon: UtensilsCrossed, title: 'Royal Dining',   desc: 'In-room dining and our main restaurant serving curated Egyptian cuisine around the clock.' },
  { Icon: ConciergeBell, title: 'Butler Service',   desc: '24/7 personal butler service for all Royal Suite guests. Every need anticipated, every request fulfilled.' },
  { Icon: Wind,          title: 'Steam & Sauna',    desc: 'Eucalyptus steam rooms and cedar saunas. The perfect prelude to your spa treatment.' },
  { Icon: Dumbbell,      title: 'Royal Fitness',    desc: 'State-of-the-art gym with personal trainers available on request. Open 24 hours.' },
];

async function getSpaServices() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/spa/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()).services || [];
  } catch { return []; }
}

export default async function AmenitiesPage() {
  const services = await getSpaServices();

  return (
    <>
      <style>{`
        .am-card{background:#fff;border:1px solid hsl(35 25% 82%);padding:1.5rem;transition:border-color 0.3s,box-shadow 0.3s;}
        .am-card:hover{border-color:hsl(43 72% 55%/0.5);box-shadow:0 4px 16px -4px hsl(43 72% 55%/0.2);}
        .spa-row{display:flex;align-items:center;gap:1rem;padding:1rem;background:#fff;border:1px solid hsl(35 25% 82%);transition:border-color 0.3s;overflow:hidden;min-width:0;}
        .spa-row:hover{border-color:hsl(43 72% 55%/0.4);}
        .spa-thumb{width:72px;height:72px;flex-shrink:0;overflow:hidden;position:relative;}
        .spa-thumb img{transition:transform 0.5s ease;}
        .spa-row:hover .spa-thumb img{transform:scale(1.1);}
        .spa-name{font-size:0.82rem;color:hsl(220 55% 18%);margin-bottom:0.3rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .spa-desc{font-size:0.75rem;color:hsl(220 15% 40%);margin-bottom:0.4rem;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;}
        .spa-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start;}
        @media(max-width:768px){.spa-grid{grid-template-columns:1fr;}}
      `}</style>

      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: S.cream }}>
        {/* Header */}
        <div style={{ position: 'relative', background: S.navy, padding: '5rem 1.5rem', textAlign: 'center', overflow: 'hidden' }}>
          <Image src="/spa.jpg" alt="" fill style={{ objectFit: 'cover', opacity: 0.25 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Beyond the Room</p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Amenities &amp; Spa</h1>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto' }} />
          </div>
        </div>

        {/* Hotel Facilities */}
        <section style={{ padding: '5rem 0', background: S.cream }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Experience</p>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', color: S.navy, marginBottom: '1rem' }}>Hotel Facilities</h2>
              <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {AMENITIES.map(({ Icon, title, desc }) => (
                <div key={title} className="am-card">
                  <div style={{ color: S.gold, marginBottom: '0.75rem' }}><Icon size={28} strokeWidth={1.5} /></div>
                  <h3 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.5rem' }}>{title}</h3>
                  <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.muted, lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cleopatra's Spa */}
        <section style={{ padding: '5rem 0', background: S.papyrus }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Ancient Rituals</p>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', color: S.navy, marginBottom: '1rem' }}>Cleopatra&apos;s Spa</h2>
              <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 1.5rem' }} />
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1.1rem', maxWidth: '36rem', margin: '0 auto' }}>
                Immerse yourself in healing waters surrounded by golden mosaics and ancient artistry.
              </p>
            </div>

            <div className="spa-grid">
              {/* Spa image */}
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <Image src="/spa.jpg" alt="Cleopatra's Spa" width={900} height={600}
                  style={{ width: '100%', height: '480px', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(220 55% 18% / 0.65) 0%, transparent 55%)' }} />
                <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem' }}>
                  <h3 style={{ fontFamily: S.cinzel, color: S.cream, fontSize: '1.2rem', marginBottom: '0.35rem' }}>The Pharaoh&apos;s Spa</h3>
                  <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.8)', fontSize: '0.9rem' }}>Where ancient wisdom meets modern luxury</p>
                </div>
              </div>

              {/* Service list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {(services.length > 0 ? services : [
                  { _id: '1', name: "Cleopatra's Milk & Honey Ritual", description: "The legendary beauty ritual of ancient Egypt. A full-body exfoliation with raw honey scrub...", duration: 90,  price: 320, image: '/spa.jpg' },
                  { _id: '2', name: 'Nile Stone Hot Therapy',           description: 'Smooth basalt stones heated in Nile-inspired mineral water, placed along energy...', duration: 75,  price: 240, image: '/spa.jpg' },
                  { _id: '3', name: "Pharaoh's Deep Tissue Massage",    description: 'A powerful deep-tissue massage using ancient Egyptian pressure techniques, targeting...', duration: 60,  price: 180, image: '/spa.jpg' },
                  { _id: '4', name: 'Desert Rose Facial',               description: 'A rejuvenating facial using desert rose extract, 24K gold serum, and Egyptian frankincen...', duration: 60, price: 195, image: '/spa.jpg' },
                  { _id: '5', name: "Couples' Golden Journey",          description: 'A shared ritual for two — golden oil massage, rose petal bath, and champagne finish.',  duration: 120, price: 520, image: '/spa.jpg' },
                  { _id: '6', name: 'Royal Hammam Experience',          description: 'Traditional Turkish-Egyptian steam bath with kessa glove exfoliation and argan oil.',  duration: 75,  price: 210, image: '/spa.jpg' },
                ]).map((svc: any) => (
                  <div key={svc._id} className="spa-row">
                    <div className="spa-thumb">
                      <Image src={svc.image || '/spa.jpg'} alt={svc.name} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <h4 className="spa-name" style={{ fontFamily: S.cinzel }}>{svc.name}</h4>
                      <p className="spa-desc" style={{ fontFamily: S.raleway }}>{svc.description}</p>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted }}>{svc.duration} min</span>
                        <span style={{ fontFamily: S.cinzel, fontSize: '0.88rem', color: S.gold, fontWeight: 600 }}>${svc.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <p style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted, textAlign: 'center', marginTop: '0.5rem' }}>
                  Spa bookings available after check-in via your room&apos;s QR code
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
