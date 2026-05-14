import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rooms & Suites in Thamel — 27 Rooms Across 5 Floors',
  description: 'Browse 27 rooms at Royal Suites Thamel, Kathmandu — from comfortable Superior King Rooms ($250/night) to the Presidential Suite ($1,200/night). Ideal for couples, families and business travellers.',
  alternates: { canonical: 'https://royalsuitesnp.com/rooms' },
  openGraph: {
    title: 'Rooms & Suites | Royal Suites Thamel, Kathmandu',
    description: '27 rooms in Thamel, Kathmandu — Superior King, Twin, Executive Suites, Deluxe King Suites, and the Presidential Suite. Couple & family friendly.',
    url: 'https://royalsuitesnp.com/rooms',
    images: [{ url: '/room-royal.jpg', width: 1200, height: 630, alt: 'Royal Suites rooms and suites Thamel Kathmandu' }],
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
