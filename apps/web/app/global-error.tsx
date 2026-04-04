'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, minHeight: '100vh', background: 'hsl(220 55% 18%)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'serif' }}>
        <div style={{ padding: '2rem' }}>
          <h2 style={{ color: 'hsl(43 65% 72%)', fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong
          </h2>
          <button
            onClick={reset}
            style={{ background: 'hsl(43 72% 55%)', color: 'hsl(220 55% 18%)', border: 'none', padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
