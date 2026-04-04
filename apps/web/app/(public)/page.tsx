import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const S = {
  gold:       'hsl(43 72% 55%)',
  goldLight:  'hsl(43 65% 72%)',
  goldDark:   'hsl(43 75% 40%)',
  navy:       'hsl(220 55% 18%)',
  navyLight:  'hsl(220 40% 28%)',
  cream:      'hsl(40 33% 96%)',
  papyrus:    'hsl(38 40% 92%)',
  muted:      'hsl(220 15% 40%)',
  gradGold:   'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy:   'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  gradGoldTxt:'linear-gradient(135deg, hsl(43 75% 40%), hsl(43 72% 55%), hsl(43 65% 72%), hsl(43 72% 55%), hsl(43 75% 40%))',
  divider:    'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel:     "'Cinzel', serif",
  cormo:      "'Cormorant Garamond', serif",
  raleway:    "'Raleway', sans-serif",
};

const ROOMS = [
  { name:'Pharaoh Suite',  price:'$450', image:'/room-pharaoh.jpg', guests:4, size:'95 m²',  features:['King Bed','Private Terrace','Jacuzzi','Living Area'], description:"The crown jewel — a palatial suite with hieroglyphic murals, gold-leaf furnishings, and a private terrace overlooking the gardens.", slug:'pharaoh-suite' },
  { name:'Royal Chamber',  price:'$320', image:'/room-royal.jpg',   guests:2, size:'65 m²',  features:['King Bed','City View','Mini Bar','Sitting Area'],     description:"Opulent quarters adorned with navy and gold, featuring handcrafted Egyptian-inspired décor and premium amenities.",            slug:'royal-chamber' },
  { name:'Deluxe Tomb',    price:'$220', image:'/room-deluxe.jpg',  guests:2, size:'45 m²',  features:['Twin Beds','Garden View','Work Desk','Rain Shower'],  description:"Elegantly appointed twin rooms inspired by the artistry of ancient tombs — a cozy sanctuary with authentic charm.",          slug:'deluxe-tomb' },
];

const AMENITIES = [
  { icon:'𓆉', title:"Pharaoh's Spa",    desc:'Ancient healing rituals with modern luxury treatments' },
  { icon:'𓌀', title:'Nile Dining',       desc:'Gourmet cuisine inspired by Mediterranean & Egyptian flavors' },
  { icon:'🏋️', title:'Temple Gym',        desc:'State-of-the-art fitness with panoramic views' },
  { icon:'🚗', title:'Chariot Service',   desc:'Complimentary luxury airport transfers' },
  { icon:'📶', title:'High-Speed Wi-Fi',  desc:'Complimentary connectivity throughout the property' },
  { icon:'🛡️', title:'24/7 Security',     desc:'Royal-grade security and privacy' },
  { icon:'𓏤', title:'Concierge',         desc:'Personal butler service for every guest' },
  { icon:'🔔', title:'Room Service',      desc:'24-hour in-room dining at your command' },
];

