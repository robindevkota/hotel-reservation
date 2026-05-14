import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us — Royal Suites Thamel, Kathmandu',
  description: 'Contact Royal Suites in Thamel, Kathmandu. Call +977 982 865 1525, email us, or visit us in Thamel 44600. 24-hour front desk. Directions and map inside.',
  alternates: { canonical: 'https://royalsuitesnp.com/contact' },
  openGraph: {
    title: 'Contact Royal Suites | Thamel, Kathmandu',
    description: 'Find Royal Suites in Thamel, Kathmandu. Phone, email, map and directions. 24-hour front desk. Check-in 3:00 PM · Check-out 12:00 PM.',
    url: 'https://royalsuitesnp.com/contact',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Contact Royal Suites Thamel Kathmandu' }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
