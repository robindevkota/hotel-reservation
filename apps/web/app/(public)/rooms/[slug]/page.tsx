import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GoldDivider from '../../../../components/ui/GoldDivider';
import Button from '../../../../components/ui/Button';

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

  return (
    <div className="pt-20 bg-[#F5ECD7] min-h-screen">
      {/* Hero Image */}
      <div className="relative h-[60vh] bg-[#0D1B3E]">
        <Image
          src={room.images?.[0] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1600'}
          alt={room.name}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B3E] to-transparent" />
        <div className="absolute bottom-8 left-0 right-0 container">
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-2">
            {room.type.charAt(0).toUpperCase() + room.type.slice(1)} Room · Floor {room.floorNumber}
          </p>
          <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-4xl md:text-5xl">{room.name}</h1>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <GoldDivider />
            <p className="text-[#5A6478] text-lg leading-relaxed mb-8">{room.description}</p>

            {/* Gallery */}
            {room.images?.length > 1 && (
              <div className="grid grid-cols-2 gap-3 mb-10">
                {room.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="relative h-48 overflow-hidden">
                    <Image src={img} alt={`${room.name} view ${i + 2}`} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            )}

            {/* Amenities */}
            <h2 className="font-[Cinzel] text-[#0D1B3E] tracking-wider uppercase text-sm mb-4">Amenities</h2>
            <div className="grid grid-cols-2 gap-2">
              {room.amenities?.map((a: string) => (
                <div key={a} className="flex items-center gap-2 text-sm text-[#5A6478]">
                  <span className="text-[#C9A84C] text-xs">𓂀</span>
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#0D1B3E] p-8 border border-[#C9A84C]/20">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mb-6" />
              <div className="text-center mb-6">
                <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-3xl">${room.pricePerNight}</span>
                <span className="font-[Cinzel] text-[#F5ECD7]/50 text-xs ml-2">/ night</span>
              </div>
              <div className="space-y-3 mb-6 text-[#F5ECD7]/70 text-sm font-[Cinzel] tracking-wider">
                <div className="flex justify-between">
                  <span className="uppercase text-xs">Capacity</span>
                  <span>{room.capacity} Guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase text-xs">Room</span>
                  <span>#{room.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase text-xs">Floor</span>
                  <span>{room.floorNumber}</span>
                </div>
              </div>
              {room.isAvailable ? (
                <Link href={`/reserve?room=${room._id}&roomName=${encodeURIComponent(room.name)}&price=${room.pricePerNight}`}>
                  <Button variant="primary" className="w-full">Reserve This Room</Button>
                </Link>
              ) : (
                <Button variant="ghost" className="w-full" disabled>Currently Unavailable</Button>
              )}
              <Link href="/rooms" className="block text-center mt-4 font-[Cinzel] text-[#F5ECD7]/40 text-xs tracking-widest uppercase hover:text-[#C9A84C] transition-colors">
                ← Back to Rooms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
