import React from 'react';
import Image from 'next/image';

const AMENITIES = [
  { icon: '𓆉', title: "Cleopatra's Spa",  desc: 'Six ancient-inspired treatments. Milk & Honey rituals, Nile Stone therapy, couples journeys, and more.' },
  { icon: '🏊', title: 'Infinity Pool',     desc: 'A rooftop infinity pool with panoramic city views, heated year-round and styled with mosaic hieroglyphic tiles.' },
  { icon: '𓌀', title: 'Royal Dining',      desc: 'In-room dining and our main restaurant serving curated Egyptian cuisine around the clock.' },
  { icon: '𓏤', title: 'Butler Service',    desc: '24/7 personal butler service for all Royal Suite guests. Every need anticipated, every request fulfilled.' },
  { icon: '🧖', title: 'Steam & Sauna',    desc: 'Eucalyptus steam rooms and cedar saunas. The perfect prelude to your spa treatment.' },
  { icon: '🏋️', title: 'Royal Fitness',    desc: 'State-of-the-art gym with personal trainers available on request. Open 24 hours.' },
];

async function getSpaServices() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/spa/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services || [];
  } catch { return []; }
}

export default async function AmenitiesPage() {
  const services = await getSpaServices();

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Header */}
      <div className="relative bg-primary py-24 overflow-hidden">
        <Image
          src="/spa.jpg"
          alt="Royal Suites Spa"
          fill
          className="object-cover opacity-30"
        />
        <div className="relative z-10 text-center px-4">
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Beyond the Room</p>
          <h1 className="font-display text-4xl md:text-5xl text-primary-foreground mb-6">Amenities &amp; Spa</h1>
          <div className="w-24 h-px bg-gradient-gold mx-auto" />
        </div>
      </div>

      {/* Hotel Amenities */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Experience</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">Hotel Facilities</h2>
            <div className="w-24 h-px bg-gradient-gold mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AMENITIES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-8 bg-card border border-border hover:border-gold/50 transition-all duration-500 hover:shadow-gold group"
              >
                <div className="text-3xl text-secondary mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
                <h3 className="font-display text-sm tracking-wider uppercase mb-2 text-foreground">{title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spa — split image + grid */}
      <section className="py-24 bg-papyrus">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Ancient Rituals</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">Cleopatra&apos;s Spa</h2>
            <div className="w-24 h-px bg-gradient-gold mx-auto mb-6" />
            <p className="font-elegant text-muted-foreground text-lg italic max-w-xl mx-auto">
              Immerse yourself in healing waters surrounded by golden mosaics and ancient artistry.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="relative overflow-hidden group">
              <Image
                src="/spa.jpg"
                alt="Cleopatra Spa"
                width={900}
                height={600}
                className="w-full h-80 lg:h-[450px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="font-display text-xl text-cream mb-1">The Pharaoh&apos;s Spa</h3>
                <p className="font-elegant text-cream-dark/80 italic text-sm">Where ancient wisdom meets modern luxury</p>
              </div>
            </div>

            {services.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {services.slice(0, 4).map((service: any) => (
                  <div
                    key={service._id}
                    className="flex items-center gap-4 p-4 bg-card border border-border hover:border-gold/40 transition-all duration-300 group"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden">
                      <Image
                        src={service.image || '/spa.jpg'}
                        alt={service.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-sm text-foreground mb-1">{service.name}</h4>
                      <p className="font-body text-xs text-muted-foreground line-clamp-1 mb-2">{service.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-xs text-muted-foreground">{service.duration} min</span>
                        <span className="font-display text-sm text-secondary">${service.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Milk & Honey Ritual', duration: 90, price: 180 },
                  { name: 'Nile Stone Therapy',  duration: 75, price: 150 },
                  { name: "Cleopatra's Wrap",    duration: 60, price: 120 },
                  { name: "Couples' Journey",    duration: 120, price: 280 },
                ].map((s) => (
                  <div key={s.name} className="p-5 bg-card border border-border hover:border-gold/40 transition-all duration-300 text-center">
                    <h4 className="font-display text-xs text-foreground mb-2">{s.name}</h4>
                    <p className="font-body text-xs text-muted-foreground mb-2">{s.duration} min</p>
                    <p className="font-display text-sm text-secondary">${s.price}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {services.length > 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(4).map((service: any) => (
                <div
                  key={service._id}
                  className="bg-card border border-border overflow-hidden hover:border-gold/50 hover:shadow-gold transition-all duration-500 group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={service.image || '/spa.jpg'}
                      alt={service.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-sm text-foreground">{service.name}</h3>
                      <span className="font-body text-xs text-secondary bg-secondary/10 px-2 py-1 capitalize">{service.category}</span>
                    </div>
                    <p className="font-body text-muted-foreground text-xs mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-body text-xs text-muted-foreground">{service.duration} min</span>
                      <span className="font-display text-secondary">${service.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center font-body text-muted-foreground text-sm mt-10">
            Spa bookings available after check-in via your room&apos;s QR code
          </p>
        </div>
      </section>
    </div>
  );
}
