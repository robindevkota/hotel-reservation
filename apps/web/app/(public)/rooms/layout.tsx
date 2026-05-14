import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Royal Chambers — All Rooms & Suites',
  description: 'Browse all 27 rooms across 5 floors at Royal Suites Kathmandu. From Superior King Rooms at $250/night to the Presidential Suite at $1,200/night. Filter by category and price.',
  alternates: { canonical: 'https://royalsuitesnp.com/rooms' },
  openGraph: {
    title: 'Royal Chambers — All Rooms & Suites | Royal Suites Kathmandu',
    description: '27 rooms across 5 floors — Superior King, Twin, Executive Suites, Deluxe King Suites, and the Presidential Suite.',
    url: 'https://royalsuitesnp.com/rooms',
    images: [{ url: '/room-royal.jpg', width: 1200, height: 630, alt: 'Royal Suites rooms and suites Kathmandu' }],
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
