import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Royal Suites — Boutique Hotel & Spa',
  description: 'An Egyptian-inspired luxury boutique hotel experience. Reserve your chamber, indulge in our spa, and dine like royalty.',
  icons: { icon: '/logo.jpg' },
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
