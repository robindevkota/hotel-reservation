'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 55% 18%)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Error
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: 'hsl(43 65% 72%)', marginBottom: '1rem' }}>
          Something Went Wrong
        </h2>
        <div style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', margin: '0 auto 1.5rem' }} />
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.6)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{ display: 'inline-block', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem 2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
