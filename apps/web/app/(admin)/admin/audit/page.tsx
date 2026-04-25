'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/authStore';
import api from '../../../../lib/api';

const A = {
  gold:'hsl(43 72% 55%)', goldDim:'hsl(43 72% 55% / 0.15)',
  navy:'hsl(220 55% 18%)',
  muted:'hsl(220 15% 40%)',
  border:'hsl(35 25% 82%)', borderLight:'hsl(35 25% 88%)',
  divider:'linear-gradient(90deg,transparent,hsl(43 72% 55%),transparent)',
  cinzel:"'Cinzel',serif", cormo:"'Cormorant Garamond',serif", raleway:"'Raleway',sans-serif",
  green:'hsl(142 50% 40%)', amber:'hsl(38 80% 45%)', blue:'hsl(210 70% 45%)', red:'hsl(0 60% 50%)',
  papyrus:'hsl(38 40% 92%)',
};

const PAGE_SIZE = 15;
type AuditTab = 'bills' | 'orders' | 'spa' | 'petty_cash';

interface AuditTransaction {
  type: 'bill' | 'cash_order' | 'cash_spa' | 'petty_cash';
  date: string;
  paymentMethod?: string;
  guestName?: string; guestEmail?: string;
  customerName?: string; purchasedBy?: string;
  nationality?: string;
  isNepali?: boolean; isWalkIn?: boolean;
  bookingRef?: string;
  sections?: { room: number; food: number; spa: number; other: number };
  serviceName?: string;
  amount?: number; amountNpr?: number;
  grandTotal?: number; grandTotalNpr?: number;
  vatEnabled?: boolean;
  prepaidAmount?: number;
  exchangeRate: number;
  itemCount?: number;
  vendor?: string;
}

interface AuditData {
  summary: {
    billRevenue: number; billRevenueNpr: number;
    cashOrderRevenue: number; cashOrderRevenueNpr: number;
    cashSpaRevenue: number; cashSpaRevenueNpr: number;
    totalRevenue: number; totalRevenueNpr: number;
    operationalExpenses: number; operationalExpensesNpr: number;
    netRevenue: number; netRevenueNpr: number;
    exchangeRate: number;
    billCount: number; orderCount: number; spaCount: number;
    cashBillCount: number; stripeBillCount: number;
  };
  bills: AuditTransaction[];
  orders: AuditTransaction[];
  spa: AuditTransaction[];
  pettyCash: AuditTransaction[];
}

// ── small shared components ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  paid:            { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 30%)' },
  pending_payment: { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 38%)' },
  cash:            { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 30%)' },
  stripe:          { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 38%)' },
  card_on_site:    { bg:'hsl(270 60% 94%)', color:'hsl(270 50% 38%)' },
  room_bill:       { bg:'hsl(220 80% 94%)', color:'hsl(220 70% 38%)' },
  pending:         { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 38%)' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg:'hsl(220 20% 92%)', color:'hsl(220 15% 40%)' };
  return (
    <span style={{ background:c.bg, color:c.color, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.09em', textTransform:'uppercase', padding:'0.25rem 0.6rem', whiteSpace:'nowrap', fontWeight:600 }}>
      {status.replace(/_/g,' ')}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign:'left', padding:'0.6rem 0.8rem', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.gold, fontWeight:600, whiteSpace:'nowrap', background:A.navy }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding:'0.6rem 0.8rem', borderBottom:`1px solid ${A.borderLight}`, verticalAlign:'middle', ...style }}>
      {children}
    </td>
  );
}

function NatBadge({ isNepali, nationality }: { isNepali?: boolean; nationality?: string }) {
  return (
    <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.2rem 0.5rem', background: isNepali ? 'hsl(195 60% 92%)' : A.goldDim, color: isNepali ? 'hsl(195 60% 30%)' : A.gold }}>
      {nationality ?? 'foreign'}
    </span>
  );
}

