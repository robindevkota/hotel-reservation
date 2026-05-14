import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Room in Thamel — Reserve Your Stay',
  description: 'Book your stay at Royal Suites, Thamel Kathmandu. Choose from 27 rooms — couple suites, family rooms, business & solo options. Best rates direct. Check-in 3:00 PM · Check-out 12:00 PM.',
  alternates: { canonical: 'https://royalsuitesnp.com/reserve' },
  openGraph: {
    title: 'Book a Room in Thamel | Royal Suites Kathmandu',
    description: 'Reserve your room at Royal Suites Thamel, Kathmandu. Couple, family, business & solo rooms available. Best rates when booking direct.',
    url: 'https://royalsuitesnp.com/reserve',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Book Royal Suites Thamel Kathmandu' }],
  },
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
