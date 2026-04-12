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

// ── TableFilters ─────────────────────────────────────────────────────────────
// Generic filter bar: search input, any number of select dropdowns, and
// optional status pills. Drop it above any admin table and pass in your
// filter state + setters.

export interface FilterSelect {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  width?: number;
}

export interface StatusPillFilter {
  values: string[];          // all possible status values
  active: string;            // currently selected ('' = all)
  onChange: (v: string) => void;
  allLabel?: string;         // label for the empty/all option
}

export interface TableFiltersProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  selects?: FilterSelect[];
  statusPills?: StatusPillFilter;
  dateRange?: {
    from: string; onFromChange: (v: string) => void;
    to: string;   onToChange:   (v: string) => void;
  };
  sort?: {
    field: string; onFieldChange: (v: string) => void;
    dir: 'asc'|'desc'; onDirChange: (v: 'asc'|'desc') => void;
    options: { value: string; label: string }[];
  };
  resultCount?: number;
  onClear?: () => void;
  hasActiveFilters?: boolean;
}

const filterInput: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  border: `1px solid hsl(35 25% 82%)`,
  fontFamily: "'Cinzel',serif",
  fontSize: '0.72rem',
  color: 'hsl(220 55% 18%)',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

export function TableFilters({
  search, selects, statusPills, dateRange, sort, resultCount, onClear, hasActiveFilters,
}: TableFiltersProps) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Row 1: search + selects + date range + sort */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.625rem' }}>
        {search && (
          <div style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(220 15% 40%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search.value}
              onChange={e => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? 'Search…'}
              style={{ ...filterInput, width: '220px', paddingLeft: '2rem' }}
            />
          </div>
        )}

        {selects?.map((s, i) => (
          <select key={i} value={s.value} onChange={e => s.onChange(e.target.value)}
            style={{ ...filterInput, width: s.width ?? 180 }}>
            <option value="">{s.placeholder}</option>
            {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {dateRange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(220 15% 40%)" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <input type="date" value={dateRange.from} onChange={e => dateRange.onFromChange(e.target.value)}
              style={{ ...filterInput, width: 145 }} />
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.6rem', color: 'hsl(220 15% 40%)' }}>to</span>
            <input type="date" value={dateRange.to} onChange={e => dateRange.onToChange(e.target.value)}
              style={{ ...filterInput, width: 145 }} />
          </div>
        )}

        {sort && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <select value={sort.field} onChange={e => sort.onFieldChange(e.target.value)}
              style={{ ...filterInput, width: 110 }}>
              {sort.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => sort.onDirChange(sort.dir === 'asc' ? 'desc' : 'asc')}
              style={{ ...filterInput, width: 36, textAlign: 'center', cursor: 'pointer', padding: '0.45rem 0.4rem', fontWeight: 700 }}>
              {sort.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        {hasActiveFilters && onClear && (
          <button onClick={onClear}
            style={{ fontFamily: "'Cinzel',serif", fontSize: '0.58rem', letterSpacing: '0.08em', color: 'hsl(220 15% 40%)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Row 2: status pills + result count */}
      {statusPills && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {['', ...statusPills.values].map(st => (
            <button key={st} onClick={() => statusPills.onChange(st)}
              style={{
                fontFamily: "'Cinzel',serif", fontSize: '0.58rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '0.28rem 0.65rem', cursor: 'pointer',
                border: `1px solid ${statusPills.active === st ? 'hsl(43 72% 55%)' : 'hsl(35 25% 82%)'}`,
                background: statusPills.active === st ? 'hsl(43 72% 55% / 0.12)' : 'transparent',
                color: statusPills.active === st ? 'hsl(220 55% 18%)' : 'hsl(220 15% 40%)',
                fontWeight: statusPills.active === st ? 700 : 400,
              }}>
              {st ? st.replace(/_/g, ' ') : (statusPills.allLabel ?? 'All')}
            </button>
          ))}
          {resultCount !== undefined && (
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.6rem', color: 'hsl(220 15% 40%)', marginLeft: '0.5rem' }}>
              {resultCount} result{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({ page, pageSize, total, onPage, onPageSize, pageSizeOptions = [10, 25, 50] }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && total <= pageSizeOptions[0]) return null;

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    fontFamily: "'Cinzel',serif",
    fontSize: '0.62rem',
    letterSpacing: '0.06em',
    padding: '0.3rem 0.6rem',
    border: `1px solid ${active ? 'hsl(43 72% 55%)' : 'hsl(35 25% 82%)'}`,
    background: active ? 'hsl(43 72% 55% / 0.12)' : 'transparent',
    color: active ? 'hsl(220 55% 18%)' : disabled ? 'hsl(220 15% 65%)' : 'hsl(220 15% 40%)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 700 : 400,
    opacity: disabled ? 0.5 : 1,
  });

  // Build page numbers: show current ±2, always first/last, ellipsis
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.62rem', color: 'hsl(220 15% 40%)', letterSpacing: '0.05em' }}>
        {total === 0 ? 'No results' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} style={btnStyle(false, page <= 1)}>‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={{ fontFamily: "'Cinzel',serif", fontSize: '0.62rem', color: 'hsl(220 15% 55%)', padding: '0 0.2rem' }}>…</span>
            : <button key={p} onClick={() => onPage(p as number)} style={btnStyle(p === page)}>{p}</button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} style={btnStyle(false, page >= totalPages)}>›</button>
      </div>

      {onPageSize && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: '0.6rem', color: 'hsl(220 15% 40%)' }}>Per page:</span>
          <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
            style={{ ...filterInput, width: 70, padding: '0.3rem 0.4rem' }}>
            {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
