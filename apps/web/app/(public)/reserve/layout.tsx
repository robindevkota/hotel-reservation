import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reserve a Room — Book Your Stay',
  description: 'Book your stay at Royal Suites Kathmandu. Choose your dates, select from 27 rooms, and reserve directly for the best rate. Check-in 3:00 PM · Check-out 12:00 PM.',
  alternates: { canonical: 'https://royalsuitesnp.com/reserve' },
  openGraph: {
    title: 'Reserve a Room | Royal Suites Kathmandu',
    description: 'Book your stay at Royal Suites — Kathmandu\'s Egyptian-inspired luxury boutique hotel. Best rates guaranteed when booking direct.',
    url: 'https://royalsuitesnp.com/reserve',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Book Royal Suites Kathmandu' }],
  },
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
