'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import {
  CalendarCheck, UserCheck, Clock3, TrendingUp, BedDouble,
  ShoppingCart, DollarSign, ArrowRight, Users,
  Package2, AlertTriangle, AlertOctagon,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

const A = {
  gold:'hsl(43 72% 55%)', goldLight:'hsl(43 65% 72%)', goldDim:'hsl(43 72% 55% / 0.15)',
  navy:'hsl(220 55% 18%)', navyMid:'hsl(220 45% 24%)', navyLight:'hsl(220 35% 28%)',
  cream:'hsl(40 33% 96%)', papyrus:'hsl(38 40% 92%)', muted:'hsl(220 15% 40%)',
  border:'hsl(35 25% 82%)', borderLight:'hsl(35 25% 88%)',
  divider:'linear-gradient(90deg,transparent,hsl(43 72% 55%),transparent)',
  cinzel:"'Cinzel',serif", cormo:"'Cormorant Garamond',serif", raleway:"'Raleway',sans-serif",
  green:'hsl(142 50% 40%)', amber:'hsl(38 80% 45%)', blue:'hsl(210 70% 45%)',
};

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  pending:     { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 38%)' },
  confirmed:   { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 38%)' },
  checked_in:  { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 30%)' },
  checked_out: { bg:'hsl(220 20% 92%)', color:'hsl(220 15% 40%)' },
  cancelled:   { bg:'hsl(0 70% 94%)',   color:'hsl(0 60% 42%)' },
  delivered:   { bg:'hsl(142 60% 92%)', color:'hsl(142 50% 30%)' },
  preparing:   { bg:'hsl(38 90% 94%)',  color:'hsl(38 80% 38%)' },
  accepted:    { bg:'hsl(210 80% 94%)', color:'hsl(210 70% 38%)' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg:'hsl(220 20% 92%)', color:'hsl(220 15% 40%)' };
  return (
    <span style={{ background:c.bg, color:c.color, fontFamily:A.cinzel, fontSize:'0.7rem', letterSpacing:'0.09em', textTransform:'uppercase', padding:'0.3rem 0.8rem', borderRadius:'0', whiteSpace:'nowrap', fontWeight:600 }}>
      {status.replace(/_/g,' ')}
    </span>
  );
}

