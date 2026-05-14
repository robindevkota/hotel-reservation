import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const SITE_URL = 'https://royalsuitesnp.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Royal Suites — Luxury Boutique Hotel & Spa in Thamel, Kathmandu',
    template: '%s | Royal Suites Thamel Kathmandu',
  },
  description: 'Royal Suites is a luxury boutique hotel & spa inside Thamel, Kathmandu. Ideal for couples, families, business travellers & solo guests. 27 rooms, spa, restaurant, smart QR guest portal, and 24/7 butler service.',
  keywords: [
    'luxury hotel Thamel', 'boutique hotel Thamel Kathmandu', 'hotel in Thamel',
    'smart hotel Thamel', 'comfortable hotel Kathmandu', 'couple friendly hotel Thamel',
    'family friendly hotel Kathmandu', 'romantic hotel Thamel', 'honeymoon hotel Kathmandu',
    'business hotel Thamel', 'hotel with spa Thamel', 'best hotel Thamel Nepal',
    'luxury hotel Kathmandu', 'Royal Suites Nepal', 'Egyptian themed hotel Kathmandu',
  ],
  authors: [{ name: 'Royal Suites', url: SITE_URL }],
  creator: 'Royal Suites',
  publisher: 'Royal Suites',
  icons: { icon: '/logo.jpg', apple: '/logo.jpg' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Royal Suites Boutique Hotel & Spa',
    title: 'Royal Suites — Luxury Boutique Hotel & Spa in Thamel, Kathmandu',
    description: 'Luxury boutique hotel inside Thamel, Kathmandu. Perfect for couples, families & business travellers. Spa, restaurant, smart QR portal & 24/7 butler service.',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Royal Suites Luxury Hotel Thamel Kathmandu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Royal Suites — Luxury Hotel & Spa in Thamel, Kathmandu',
    description: 'Luxury boutique hotel inside Thamel, Kathmandu. Couples, families & business travellers welcome. Spa, restaurant & smart QR guest portal.',
    images: ['/hero-bg.jpg'],
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(220 55% 18%)',
              color: 'hsl(43 72% 65%)',
              border: '1px solid hsl(43 72% 55% / 0.5)',
              fontFamily: 'Cinzel, serif',
              fontSize: '13px',
              borderRadius: '2px',
              letterSpacing: '0.05em',
            },
            success: { iconTheme: { primary: 'hsl(43 72% 55%)', secondary: 'hsl(220 55% 18%)' } },
            error: { iconTheme: { primary: 'hsl(0 84% 60%)', secondary: 'hsl(43 65% 72%)' } },
          }}
        />
      </body>
    </html>
  );
}
