import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us — Royal Suites Kathmandu',
  description: 'Contact Royal Suites Boutique Hotel & Spa in Kathmandu, Nepal. Call +977 982 865 1525, email us, or visit us at Kathmandu 44600. Front desk open 24 hours.',
  alternates: { canonical: 'https://royalsuitesnp.com/contact' },
  openGraph: {
    title: 'Contact Royal Suites | Kathmandu, Nepal',
    description: 'Reach Royal Suites Kathmandu by phone, email, or in person. 24-hour front desk. Check-in 3:00 PM · Check-out 12:00 PM.',
    url: 'https://royalsuitesnp.com/contact',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Contact Royal Suites Kathmandu' }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
