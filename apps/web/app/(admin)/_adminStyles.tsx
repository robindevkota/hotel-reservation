// Shared admin design tokens & components
import React from 'react';

export const A = {
  gold:'hsl(43 72% 55%)', goldLight:'hsl(43 65% 72%)',
  navy:'hsl(220 55% 18%)', navyMid:'hsl(220 45% 24%)',
  cream:'hsl(40 33% 96%)', papyrus:'hsl(38 40% 92%)', muted:'hsl(220 15% 40%)',
  border:'hsl(35 25% 82%)',
  gradGold:'linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%))',
  divider:'linear-gradient(90deg,transparent,hsl(43 72% 55%),transparent)',
  cinzel:"'Cinzel',serif" as const,
  cormo:"'Cormorant Garamond',serif" as const,
  raleway:"'Raleway',sans-serif" as const,
};

const STATUS_MAP: Record<string,{bg:string;color:string}> = {
  pending:         { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 35%)' },
  confirmed:       { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 35%)' },
  checked_in:      { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 28%)' },
  checked_out:     { bg:'hsl(220 20% 92%)', color:'hsl(220 15% 38%)' },
  cancelled:       { bg:'hsl(0 70% 94%)',   color:'hsl(0 60% 40%)' },
  delivered:       { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 28%)' },
  preparing:       { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 35%)' },
  accepted:        { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 35%)' },
  ready:           { bg:'hsl(270 60% 94%)', color:'hsl(270 50% 38%)' },
  delivering:      { bg:'hsl(195 70% 92%)', color:'hsl(195 60% 32%)' },
  completed:       { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 28%)' },
  open:            { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 35%)' },
  pending_payment: { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 35%)' },
  paid:            { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 28%)' },
};

export function StatusPill({ status }: { status: string }) {
  const c = STATUS_MAP[status] || { bg:'hsl(220 20% 92%)', color:'hsl(220 15% 38%)' };
  return (
    <span style={{ background:c.bg, color:c.color, fontFamily:A.cinzel, fontSize:'0.7rem', letterSpacing:'0.1em', textTransform:'uppercase' as const, padding:'0.3rem 0.8rem', whiteSpace:'nowrap' as const, fontWeight:600 }}>
      {status.replace(/_/g,' ')}
    </span>
  );
}

export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom:'2rem' }}>
      <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.9rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'0.4rem' }}>{eyebrow}</p>
      <h1 style={{ fontFamily:A.cinzel, fontWeight:700, fontSize:'clamp(1.4rem,3vw,2rem)', color:A.navy }}>{title}</h1>
      <div style={{ width:'4rem', height:'1px', background:A.divider, marginTop:'0.75rem' }} />
    </div>
  );
}

export function AdminTable({ headers, children, minWidth = 700 }: { headers: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflowX:'auto' as const }}>
      <table style={{ width:'100%', borderCollapse:'collapse' as const, minWidth }}>
        <thead>
          <tr style={{ background:A.navy }}>
            {headers.map(h => (
              <th key={h} style={{ textAlign:'left', padding:'0.9rem 1.1rem', fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.13em', textTransform:'uppercase' as const, color:A.gold, fontWeight:700, whiteSpace:'nowrap' as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminRow({ children }: { children: React.ReactNode }) {
  return <tr style={{ borderBottom:`1px solid ${A.border}` }} className="adm-row">{children}</tr>;
}

export function AdminTd({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding:'0.9rem 1.1rem', fontFamily:A.raleway, fontSize:'0.9rem', color:A.muted, verticalAlign:'middle', ...style }}>{children}</td>;
}

export function ActionBtn({ onClick, variant, children }: { onClick: ()=>void; variant: 'confirm'|'checkin'|'cancel'|'danger'|'view'|'complete'; children: React.ReactNode }) {
  const styles: Record<string,React.CSSProperties> = {
    confirm:  { color:'hsl(142 50% 30%)', border:'1px solid hsl(142 50% 75%)', background:'hsl(142 60% 97%)' },
    checkin:  { color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)' },
    cancel:   { color:'hsl(0 60% 42%)',   border:'1px solid hsl(0 60% 75%)',   background:'hsl(0 70% 97%)' },
    danger:   { color:'hsl(0 60% 42%)',   border:'1px solid hsl(0 60% 75%)',   background:'hsl(0 70% 97%)' },
    view:     { color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)' },
    complete: { color:'hsl(270 50% 38%)', border:'1px solid hsl(270 50% 75%)', background:'hsl(270 60% 97%)' },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], fontFamily:A.cinzel, fontSize:'0.67rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.35rem 0.9rem', cursor:'pointer', transition:'opacity 0.2s', fontWeight:600 }}>
      {children}
    </button>
  );
}

export function GoldBtn({ onClick, children, disabled }: { onClick?: ()=>void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:'linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%))', color:A.navy, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', padding:'0.625rem 1.5rem', border:'none', cursor:'pointer', fontWeight:700, opacity: disabled ? 0.55 : 1, transition:'opacity 0.2s' }}>
      {children}
    </button>
  );
}

export function NavyBtn({ onClick, children }: { onClick?: ()=>void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background:A.navy, color:A.goldLight, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', padding:'0.625rem 1.5rem', border:`1px solid hsl(43 72% 55%/0.3)`, cursor:'pointer', fontWeight:600, transition:'opacity 0.2s' }}>
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <tr><td colSpan={99} style={{ textAlign:'center', padding:'3rem' }}>
      <div style={{ display:'inline-block', width:'1.5rem', height:'1.5rem', border:`2px solid hsl(43 72% 55%)`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </td></tr>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr><td colSpan={colSpan} style={{ textAlign:'center', padding:'3rem', fontFamily:A.cinzel, fontSize:'0.82rem', color:A.muted, letterSpacing:'0.1em' }}>{message}</td></tr>
  );
}

export const adminTableCss = `
  .adm-row:hover td { background: hsl(38 40% 96%); }
  .adm-row td { transition: background 0.15s; }
`;
