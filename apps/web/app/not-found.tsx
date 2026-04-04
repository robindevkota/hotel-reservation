import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 55% 18%)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(43 72% 55%)', fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          404
        </p>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'hsl(43 65% 72%)', marginBottom: '1rem' }}>
          Chamber Not Found
        </h1>
        <div style={{ width: '6rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)', margin: '0 auto 1.5rem' }} />
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'hsl(35 25% 88% / 0.6)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          The page you seek has been lost to the sands of time.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-block', background: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))', color: 'hsl(220 55% 18%)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.875rem 2rem', fontWeight: 600 }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