function SectionTitle({ children, href, linkLabel='View All' }: { children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
      <h2 style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.navy, margin:0 }}>{children}</h2>
      {href && (
        <a href={href} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.gold, textDecoration:'none' }}>
          {linkLabel} <ArrowRight size={11} />
        </a>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${A.border}`, ...style }}>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:A.navy, border:`1px solid ${A.gold}`, padding:'0.6rem 1rem', fontFamily:A.raleway, fontSize:'0.78rem', color:'#fff', borderRadius:'0' }}>
      <p style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', color:A.gold, marginBottom:'0.3rem', margin:0 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ margin:'0.2rem 0 0', color:'#fff' }}>
          {p.name === 'revenue' ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

interface Analytics {
  scope: { showRooms: boolean; showFood: boolean; showSpa: boolean };
  isSuperAdmin: boolean;
  kpis: {
    totalRooms: number; availableRooms: number; occupancyRate: number;
    checkedIn: number; pending: number; confirmed: number;
    totalRevenue: number; pendingOrders: number; totalReservations: number;
  };
  charts: {
    reservationsTrend: { date: string; reservations: number }[];
    revenueTrend: { date: string; revenue: number }[];
    statusBreakdown: { name: string; value: number; color: string }[];
    roomTypeRevenue: { type: string; revenue: number; bookings: number }[];
    revenueBySection: { section: string; revenue: number; color: string }[];
  };
  recent: {
    reservations: any[];
    orders: any[];
  };
  orderStats: { total: number; delivered: number; pending: number; totalRevenue: number };
  spaStats: { total: number; confirmed: number; completed: number; revenue: number };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invStats, setInvStats] = useState<{ totalIngredients: number; lowStockCount: number; outOfStockCount: number } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/analytics'),
      api.get('/inventory/stats').catch(() => null),
    ]).then(([analytics, inv]) => {
      setData(analytics.data);
      if (inv) setInvStats({ totalIngredients: inv.data.totalIngredients, lowStockCount: inv.data.lowStockCount, outOfStockCount: inv.data.outOfStockCount });
      setLoading(false);
    }).catch(() => { setError('Failed to load analytics'); setLoading(false); });
  }, []);

  const Spinner = () => (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'4rem 0' }}>
      <div style={{ width:'1.75rem', height:'1.75rem', border:`2px solid ${A.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const kpis = data?.kpis;
  const scope = data?.scope ?? { showRooms: true, showFood: true, showSpa: true };

  const allStatCards = [
    { label:'Total Reservations', value: kpis?.totalReservations ?? '—', Icon: CalendarCheck, color: A.gold,  bg: A.goldDim, sub: `${kpis?.confirmed ?? 0} confirmed`, show: scope.showRooms },
    { label:'Guests Checked In',  value: kpis?.checkedIn ?? '—',         Icon: UserCheck,     color: A.green, bg: 'hsl(142 60% 40% / 0.1)', sub: `${kpis?.occupancyRate ?? 0}% occupancy`, show: scope.showRooms },
    { label:'Available Rooms',    value: kpis?.availableRooms ?? '—',    Icon: BedDouble,     color: A.gold,  bg: A.goldDim, sub: `of ${kpis?.totalRooms ?? 0} total`, show: scope.showRooms },
    { label:'Pending Guests',     value: kpis?.pending ?? '—',           Icon: Clock3,        color: A.amber, bg: 'hsl(38 90% 45% / 0.1)',  sub: 'awaiting check-in', show: scope.showRooms },
    { label:'Pending Orders',     value: kpis?.pendingOrders ?? '—',     Icon: ShoppingCart,  color: A.amber, bg: 'hsl(38 90% 45% / 0.1)',  sub: `${data?.orderStats.total ?? 0} total orders`, show: scope.showFood },
    { label:'Order Revenue',      value: data ? `$${data.orderStats.totalRevenue.toLocaleString()}` : '—', Icon: TrendingUp, color: A.blue, bg: 'hsl(210 80% 45% / 0.1)', sub: 'from delivered orders', show: (data?.isSuperAdmin ?? false) && scope.showFood },
    { label:'Spa Bookings',       value: data?.spaStats.total ?? '—',    Icon: Users,         color: A.green, bg: 'hsl(142 60% 40% / 0.1)', sub: `${data?.spaStats.completed ?? 0} completed`, show: scope.showSpa },
    { label:'Total Revenue',      value: kpis ? `$${kpis.totalRevenue.toLocaleString()}` : '—', Icon: DollarSign, color: A.blue, bg: 'hsl(210 80% 45% / 0.1)', sub: 'from paid bills', show: data?.isSuperAdmin ?? true },
  ];
  const statCards = allStatCards.filter(c => c.show);

  return (
    <>
      <style>{`
        .stat-card{background:#fff;border:1px solid ${A.border};padding:1.5rem;transition:box-shadow 0.25s,transform 0.25s,border-color 0.25s;}
        .stat-card:hover{box-shadow:0 8px 28px -4px hsl(220 55% 18% / 0.12);transform:translateY(-2px);border-color:${A.gold};}
        .trow:hover td{background:hsl(38 40% 97%);}
        .trow td{transition:background 0.2s;}
        .chart-card{background:#fff;border:1px solid ${A.border};padding:1.5rem 1.75rem;}
      `}</style>

      <div style={{ padding:'2rem 2rem 3rem', maxWidth:'1400px' }}>

        {/* Header */}
        <div style={{ marginBottom:'2.5rem' }}>
          <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.9rem', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:'0.4rem', margin:0 }}>Control Center</p>
          <h1 style={{ fontFamily:A.cinzel, fontWeight:700, fontSize:'clamp(1.5rem,3vw,2rem)', color:A.navy, margin:'0.3rem 0 0.8rem' }}>Dashboard</h1>
          <div style={{ width:'4rem', height:'1px', background:A.divider }} />
        </div>

        {error && (
          <div style={{ background:'hsl(0 70% 97%)', border:'1px solid hsl(0 70% 85%)', padding:'1rem 1.25rem', marginBottom:'1.5rem', fontFamily:A.raleway, color:'hsl(0 60% 42%)', fontSize:'0.85rem' }}>
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1.25rem', marginBottom:'2.5rem' }}>
          {statCards.map(({ label, value, Icon, color, bg, sub }) => (
            <div key={label} className="stat-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                <div style={{ width:'2.5rem', height:'2.5rem', background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={color} strokeWidth={1.8} />
                </div>
              </div>
              <div style={{ fontFamily:A.cinzel, fontSize:'1.8rem', fontWeight:700, color:A.navy, lineHeight:1, marginBottom:'0.35rem' }}>
                {loading ? <span style={{ color:A.borderLight }}>—</span> : value}
              </div>
              <div style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.muted, marginBottom:'0.25rem' }}>{label}</div>
              {!loading && <div style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Inventory Snapshot — food admin only */}
        {scope.showFood && <div style={{ marginBottom:'2.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <p style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.navy, margin:0 }}>Inventory Snapshot</p>
            <a href="/admin/inventory" style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.gold, textDecoration:'none' }}>
              View Inventory <ArrowRight size={11} />
            </a>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
            {[
              { label:'Total Ingredients', value: invStats?.totalIngredients ?? '—', Icon: Package2,     iconColor: A.gold,            bg: '#fff',              border: A.border },
              { label:'Low Stock Alerts',  value: invStats?.lowStockCount    ?? '—', Icon: AlertTriangle, iconColor:'hsl(38 80% 45%)',  bg:'hsl(38 90% 96%)',   border:'hsl(38 80% 78%)' },
              { label:'Out of Stock',      value: invStats?.outOfStockCount  ?? '—', Icon: AlertOctagon,  iconColor:'hsl(0 60% 50%)',   bg:'hsl(0 60% 97%)',    border:'hsl(0 60% 80%)' },
            ].map(({ label, value, Icon, iconColor, bg, border }) => (
              <div key={label} style={{ background:bg, border:`1px solid ${border}`, padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:'2.5rem', height:'2.5rem', background:`${iconColor}18`, border:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} color={iconColor} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontFamily:A.cinzel, fontSize:'1.6rem', fontWeight:700, color:A.navy, lineHeight:1 }}>{loading ? '—' : value}</div>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.muted, marginTop:'0.25rem' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* Charts Row 1 — rooms/reservations (front_desk + super_admin) */}
        {scope.showRooms && (
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>

            {/* Reservations Trend - Line Chart */}
            <div className="chart-card">
              <SectionTitle href="/admin/reservations">Reservations — Last 30 Days</SectionTitle>
              {loading ? <Spinner /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data?.charts.reservationsTrend || []} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 25% 88%)" />
                    <XAxis dataKey="date" tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={{ stroke:A.borderLight }} interval={4} />
                    <YAxis tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone" dataKey="reservations" name="reservations"
                      stroke={A.gold} strokeWidth={2.5} dot={false}
                      activeDot={{ r:5, fill:A.gold, stroke:'#fff', strokeWidth:2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Reservation Status Breakdown - Pie */}
            <div className="chart-card">
              <SectionTitle>Status Breakdown</SectionTitle>
              {loading ? <Spinner /> : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data?.charts.statusBreakdown || []}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        paddingAngle={3} dataKey="value"
                      >
                        {(data?.charts.statusBreakdown || []).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontFamily:A.raleway, fontSize:'0.78rem', background:A.navy, border:`1px solid ${A.gold}`, color:'#fff', borderRadius:0 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginTop:'0.5rem' }}>
                    {(data?.charts.statusBreakdown || []).map((s, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
                          <div style={{ width:'0.55rem', height:'0.55rem', background:s.color, flexShrink:0 }} />
                          <span style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{s.name}</span>
                        </div>
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, fontWeight:600 }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Charts Row 2 — revenue (super_admin sees all; scoped admins see relevant subset) */}
        {(scope.showRooms || scope.showFood || data?.isSuperAdmin) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1.5rem', marginBottom:'2.5rem' }}>

            {/* Revenue Trend - super_admin only */}
            {data?.isSuperAdmin && (
              <div className="chart-card">
                <SectionTitle>Revenue — Last 7 Days</SectionTitle>
                {loading ? <Spinner /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data?.charts.revenueTrend || []} margin={{ top:5, right:10, left:-10, bottom:0 }} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 25% 88%)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={{ stroke:A.borderLight }} />
                      <YAxis tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="revenue" fill={A.gold} radius={[2,2,0,0]}>
                        {(data?.charts.revenueTrend || []).map((_, i) => (
                          <Cell key={i} fill={i === (data?.charts.revenueTrend.length ?? 1) - 1 ? A.navy : A.gold} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Room Type Revenue - super_admin only */}
            {data?.isSuperAdmin && (
              <div className="chart-card">
                <SectionTitle>Revenue by Room Type</SectionTitle>
                {loading ? <Spinner /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data?.charts.roomTypeRevenue || []} margin={{ top:5, right:10, left:-10, bottom:0 }} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 25% 88%)" vertical={false} />
                      <XAxis dataKey="type" tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={{ stroke:A.borderLight }} />
                      <YAxis tick={{ fontFamily:A.raleway, fontSize:10, fill:A.muted }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="revenue" radius={[2,2,0,0]}>
                        {['Royal','Suite','Deluxe','Standard'].map((_, i) => (
                          <Cell key={i} fill={[A.gold, A.navy, A.green, A.blue][i % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Revenue by Section - super_admin only */}
            {data?.isSuperAdmin && (
              <div className="chart-card">
                <SectionTitle>Revenue by Section</SectionTitle>
                {loading ? <Spinner /> : (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={data?.charts.revenueBySection || []}
                          cx="50%" cy="50%"
                          innerRadius={40} outerRadius={65}
                          paddingAngle={3} dataKey="revenue"
                        >
                          {(data?.charts.revenueBySection || []).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']} contentStyle={{ fontFamily:A.raleway, fontSize:'0.78rem', background:A.navy, border:`1px solid ${A.gold}`, color:'#fff', borderRadius:0 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginTop:'0.5rem' }}>
                      {(data?.charts.revenueBySection || []).map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
                            <div style={{ width:'0.55rem', height:'0.55rem', background:s.color, flexShrink:0 }} />
                            <span style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>{s.section}</span>
                          </div>
                          <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, fontWeight:600 }}>${s.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tables Row */}
        <div style={{ display:'grid', gridTemplateColumns: scope.showRooms && scope.showFood ? '1fr 1fr' : '1fr', gap:'2rem' }}>

          {/* Recent Reservations — front_desk + super_admin */}
          {scope.showRooms && (
            <div>
              <SectionTitle href="/admin/reservations">Recent Reservations</SectionTitle>
              <Card>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:A.navy }}>
                      {['Guest','Room','Check In','Status'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'0.7rem 1rem', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.14em', textTransform:'uppercase', color:A.gold, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4}><Spinner /></td></tr>
                    ) : !data?.recent.reservations.length ? (
                      <tr><td colSpan={4} style={{ textAlign:'center', padding:'2rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No reservations</td></tr>
                    ) : data.recent.reservations.map((r: any) => (
                      <tr key={r._id} className="trow">
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}` }}>
                          <div style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>{r.guest?.name || '—'}</div>
                        </td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}`, fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted }}>{r.room?.name || r.room?.roomNumber || '—'}</td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}`, fontFamily:A.raleway, fontSize:'0.73rem', color:A.muted }}>
                          {r.checkInDate ? new Date(r.checkInDate).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
                        </td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}` }}><StatusPill status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Pending Orders — food + super_admin */}
          {scope.showFood && (
            <div>
              <SectionTitle href="/admin/orders">Pending Orders</SectionTitle>
              <Card>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:A.navy }}>
                      {['Room','Items','Total','Status'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'0.7rem 1rem', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.14em', textTransform:'uppercase', color:A.gold, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4}><Spinner /></td></tr>
                    ) : !data?.recent.orders.length ? (
                      <tr><td colSpan={4} style={{ textAlign:'center', padding:'2rem', fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>No pending orders</td></tr>
                    ) : data.recent.orders.map((o: any) => (
                      <tr key={o._id} className="trow">
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy }}>
                          Room {o.room?.roomNumber || '—'}
                        </td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}`, fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted }}>{o.items?.length ?? 0} item(s)</td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}`, fontFamily:A.cinzel, fontSize:'0.85rem', color:A.gold }}>${o.totalAmount}</td>
                        <td style={{ padding:'0.7rem 1rem', borderBottom:`1px solid ${A.borderLight}` }}><StatusPill status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

        </div>

        {/* Bottom Stats */}
        {(scope.showFood || scope.showSpa) && (
          <div style={{ display:'grid', gridTemplateColumns: scope.showFood && scope.showSpa ? '1fr 1fr' : '1fr', gap:'1.5rem', marginTop:'1.5rem' }}>

            {/* Order Stats — food + super_admin */}
            {scope.showFood && (
              <div className="chart-card">
                <SectionTitle href="/admin/orders">Order Summary</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
                  {[
                    { label:'Total',     value: data?.orderStats.total ?? '—',                                              color: A.navy,  show: true },
                    { label:'Delivered', value: data?.orderStats.delivered ?? '—',                                          color: A.green, show: true },
                    { label:'Pending',   value: data?.orderStats.pending ?? '—',                                            color: A.amber, show: true },
                    { label:'Revenue',   value: data ? `$${data.orderStats.totalRevenue.toLocaleString()}` : '—',           color: A.gold,  show: data?.isSuperAdmin ?? false },
                  ].filter(s => s.show).map(s => (
                    <div key={s.label} style={{ textAlign:'center', padding:'1rem', background:A.papyrus }}>
                      <div style={{ fontFamily:A.cinzel, fontSize:'1.4rem', fontWeight:700, color:s.color, lineHeight:1, marginBottom:'0.4rem' }}>
                        {loading ? '—' : s.value}
                      </div>
                      <div style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spa Stats — spa + super_admin */}
            {scope.showSpa && (
              <div className="chart-card">
                <SectionTitle href="/admin/spa">Spa Summary</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
                  {[
                    { label:'Total',     value: data?.spaStats.total ?? '—',                                      color: A.navy,  show: true },
                    { label:'Confirmed', value: data?.spaStats.confirmed ?? '—',                                  color: A.blue,  show: true },
                    { label:'Completed', value: data?.spaStats.completed ?? '—',                                  color: A.green, show: true },
                    { label:'Revenue',   value: data ? `$${data.spaStats.revenue.toLocaleString()}` : '—',        color: A.gold,  show: data?.isSuperAdmin ?? false },
                  ].filter(s => s.show).map(s => (
                    <div key={s.label} style={{ textAlign:'center', padding:'1rem', background:A.papyrus }}>
                      <div style={{ fontFamily:A.cinzel, fontSize:'1.4rem', fontWeight:700, color:s.color, lineHeight:1, marginBottom:'0.4rem' }}>
                        {loading ? '—' : s.value}
                      </div>
                      <div style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}