function TypeBadge({ isWalkIn }: { isWalkIn?: boolean }) {
  return (
    <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.2rem 0.5rem', background: isWalkIn ? 'hsl(38 90% 94%)' : A.goldDim, color: isWalkIn ? 'hsl(38 80% 38%)' : A.gold }}>
      {isWalkIn ? 'Walk-in' : 'Hotel'}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'4rem 0' }}>
      <div style={{ width:'1.75rem', height:'1.75rem', border:`2px solid ${A.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  search: string; onSearch: (v: string) => void;
  dateFrom: string; onDateFrom: (v: string) => void;
  dateTo: string; onDateTo: (v: string) => void;
  extra?: React.ReactNode;
  onReset: () => void;
}

function FilterBar({ search, onSearch, dateFrom, onDateFrom, dateTo, onDateTo, extra, onReset }: FilterBarProps) {
  const inputStyle: React.CSSProperties = {
    fontFamily:A.raleway, fontSize:'0.75rem', color:A.navy,
    border:`1px solid ${A.border}`, background:'#fff',
    padding:'0.45rem 0.7rem', outline:'none', width:'100%',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.muted, display:'block', marginBottom:'0.25rem',
  };

  return (
    <div style={{ background:'#fff', border:`1px solid ${A.border}`, padding:'1rem 1.25rem', marginBottom:'1rem', display:'flex', flexWrap:'wrap', gap:'1rem', alignItems:'flex-end' }}>
      <div style={{ minWidth:'180px', flex:'2' }}>
        <label style={labelStyle}>Search</label>
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Name, email, ref…" style={inputStyle} />
      </div>
      <div style={{ minWidth:'130px', flex:'1' }}>
        <label style={labelStyle}>From</label>
        <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ minWidth:'130px', flex:'1' }}>
        <label style={labelStyle}>To</label>
        <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} style={inputStyle} />
      </div>
      {extra}
      <div>
        <button onClick={onReset} style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.48rem 1rem', border:`1px solid ${A.border}`, background:'transparent', color:A.muted, cursor:'pointer' }}>
          Reset
        </button>
      </div>
    </div>
  );
}

// ── pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.08em',
    padding:'0.4rem 0.75rem', border:`1px solid ${active ? A.gold : A.border}`,
    background: active ? A.gold : '#fff', color: active ? A.navy : disabled ? A.border : A.muted,
    cursor: disabled ? 'default' : 'pointer', pointerEvents: disabled ? 'none' : 'auto',
  });

  const window_: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) window_.push(i);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
      <span style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>
        Page {page} of {pages} &nbsp;·&nbsp; {total} record{total !== 1 ? 's' : ''}
      </span>
      <div style={{ display:'flex', gap:'0.25rem' }}>
        <button style={btnStyle(false, page === 1)} onClick={() => onChange(1)}>«</button>
        <button style={btnStyle(false, page === 1)} onClick={() => onChange(page - 1)}>‹</button>
        {window_.map(p => (
          <button key={p} style={btnStyle(p === page)} onClick={() => onChange(p)}>{p}</button>
        ))}
        <button style={btnStyle(false, page === pages)} onClick={() => onChange(page + 1)}>›</button>
        <button style={btnStyle(false, page === pages)} onClick={() => onChange(pages)}>»</button>
      </div>
    </div>
  );
}

// ── select helper ─────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ minWidth:'130px', flex:'1' }}>
      <label style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.muted, display:'block', marginBottom:'0.25rem' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.navy, border:`1px solid ${A.border}`, background:'#fff', padding:'0.45rem 0.7rem', outline:'none', width:'100%', cursor:'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AuditReportPage() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const role     = (user as any)?.role;

  const [audit,   setAudit]   = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState<AuditTab>('bills');

  // ── per-tab filter state ──────────────────────────────────────────────────
  const initF = () => ({ search:'', dateFrom:'', dateTo:'', nat:'', payment:'', vatFilter:'', custType:'', page:1 });
  type F = ReturnType<typeof initF>;
  const [billsF,  setBillsF]  = useState<F>(initF());
  const [ordersF, setOrdersF] = useState<F>(initF());
  const [spaF,    setSpaF]    = useState<F>(initF());
  const [pcF,     setPcF]     = useState<F>(initF());

  const setF = (tab: AuditTab) => ({ bills: setBillsF, orders: setOrdersF, spa: setSpaF, petty_cash: setPcF }[tab]);
  const getF = (tab: AuditTab) => ({ bills: billsF,   orders: ordersF,   spa: spaF,   petty_cash: pcF }[tab]);

  useEffect(() => {
    if (role && role !== 'super_admin') { router.replace('/admin/dashboard'); return; }
    api.get('/analytics')
      .then((r: { data: { audit?: AuditData } }) => {
        if (r.data.audit) setAudit(r.data.audit);
        else setError('No audit data returned.');
      })
      .catch(() => setError('Failed to load audit data.'))
      .finally(() => setLoading(false));
  }, [role, router]);

  // reset page when tab changes
  const handleTab = (t: AuditTab) => { setTab(t); setF(t)(prev => ({ ...prev, page:1 })); };

  if (!user || role !== 'super_admin') return null;

  const sum = audit?.summary;

  // ── filter + paginate helpers ─────────────────────────────────────────────
  function inDateRange(dateStr: string, from: string, to: string) {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to   && d > new Date(to  + 'T23:59:59').getTime()) return false;
    return true;
  }

  const filteredBills = useMemo(() => {
    const f = billsF;
    return (audit?.bills ?? []).filter(b => {
      const s = f.search.toLowerCase();
      if (s && !`${b.guestName} ${b.guestEmail} ${b.bookingRef}`.toLowerCase().includes(s)) return false;
      if (!inDateRange(b.date, f.dateFrom, f.dateTo)) return false;
      if (f.nat     && b.nationality !== f.nat) return false;
      if (f.payment && b.paymentMethod !== f.payment) return false;
      if (f.vatFilter === 'vat'   && !b.vatEnabled) return false;
      if (f.vatFilter === 'novat' &&  b.vatEnabled) return false;
      return true;
    });
  }, [audit, billsF]);

  const filteredOrders = useMemo(() => {
    const f = ordersF;
    return (audit?.orders ?? []).filter(o => {
      const s = f.search.toLowerCase();
      if (s && !(o.customerName ?? '').toLowerCase().includes(s)) return false;
      if (!inDateRange(o.date, f.dateFrom, f.dateTo)) return false;
      if (f.nat      && o.nationality !== f.nat) return false;
      if (f.custType === 'walkin' && !o.isWalkIn) return false;
      if (f.custType === 'hotel'  &&  o.isWalkIn) return false;
      return true;
    });
  }, [audit, ordersF]);

  const filteredSpa = useMemo(() => {
    const f = spaF;
    return (audit?.spa ?? []).filter(s => {
      const q = f.search.toLowerCase();
      if (q && !`${s.customerName} ${s.serviceName}`.toLowerCase().includes(q)) return false;
      if (!inDateRange(s.date, f.dateFrom, f.dateTo)) return false;
      if (f.nat      && s.nationality !== f.nat) return false;
      if (f.custType === 'walkin' && !s.isWalkIn) return false;
      if (f.custType === 'hotel'  &&  s.isWalkIn) return false;
      return true;
    });
  }, [audit, spaF]);

  const filteredPc = useMemo(() => {
    const f = pcF;
    return (audit?.pettyCash ?? []).filter(p => {
      const s = f.search.toLowerCase();
      if (s && !`${p.purchasedBy} ${p.vendor}`.toLowerCase().includes(s)) return false;
      if (!inDateRange(p.date, f.dateFrom, f.dateTo)) return false;
      return true;
    });
  }, [audit, pcF]);

  function paginate<T>(arr: T[], page: number) {
    const start = (page - 1) * PAGE_SIZE;
    return arr.slice(start, start + PAGE_SIZE);
  }

  const billsPage  = paginate(filteredBills,  billsF.page);
  const ordersPage = paginate(filteredOrders, ordersF.page);
  const spaPage    = paginate(filteredSpa,    spaF.page);
  const pcPage     = paginate(filteredPc,     pcF.page);

  // filtered totals for the active tab (shown below filters)
  const filteredBillsTotal  = filteredBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
  const filteredOrdersTotal = filteredOrders.reduce((s, o) => s + (o.amount ?? 0), 0);
  const filteredSpaTotal    = filteredSpa.reduce((s, b) => s + (b.amount ?? 0), 0);
  const filteredPcTotal     = filteredPc.reduce((s, p) => s + (p.amount ?? 0), 0);

  const summaryCards = [
    { label:'Bill Revenue',         usd: sum?.billRevenue         ?? 0, npr: sum?.billRevenueNpr         ?? 0, color: A.gold  },
    { label:'Cash Orders',          usd: sum?.cashOrderRevenue    ?? 0, npr: sum?.cashOrderRevenueNpr    ?? 0, color: A.blue  },
    { label:'Cash Spa',             usd: sum?.cashSpaRevenue      ?? 0, npr: sum?.cashSpaRevenueNpr      ?? 0, color: 'hsl(270 50% 52%)' },
    { label:'Total Revenue',        usd: sum?.totalRevenue        ?? 0, npr: sum?.totalRevenueNpr        ?? 0, color: A.navy  },
    { label:'Operational Expenses', usd: sum?.operationalExpenses ?? 0, npr: sum?.operationalExpensesNpr ?? 0, color: A.red   },
    { label:'Net Revenue',          usd: sum?.netRevenue          ?? 0, npr: sum?.netRevenueNpr          ?? 0, color: A.green },
  ];

  const tabs: { key: AuditTab; label: string }[] = [
    { key:'bills',      label:`Bills (${sum?.billCount ?? 0})` },
    { key:'orders',     label:`Cash Orders (${sum?.orderCount ?? 0})` },
    { key:'spa',        label:`Cash Spa (${sum?.spaCount ?? 0})` },
    { key:'petty_cash', label:`Expenses (${audit?.pettyCash.length ?? 0})` },
  ];

  const natOptions = [
    { value:'', label:'All Nationalities' },
    { value:'nepali',  label:'Nepali' },
    { value:'foreign', label:'Foreign' },
  ];
  const paymentOptions = [
    { value:'', label:'All Payments' },
    { value:'cash',         label:'Cash' },
    { value:'stripe',       label:'Stripe' },
    { value:'card_on_site', label:'Card on Site' },
  ];
  const vatOptions = [
    { value:'',     label:'VAT: All' },
    { value:'vat',  label:'With VAT' },
    { value:'novat',label:'No VAT' },
  ];
  const custTypeOptions = [
    { value:'',      label:'All Types' },
    { value:'walkin',label:'Walk-in' },
    { value:'hotel', label:'Hotel Guest' },
  ];

  // ── filtered-total bar shown below filters ─────────────────────────────────
  function FilteredTotal({ count, total }: { count: number; total: number }) {
    if (count === 0) return null;
    return (
      <div style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted, marginBottom:'0.5rem' }}>
        Showing <strong style={{ color:A.navy }}>{count}</strong> record{count !== 1 ? 's' : ''} &nbsp;·&nbsp;
        Filtered total: <strong style={{ color:A.gold }}>${total.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}</strong>
      </div>
    );
  }

  const colSpanMap: Record<AuditTab, number> = { bills: 14, orders: 10, spa: 9, petty_cash: 6 };

  return (
    <>
      <style>{`
        .arow:hover td { background: hsl(38 40% 97%); }
        .arow td { transition: background 0.15s; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <div style={{ padding:'2rem 2rem 4rem', maxWidth:'1440px' }}>

        {/* Page header */}
        <div style={{ marginBottom:'2rem' }}>
          <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.9rem', letterSpacing:'0.3em', textTransform:'uppercase', margin:'0 0 0.3rem' }}>Superadmin</p>
          <h1 style={{ fontFamily:A.cinzel, fontWeight:700, fontSize:'clamp(1.4rem,2.5vw,1.9rem)', color:A.navy, margin:'0 0 0.6rem' }}>Revenue Audit</h1>
          <div style={{ width:'4rem', height:'1px', background:A.divider }} />
          {sum && (
            <p style={{ fontFamily:A.raleway, fontSize:'0.78rem', color:A.muted, marginTop:'0.75rem' }}>
              Exchange rate: <strong style={{ color:A.navy }}>1 USD = Rs. {sum.exchangeRate}</strong>
              &nbsp;·&nbsp; Stripe bills: {sum.stripeBillCount} &nbsp;·&nbsp; Cash bills: {sum.cashBillCount}
              &nbsp;·&nbsp; <span style={{ color:A.green }}>Net: ${(sum.netRevenue).toLocaleString()}</span>
            </p>
          )}
        </div>

        {error && (
          <div style={{ background:'hsl(0 70% 97%)', border:'1px solid hsl(0 70% 85%)', padding:'1rem 1.25rem', marginBottom:'1.5rem', fontFamily:A.raleway, color:'hsl(0 60% 42%)', fontSize:'0.85rem' }}>
            {error}
          </div>
        )}

        {loading ? <Spinner /> : (
          <>
            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'2rem' }}>
              {summaryCards.map(s => (
                <div key={s.label} style={{ background:'#fff', border:`1px solid ${A.border}`, padding:'1.1rem 1.25rem' }}>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.63rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.muted, marginBottom:'0.5rem' }}>{s.label}</div>
                  <div style={{ fontFamily:A.cinzel, fontSize:'1.4rem', fontWeight:700, color:s.color, lineHeight:1 }}>${s.usd.toLocaleString()}</div>
                  <div style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.gold, fontWeight:600, marginTop:'0.25rem' }}>Rs. {s.npr.toLocaleString()}</div>
                  <div style={{ fontFamily:A.raleway, fontSize:'0.67rem', color:A.muted, marginTop:'0.15rem' }}>1 USD = Rs. {sum?.exchangeRate}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:`1px solid ${A.border}`, marginBottom:'0' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => handleTab(t.key)} style={{
                  fontFamily:A.cinzel, fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase',
                  padding:'0.65rem 1.25rem', border:'none', background:'none', cursor:'pointer',
                  color: tab === t.key ? A.navy : A.muted,
                  borderBottom: tab === t.key ? `2px solid ${A.gold}` : '2px solid transparent',
                  marginBottom:'-1px', fontWeight: tab === t.key ? 700 : 400,
                }}>{t.label}</button>
              ))}
            </div>

            {/* ── BILLS tab ─────────────────────────────────────────────── */}
            {tab === 'bills' && (() => {
              const f = billsF;
              const upd = (patch: Partial<F>) => setBillsF(prev => ({ ...prev, ...patch, page: 'page' in patch ? patch.page! : 1 }));
              return (
                <div style={{ marginTop:'1rem' }}>
                  <FilterBar
                    search={f.search} onSearch={v => upd({ search:v })}
                    dateFrom={f.dateFrom} onDateFrom={v => upd({ dateFrom:v })}
                    dateTo={f.dateTo}   onDateTo={v => upd({ dateTo:v })}
                    onReset={() => setBillsF(initF())}
                    extra={<>
                      <FilterSelect label="Nationality" value={f.nat}        onChange={v => upd({ nat:v })}        options={natOptions} />
                      <FilterSelect label="Payment"     value={f.payment}    onChange={v => upd({ payment:v })}    options={paymentOptions} />
                      <FilterSelect label="VAT"         value={f.vatFilter}  onChange={v => upd({ vatFilter:v })}  options={vatOptions} />
                    </>}
                  />
                  <FilteredTotal count={filteredBills.length} total={filteredBillsTotal} />
                  <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'1020px' }}>
                      <thead><tr>
                        {['Guest','Type','Nationality','Booking Ref','Room','Food','Spa','Other','Total USD','Total NPR','Rate','VAT','Payment','Date'].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {billsPage.length === 0 ? (
                          <tr><td colSpan={colSpanMap.bills} style={{ textAlign:'center', padding:'2.5rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No matching bills</td></tr>
                        ) : billsPage.map((b, i) => (
                          <tr key={i} className="arow">
                            <Td>
                              <div style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>{b.guestName}</div>
                              <div style={{ fontFamily:A.raleway, fontSize:'0.66rem', color:A.muted }}>{b.guestEmail}</div>
                            </Td>
                            <Td><TypeBadge isWalkIn={b.isWalkIn} /></Td>
                            <Td><NatBadge isNepali={b.isNepali} nationality={b.nationality} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{b.bookingRef}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>${(b.sections?.room  ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>${(b.sections?.food  ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>${(b.sections?.spa   ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>${(b.sections?.other ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.82rem', fontWeight:700, color:A.navy }}>${(b.grandTotal ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.gold }}>Rs. {(b.grandTotalNpr ?? 0).toLocaleString()}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.7rem', color:A.muted, whiteSpace:'nowrap' }}>
                              Rs. {b.exchangeRate}
                              {!b.exchangeRate && <span style={{ color:A.amber }}> est.</span>}
                            </Td>
                            <Td>
                              <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', padding:'0.2rem 0.5rem', background: b.vatEnabled ? 'hsl(142 60% 92%)' : A.goldDim, color: b.vatEnabled ? 'hsl(142 50% 30%)' : A.muted }}>
                                {b.vatEnabled ? '13% VAT' : 'No VAT'}
                              </span>
                            </Td>
                            <Td><StatusPill status={b.paymentMethod ?? 'pending'} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.67rem', color:A.muted, whiteSpace:'nowrap' }}>{fmtDate(b.date)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={f.page} total={filteredBills.length} pageSize={PAGE_SIZE} onChange={p => upd({ page:p })} />
                </div>
              );
            })()}

            {/* ── ORDERS tab ────────────────────────────────────────────── */}
            {tab === 'orders' && (() => {
              const f = ordersF;
              const upd = (patch: Partial<F>) => setOrdersF(prev => ({ ...prev, ...patch, page: 'page' in patch ? patch.page! : 1 }));
              return (
                <div style={{ marginTop:'1rem' }}>
                  <FilterBar
                    search={f.search} onSearch={v => upd({ search:v })}
                    dateFrom={f.dateFrom} onDateFrom={v => upd({ dateFrom:v })}
                    dateTo={f.dateTo}   onDateTo={v => upd({ dateTo:v })}
                    onReset={() => setOrdersF(initF())}
                    extra={<>
                      <FilterSelect label="Nationality" value={f.nat}      onChange={v => upd({ nat:v })}      options={natOptions} />
                      <FilterSelect label="Type"        value={f.custType} onChange={v => upd({ custType:v })} options={custTypeOptions} />
                    </>}
                  />
                  <FilteredTotal count={filteredOrders.length} total={filteredOrdersTotal} />
                  <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'760px' }}>
                      <thead><tr>
                        {['Customer','Type','Nationality','Section','Items','Amount USD','Amount NPR','Rate','Payment','Date'].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {ordersPage.length === 0 ? (
                          <tr><td colSpan={colSpanMap.orders} style={{ textAlign:'center', padding:'2.5rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No matching cash orders</td></tr>
                        ) : ordersPage.map((o, i) => (
                          <tr key={i} className="arow">
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>{o.customerName}</Td>
                            <Td><TypeBadge isWalkIn={o.isWalkIn} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted, textTransform:'capitalize' }}>{o.nationality}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>Food &amp; Bar</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{o.itemCount}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.82rem', fontWeight:700, color:A.navy }}>${(o.amount ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.gold }}>Rs. {(o.amountNpr ?? 0).toLocaleString()}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.7rem', color:A.muted, whiteSpace:'nowrap' }}>Rs. {o.exchangeRate}</Td>
                            <Td><StatusPill status={o.paymentMethod ?? 'cash'} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.67rem', color:A.muted, whiteSpace:'nowrap' }}>{fmtDate(o.date)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={f.page} total={filteredOrders.length} pageSize={PAGE_SIZE} onChange={p => upd({ page:p })} />
                </div>
              );
            })()}

            {/* ── SPA tab ───────────────────────────────────────────────── */}
            {tab === 'spa' && (() => {
              const f = spaF;
              const upd = (patch: Partial<F>) => setSpaF(prev => ({ ...prev, ...patch, page: 'page' in patch ? patch.page! : 1 }));
              return (
                <div style={{ marginTop:'1rem' }}>
                  <FilterBar
                    search={f.search} onSearch={v => upd({ search:v })}
                    dateFrom={f.dateFrom} onDateFrom={v => upd({ dateFrom:v })}
                    dateTo={f.dateTo}   onDateTo={v => upd({ dateTo:v })}
                    onReset={() => setSpaF(initF())}
                    extra={<>
                      <FilterSelect label="Nationality" value={f.nat}      onChange={v => upd({ nat:v })}      options={natOptions} />
                      <FilterSelect label="Type"        value={f.custType} onChange={v => upd({ custType:v })} options={custTypeOptions} />
                    </>}
                  />
                  <FilteredTotal count={filteredSpa.length} total={filteredSpaTotal} />
                  <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'740px' }}>
                      <thead><tr>
                        {['Customer','Type','Nationality','Service','Amount USD','Amount NPR','Rate','Payment','Date'].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {spaPage.length === 0 ? (
                          <tr><td colSpan={colSpanMap.spa} style={{ textAlign:'center', padding:'2.5rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No matching spa bookings</td></tr>
                        ) : spaPage.map((s, i) => (
                          <tr key={i} className="arow">
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>{s.customerName}</Td>
                            <Td><TypeBadge isWalkIn={s.isWalkIn} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted, textTransform:'capitalize' }}>{s.nationality}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{s.serviceName}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.82rem', fontWeight:700, color:A.navy }}>${(s.amount ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.gold }}>Rs. {(s.amountNpr ?? 0).toLocaleString()}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.7rem', color:A.muted, whiteSpace:'nowrap' }}>Rs. {s.exchangeRate}</Td>
                            <Td><StatusPill status={s.paymentMethod ?? 'cash'} /></Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.67rem', color:A.muted, whiteSpace:'nowrap' }}>{fmtDate(s.date)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={f.page} total={filteredSpa.length} pageSize={PAGE_SIZE} onChange={p => upd({ page:p })} />
                </div>
              );
            })()}

            {/* ── PETTY CASH tab ────────────────────────────────────────── */}
            {tab === 'petty_cash' && (() => {
              const f = pcF;
              const upd = (patch: Partial<F>) => setPcF(prev => ({ ...prev, ...patch, page: 'page' in patch ? patch.page! : 1 }));
              return (
                <div style={{ marginTop:'1rem' }}>
                  <FilterBar
                    search={f.search} onSearch={v => upd({ search:v })}
                    dateFrom={f.dateFrom} onDateFrom={v => upd({ dateFrom:v })}
                    dateTo={f.dateTo}   onDateTo={v => upd({ dateTo:v })}
                    onReset={() => setPcF(initF())}
                  />
                  <FilteredTotal count={filteredPc.length} total={filteredPcTotal} />
                  <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
                      <thead><tr>
                        {['Purchased By','Vendor','Amount USD','Amount NPR','Rate (current)','Date'].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {pcPage.length === 0 ? (
                          <tr><td colSpan={colSpanMap.petty_cash} style={{ textAlign:'center', padding:'2.5rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No matching expenses</td></tr>
                        ) : pcPage.map((p, i) => (
                          <tr key={i} className="arow">
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>{p.purchasedBy}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{p.vendor ?? '—'}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.82rem', fontWeight:700, color:A.red }}>${(p.amount ?? 0).toFixed(2)}</Td>
                            <Td style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:'hsl(0 50% 65%)' }}>Rs. {(p.amountNpr ?? 0).toLocaleString()}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.7rem', color:A.muted, whiteSpace:'nowrap' }}>Rs. {p.exchangeRate}</Td>
                            <Td style={{ fontFamily:A.raleway, fontSize:'0.67rem', color:A.muted, whiteSpace:'nowrap' }}>{fmtDate(p.date)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={f.page} total={filteredPc.length} pageSize={PAGE_SIZE} onChange={p => upd({ page:p })} />
                </div>
              );
            })()}

          </>
        )}
      </div>
    </>
  );
}
