import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const SITE_URL = 'https://royalsuitesnp.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Royal Suites — Boutique Hotel & Spa | Kathmandu, Nepal',
    template: '%s | Royal Suites Kathmandu',
  },
  description: 'Royal Suites is a luxury Egyptian-themed boutique hotel & spa in Kathmandu, Nepal. 27 rooms, Cleopatra\'s Spa, restaurant & bar, and a smart QR guest portal for in-room dining, spa booking, live billing, and quick services.',
  keywords: ['boutique hotel Kathmandu', 'luxury hotel Nepal', 'Royal Suites Nepal', 'hotel spa Kathmandu', 'Egyptian themed hotel Kathmandu', 'best hotel Kathmandu', 'Kathmandu accommodation', 'smart hotel Nepal', 'hotel QR room service Kathmandu'],
  authors: [{ name: 'Royal Suites', url: SITE_URL }],
  creator: 'Royal Suites',
  publisher: 'Royal Suites',
  icons: { icon: '/logo.jpg', apple: '/logo.jpg' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Royal Suites Boutique Hotel & Spa',
    title: 'Royal Suites — Boutique Hotel & Spa | Kathmandu, Nepal',
    description: 'Luxury Egyptian-themed boutique hotel & spa in Kathmandu. Smart QR guest portal: order food, book spa, track your bill & request services from your phone.',
    images: [{ url: '/hero-bg.jpg', width: 1200, height: 630, alt: 'Royal Suites Boutique Hotel Kathmandu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Royal Suites — Boutique Hotel & Spa | Kathmandu, Nepal',
    description: 'Luxury Egyptian-themed boutique hotel & spa in Kathmandu, Nepal.',
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
