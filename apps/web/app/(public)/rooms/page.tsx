import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

async function getRooms() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rooms`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.rooms || [];
  } catch {
    return [];
  }
}

const TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  deluxe:   'Deluxe',
  suite:    'Suite',
  royal:    'Royal',
};

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary py-24 text-center">
        <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-3">Our Collection</p>
        <h1 className="font-display text-4xl md:text-5xl text-primary-foreground mb-6">Royal Chambers</h1>
        <div className="w-24 h-px bg-gradient-gold mx-auto mb-6" />
        <p className="font-elegant text-cream-dark/70 text-xl italic max-w-xl mx-auto px-6">
          Each room is a tribute to Egyptian splendor — from the gods-blessed Standard to the legendary
          Pharaoh&apos;s Royal Chamber.
        </p>
      </div>

      <div className="container mx-auto px-4 py-16">
        {rooms.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-muted-foreground tracking-wider">No rooms available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room: any) => (
              <Link key={room._id} href={`/rooms/${room.slug}`} className="group block">
                <div className="bg-card border border-border hover:border-gold/50 transition-all duration-500 overflow-hidden shadow-royal hover:shadow-gold">
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={room.images?.[0] || '/room-deluxe.jpg'}
                      alt={room.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground font-display text-sm px-4 py-2 tracking-wider">
                      ${room.pricePerNight}
                      <span className="text-xs text-cream-dark/70"> / night</span>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-gold text-primary font-display text-[10px] tracking-widest uppercase px-3 py-1.5">
                        {TYPE_LABELS[room.type] || room.type}
                      </span>
                    </div>
                    {!room.isAvailable && (
                      <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                        <span className="font-display text-primary-foreground tracking-widest uppercase text-sm">Unavailable</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h2 className="font-display text-xl text-foreground mb-3">{room.name}</h2>
                    <p className="font-body text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                      {room.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {room.amenities?.slice(0, 3).map((a: string) => (
                        <span key={a} className="text-xs font-body bg-papyrus text-muted-foreground px-3 py-1">
                          {a}
                        </span>
                      ))}
                      {room.amenities?.length > 3 && (
                        <span className="text-xs font-body text-secondary">+{room.amenities.length - 3}</span>
                      )}
                    </div>

                    <div className="block text-center bg-gradient-navy text-primary-foreground font-display text-xs tracking-[0.2em] uppercase py-3 group-hover:opacity-90 transition-opacity">
                      View Room →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