export default function HomePage() {
  return (
    <>
      <style>{`
        .room-card { background:#fff; border:1px solid hsl(35 25% 82%); overflow:hidden; transition:all 0.5s ease; box-shadow:0 8px 32px -8px hsl(220 55% 18% / 0.12); }
        .room-card:hover { border-color:hsl(43 72% 55% / 0.5); box-shadow:0 4px 20px -4px hsl(43 72% 55% / 0.3); }
        .room-card:hover .room-img { transform:scale(1.08); }
        .room-img { transition:transform 0.7s ease; width:100%; height:100%; object-fit:cover; display:block; }
        .amenity-card { background:#fff; border:1px solid hsl(35 25% 82%); padding:1.25rem; transition:all 0.3s ease; }
        .amenity-card:hover { border-color:hsl(43 72% 55% / 0.4); }
        .btn-gold { display:inline-block; background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%)); color:hsl(220 55% 18%); font-family:'Cinzel',serif; font-size:0.72rem; letter-spacing:0.2em; text-transform:uppercase; padding:1rem 2.5rem; font-weight:600; transition:all 0.3s ease; border:none; cursor:pointer; }
        .btn-outline-gold { display:inline-block; border:1px solid hsl(43 72% 55%); color:hsl(43 72% 55%); font-family:'Cinzel',serif; font-size:0.72rem; letter-spacing:0.2em; text-transform:uppercase; padding:1rem 2.5rem; transition:all 0.3s ease; }
        .form-input { width:100%; background:hsl(220 40% 22%); border:1px solid hsl(43 72% 55% / 0.2); color:#fff; font-family:'Raleway',sans-serif; font-size:0.875rem; padding:0.75rem 1rem; outline:none; transition:border-color 0.2s; box-sizing:border-box; }
        .form-input:focus { border-color:hsl(43 72% 55% / 0.6); }
        .form-input::placeholder { color:hsl(35 25% 88% / 0.35); }
        .form-label { display:block; font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:0.15em; text-transform:uppercase; color:hsl(35 25% 88% / 0.6); margin-bottom:0.4rem; }
        .nav-link-home:hover { color:hsl(43 72% 55%) !important; }
      `}</style>

      {/* ── Hero ── */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <div className="absolute inset-0">
          <Image src="/hero-bg.jpg" alt="Royal Suites Hotel" fill style={{ objectFit:'cover' }} priority />
          <div className="absolute inset-0" style={{ background:'hsl(220 55% 18% / 0.55)' }} />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to top, hsl(220 55% 18% / 0.85) 0%, transparent 50%, hsl(220 55% 18% / 0.3) 100%)' }} />
        </div>

        <div style={{ position:'relative', zIndex:10, textAlign:'center', padding:'0 1rem', maxWidth:'56rem', margin:'0 auto', width:'100%' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'2rem' }}>
            <div style={{ width:'128px', height:'128px', borderRadius:'50%', border:`4px solid ${S.gold}`, boxShadow:`0 4px 24px hsl(43 72% 55% / 0.4)`, overflow:'hidden', flexShrink:0 }}>
              <Image src="/logo.jpg" alt="Royal Suites Logo" width={128} height={128} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} priority />
            </div>
          </div>

          <p style={{ fontFamily:S.cormo, color:S.gold, fontSize:'1.1rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'1rem' }}>Welcome to</p>
          <h1 style={{ fontFamily:S.cinzel, fontWeight:800, fontSize:'clamp(3rem, 8vw, 6rem)', background:S.gradGoldTxt, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1.1, marginBottom:'0.75rem' }}>
            Royal Suites
          </h1>
          <p style={{ fontFamily:S.cinzel, fontWeight:400, fontSize:'1.2rem', color:S.cream, letterSpacing:'0.15em', marginBottom:'1.5rem' }}>Boutique Hotel &amp; Spa</p>
          <div style={{ width:'6rem', height:'1px', background:S.divider, margin:'0 auto 2rem' }} />
          <p style={{ fontFamily:S.cormo, fontStyle:'italic', fontSize:'1.15rem', color:'hsl(35 25% 88% / 0.8)', maxWidth:'36rem', margin:'0 auto 2.5rem', lineHeight:1.7 }}>
            Experience the grandeur of ancient Egypt reimagined for the modern traveler. Where timeless luxury meets pharaonic splendor.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'1rem', justifyContent:'center' }}>
            <Link href="/reserve" className="btn-gold">Reserve Now</Link>
            <Link href="/rooms" className="btn-outline-gold">Explore Rooms</Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div style={{ width:'1.5rem', height:'2.5rem', border:'2px solid hsl(43 72% 55% / 0.5)', borderRadius:'9999px', display:'flex', justifyContent:'center', paddingTop:'0.4rem' }}>
            <div style={{ width:'0.25rem', height:'0.5rem', background:S.gold, borderRadius:'9999px' }} />
          </div>
        </div>
      </section>

      {/* ── Rooms ── */}
      <section style={{ padding:'6rem 0', background:S.cream }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <p style={{ fontFamily:S.cormo, color:S.gold, fontSize:'1rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'0.75rem' }}>Accommodations</p>
            <h2 style={{ fontFamily:S.cinzel, fontWeight:600, fontSize:'clamp(1.8rem, 4vw, 3rem)', color:S.navy, marginBottom:'1rem' }}>Our Royal Chambers</h2>
            <div style={{ width:'6rem', height:'1px', background:S.divider, margin:'0 auto 1.5rem' }} />
            <p style={{ fontFamily:S.cormo, fontStyle:'italic', color:S.muted, fontSize:'1.1rem', maxWidth:'36rem', margin:'0 auto' }}>
              Each room tells a story of ancient grandeur, meticulously crafted for your comfort and wonder.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'2rem' }}>
            {ROOMS.map((room) => (
              <div key={room.name} className="room-card">
                <div style={{ position:'relative', overflow:'hidden', height:'16rem' }}>
                  <Image src={room.image} alt={room.name} fill className="room-img" />
                  <div style={{ position:'absolute', top:'1rem', right:'1rem', background:'hsl(220 55% 18% / 0.9)', color:'hsl(43 72% 65%)', fontFamily:S.cinzel, fontSize:'0.85rem', padding:'0.4rem 1rem' }}>
                    {room.price}<span style={{ fontSize:'0.7rem', color:'hsl(35 25% 88% / 0.7)' }}> / night</span>
                  </div>
                </div>
                <div style={{ padding:'1.5rem' }}>
                  <h3 style={{ fontFamily:S.cinzel, fontWeight:600, fontSize:'1.1rem', color:S.navy, marginBottom:'0.6rem' }}>{room.name}</h3>
                  <p style={{ fontFamily:S.raleway, color:S.muted, fontSize:'0.85rem', lineHeight:1.6, marginBottom:'1rem' }}>{room.description}</p>
                  <div style={{ display:'flex', gap:'1rem', marginBottom:'0.875rem', fontSize:'0.75rem', color:S.muted }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:S.raleway }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={S.gold} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {room.guests} Guests
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:S.raleway }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={S.gold} strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                      {room.size}
                    </span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'1.25rem' }}>
                    {room.features.map(f => (
                      <span key={f} style={{ fontFamily:S.raleway, fontSize:'0.68rem', background:S.papyrus, color:S.muted, padding:'0.2rem 0.6rem', border:'1px solid hsl(35 25% 82%)' }}>{f}</span>
                    ))}
                  </div>
                  <Link href={`/rooms/${room.slug}`} style={{ display:'block', textAlign:'center', background:S.gradNavy, color:'hsl(43 72% 65%)', fontFamily:S.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', padding:'0.875rem' }}>
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign:'center', marginTop:'3rem' }}>
            <Link href="/rooms" className="btn-outline-gold">View All Rooms</Link>
          </div>
        </div>
      </section>

      {/* ── Amenities ── */}
      <section style={{ padding:'6rem 0', background:S.papyrus }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <p style={{ fontFamily:S.cormo, color:S.gold, fontSize:'1rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'0.75rem' }}>Experience</p>
            <h2 style={{ fontFamily:S.cinzel, fontWeight:600, fontSize:'clamp(1.8rem, 4vw, 3rem)', color:S.navy, marginBottom:'1rem' }}>Royal Amenities</h2>
            <div style={{ width:'6rem', height:'1px', background:S.divider, margin:'0 auto' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3rem', alignItems:'center' }}>
            {/* Spa image */}
            <div style={{ position:'relative', overflow:'hidden', borderRadius:'0' }}>
              <Image src="/spa.jpg" alt="The Pharaoh's Spa" width={900} height={600} style={{ width:'100%', height:'400px', objectFit:'cover', display:'block' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, hsl(220 55% 18% / 0.7) 0%, transparent 60%)' }} />
              <div style={{ position:'absolute', bottom:'1.5rem', left:'1.5rem', right:'1.5rem' }}>
                <h3 style={{ fontFamily:S.cinzel, color:S.cream, fontSize:'1.2rem', marginBottom:'0.4rem' }}>The Pharaoh&apos;s Spa</h3>
                <p style={{ fontFamily:S.cormo, fontStyle:'italic', color:'hsl(35 25% 88% / 0.8)', fontSize:'0.95rem' }}>Immerse yourself in healing waters surrounded by golden mosaics and ancient artistry</p>
              </div>
            </div>

            {/* 2-col grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              {AMENITIES.map(({ icon, title, desc }) => (
                <div key={title} className="amenity-card">
                  <div style={{ fontSize:'1.6rem', marginBottom:'0.6rem', color:S.gold }}>{icon}</div>
                  <h4 style={{ fontFamily:S.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', color:S.navy, marginBottom:'0.4rem' }}>{title}</h4>
                  <p style={{ fontFamily:S.raleway, fontSize:'0.75rem', color:S.muted, lineHeight:1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reservation Form ── */}
      <section style={{ padding:'6rem 0', background:S.navy }}>
        <div style={{ maxWidth:'860px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <p style={{ fontFamily:S.cormo, color:S.gold, fontSize:'1rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'0.75rem' }}>Book Your Stay</p>
            <h2 style={{ fontFamily:S.cinzel, fontWeight:600, fontSize:'clamp(1.8rem, 4vw, 2.8rem)', color:S.gold, marginBottom:'0.75rem' }}>Reserve Your Chamber</h2>
            <div style={{ width:'6rem', height:'1px', background:S.divider, margin:'0 auto 1rem' }} />
            <p style={{ fontFamily:S.cormo, fontStyle:'italic', color:'hsl(35 25% 88% / 0.6)', fontSize:'1rem' }}>Begin your journey into timeless luxury.</p>
          </div>

          <form action="/reserve" method="get" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
            <div>
              <label className="form-label">Full Name</label>
              <input name="name" type="text" placeholder="Your Full Name" className="form-input" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input name="email" type="email" placeholder="your@email.com" className="form-input" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input name="phone" type="tel" placeholder="+1 234 567 890" className="form-input" />
            </div>
            <div>
              <label className="form-label">Guests</label>
              <select name="guests" className="form-input" style={{ cursor:'pointer' }}>
                <option>1 Guest</option>
                <option selected>2 Guests</option>
                <option>3 Guests</option>
                <option>4 Guests</option>
              </select>
            </div>
            <div>
              <label className="form-label">Check-In</label>
              <input name="checkIn" type="date" className="form-input" style={{ colorScheme:'dark' }} />
            </div>
            <div>
              <label className="form-label">Check-Out</label>
              <input name="checkOut" type="date" className="form-input" style={{ colorScheme:'dark' }} />
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <label className="form-label">Room Type</label>
              <select name="roomName" className="form-input" style={{ cursor:'pointer' }}>
                <option>Pharaoh Suite</option>
                <option>Royal Chamber</option>
                <option>Deluxe Tomb</option>
              </select>
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <label className="form-label">Special Requests</label>
              <textarea name="specialRequests" rows={3} placeholder="Any special requirements for your stay..." className="form-input" style={{ resize:'none' }} />
            </div>
            <div style={{ gridColumn:'1 / -1', textAlign:'center', marginTop:'0.5rem' }}>
              <button type="submit" className="btn-gold" style={{ width:'100%', padding:'1.1rem', fontSize:'0.8rem', letterSpacing:'0.25em' }}>
                Confirm Reservation
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
