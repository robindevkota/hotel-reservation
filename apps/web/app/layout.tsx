import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Royal Suites — Boutique Hotel & Spa',
  description: 'An Egyptian-inspired luxury boutique hotel experience. Reserve your chamber, indulge in our spa, and dine like royalty.',
  icons: { icon: '/logo.svg' },
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
              background: '#0D1B3E',
              color: '#F5ECD7',
              border: '1px solid #C9A84C',
              fontFamily: 'Cinzel, serif',
              fontSize: '14px',
              borderRadius: '2px',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0D1B3E' } },
            error: { iconTheme: { primary: '#D32F2F', secondary: '#F5ECD7' } },
          }}
        />
      </body>
    </html>
  );
}
