import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import GoldDivider from '../../../components/ui/GoldDivider';

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
  deluxe: 'Deluxe',
  suite: 'Suite',
  royal: 'Royal',
};

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="pt-20 bg-[#F5ECD7] min-h-screen">
      {/* Header */}
      <div className="bg-[#0D1B3E] py-20 text-center">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.5em] uppercase mb-3">Our Collection</p>
        <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-4xl md:text-5xl">Royal Chambers</h1>
        <GoldDivider ornament="𓏤" />
        <p className="font-[Cormorant_Garamond] text-[#F5ECD7]/70 text-xl italic max-w-xl mx-auto px-6">
          Each room is a tribute to Egyptian splendor — from the gods-blessed Standard to the legendary Pharaoh's Royal Chamber.
        </p>
      </div>

      <div className="container py-16">
        {rooms.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-[Cinzel] text-[#5A6478] tracking-wider">No rooms available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room: any) => (
              <Link key={room._id} href={`/rooms/${room.slug}`} className="group block">
                <div className="border border-[#0D1B3E]/10 hover:border-[#C9A84C] transition-all duration-300 bg-white overflow-hidden shadow-[0_4px_24px_rgba(13,27,62,0.06)]">
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={room.images?.[0] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'}
                      alt={room.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-[#0D1B3E] text-[#C9A84C] font-[Cinzel] text-[10px] tracking-widest uppercase px-3 py-1.5">
                        {TYPE_LABELS[room.type] || room.type}
                      </span>
                    </div>
                    {!room.isAvailable && (
                      <div className="absolute inset-0 bg-[#0D1B3E]/60 flex items-center justify-center">
                        <span className="font-[Cinzel] text-[#F5ECD7] tracking-widest uppercase text-sm">Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="h-[2px] w-8 bg-[#C9A84C] mb-4 group-hover:w-16 transition-all duration-300" />
                    <h2 className="font-[Cinzel] text-[#0D1B3E] text-lg tracking-wider mb-2">{room.name}</h2>
                    <p className="text-[#5A6478] text-sm leading-relaxed line-clamp-2 mb-4">{room.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-xl">${room.pricePerNight}</span>
                        <span className="font-[Cinzel] text-[#5A6478] text-xs ml-1">/ night</span>
                      </div>
                      <span className="font-[Cinzel] text-[#0D1B3E]/40 text-xs tracking-widest uppercase group-hover:text-[#C9A84C] transition-colors">
                        View →
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities?.slice(0, 3).map((a: string) => (
                        <span key={a} className="text-[10px] font-[Cinzel] tracking-wider bg-[#F5ECD7] border border-[#C9A84C]/30 text-[#5A6478] px-2 py-0.5">
                          {a}
                        </span>
                      ))}
                      {room.amenities?.length > 3 && (
                        <span className="text-[10px] font-[Cinzel] text-[#C9A84C]">+{room.amenities.length - 3} more</span>
                      )}
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
