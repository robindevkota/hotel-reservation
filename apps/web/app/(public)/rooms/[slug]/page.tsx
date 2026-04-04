import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getRoom(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/rooms/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.room;
  } catch {
    return null;
  }
}

export default async function RoomDetailPage({ params }: { params: { slug: string } }) {
  const room = await getRoom(params.slug);
  if (!room) notFound();

  const fallbackImage = '/room-pharaoh.jpg';

  return (
    <div className="pt-20 bg-background min-h-screen">
      {/* Hero */}
      <div className="relative h-[60vh] bg-primary overflow-hidden">
        <Image
          src={room.images?.[0] || fallbackImage}
          alt={room.name}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <div className="absolute bottom-10 left-0 right-0 container mx-auto px-4">
          <p className="font-elegant text-secondary text-lg tracking-[0.3em] uppercase mb-2">
            {room.type.charAt(0).toUpperCase() + room.type.slice(1)} · Floor {room.floorNumber}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-primary-foreground">{room.name}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="w-24 h-px bg-gradient-gold mb-8" />
            <p className="font-elegant text-muted-foreground text-xl leading-relaxed italic mb-10">{room.description}</p>

            {/* Gallery */}
            {room.images?.length > 1 && (
              <div className="grid grid-cols-2 gap-3 mb-10">
                {room.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="relative h-48 overflow-hidden group">
                    <Image
                      src={img}
                      alt={`${room.name} view ${i + 2}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Amenities */}
            <h2 className="font-display text-foreground tracking-wider uppercase text-sm mb-6">Room Amenities</h2>
            <div className="grid grid-cols-2 gap-3">
              {room.amenities?.map((a: string) => (
                <div key={a} className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                  <span className="text-secondary text-xs flex-shrink-0">𓂀</span>
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-primary border border-gold/20 p-8">
              <div className="w-full h-px bg-gradient-gold mb-6" />
              <div className="text-center mb-6">
                <span className="font-display text-gold text-3xl">${room.pricePerNight}</span>
                <span className="font-body text-cream-dark/50 text-xs ml-2">/ night</span>
              </div>

              <div className="space-y-3 mb-6 font-display text-xs tracking-wider">
                {[
                  ['Capacity', `${room.capacity} Guests`],
                  ['Room',     `#${room.roomNumber}`],
                  ['Floor',    room.floorNumber],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-gold/10 pb-2">
                    <span className="uppercase text-cream-dark/50">{k}</span>
                    <span className="text-primary-foreground">{v}</span>
                  </div>
                ))}
              </div>

              {room.isAvailable ? (
                <Link
                  href={`/reserve?room=${room._id}&roomName=${encodeURIComponent(room.name)}&price=${room.pricePerNight}`}
                  className="block text-center bg-gradient-gold text-primary font-display text-xs tracking-[0.2em] uppercase py-4 hover:shadow-gold transition-all duration-300 hover:-translate-y-0.5"
                >
                  Reserve This Room
                </Link>
              ) : (
                <div className="block text-center border border-cream-dark/20 text-cream-dark/40 font-display text-xs tracking-[0.2em] uppercase py-4 cursor-not-allowed">
                  Currently Unavailable
                </div>
              )}

              <Link
                href="/rooms"
                className="block text-center mt-4 font-display text-cream-dark/40 text-xs tracking-widest uppercase hover:text-gold transition-colors"
              >
                ← All Rooms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
