'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useKitchenSocket } from '../../../../hooks/useSocket';
import toast from 'react-hot-toast';
import { ChefHat, ArrowRight, Plus, X, Banknote, FileText, UserPlus } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, adminTableCss } from '../../_adminStyles';

const TRANSITIONS: Record<string,string> = { pending:'accepted', accepted:'preparing', preparing:'ready', ready:'delivering', delivering:'delivered' };
const NEXT_LABEL: Record<string,string>  = { pending:'Accept', accepted:'Start Cooking', preparing:'Mark Ready', ready:'Send Out', delivering:'Delivered' };
const STATUS_ORDER = ['pending','accepted','preparing','ready','delivering'];

interface ActiveGuest { _id: string; name: string; room: { _id: string; roomNumber: string } }
interface MenuItemOption { _id: string; name: string; price: number; category?: string }
interface OrderLine { menuItem: string; name: string; price: number; quantity: number; specialInstructions: string }

// Who is the order for?
type CustomerMode = 'hotel_guest' | 'walk_in';

export default function KitchenOrdersPage() {
  const { orders, setOrders, updateOrderStatus } = useOrderStore();
  useKitchenSocket();
  const [cancelTarget, setCancelTarget] = useState<string|null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // New order modal
  const [showNew, setShowNew]           = useState(false);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);
  const [menuItems, setMenuItems]       = useState<MenuItemOption[]>([]);
  const [loadingData, setLoadingData]   = useState(false);
  const [customerMode, setCustomerMode] = useState<CustomerMode>('hotel_guest');
  const [guestId, setGuestId]           = useState('');
  // Walk-in fields
  const [walkInName, setWalkInName]     = useState('');
  const [walkInPhone, setWalkInPhone]   = useState('');
  const [walkInId, setWalkInId]         = useState(''); // created ID
  const [lines, setLines]               = useState<OrderLine[]>([]);
  const [notes, setNotes]               = useState('');
  const [payMethod, setPayMethod]       = useState<'room_bill'|'cash'>('room_bill');
  const [submitting, setSubmitting]     = useState(false);
  const [menuSearch, setMenuSearch]     = useState('');
  const [menuOpen, setMenuOpen]         = useState(false);

  useEffect(() => { api.get('/orders').then(({ data }) => setOrders(data.orders || [])); }, [setOrders]);

  const openNew = async () => {
    setShowNew(true);
    setCustomerMode('hotel_guest');
    setGuestId(''); setWalkInName(''); setWalkInPhone(''); setWalkInId('');
    setLines([]); setNotes(''); setPayMethod('room_bill');
    setMenuSearch(''); setMenuOpen(false);
    setLoadingData(true);
    try {
      const [gRes, mRes] = await Promise.all([
        api.get('/checkin/active'),
        api.get('/menu'),
      ]);
      setActiveGuests(gRes.data.guests || []);
      setMenuItems((mRes.data.items || []).filter((m: any) => m.isAvailable));
    } catch { toast.error('Failed to load data'); }
    finally { setLoadingData(false); }
  };

  const addLine = (itemId: string) => {
    const item = menuItems.find(m => m._id === itemId);
    if (!item) return;
    setLines(prev => {
      const existing = prev.find(l => l.menuItem === itemId);
      if (existing) return prev.map(l => l.menuItem === itemId ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { menuItem: item._id, name: item.name, price: item.price, quantity: 1, specialInstructions: '' }];
    });
  };
  const updateLine = (idx: number, field: keyof OrderLine, value: any) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const removeLine = (idx: number) => setLines(prev => prev.filter((_,i) => i !== idx));
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  // For walk-in: create the customer record first, then place the order
  const submitOrder = async () => {
    if (lines.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      let resolvedWalkInId = walkInId;

      if (customerMode === 'walk_in') {
        if (!walkInName.trim()) { toast.error('Enter walk-in customer name'); setSubmitting(false); return; }
        // Create walk-in customer record if not yet created
        if (!resolvedWalkInId) {
          const { data: wicData } = await api.post('/walkin-customers', {
            name: walkInName.trim(),
            phone: walkInPhone.trim() || undefined,
            type: 'dine_in',
          });
          if (!wicData.success) { toast.error('Failed to register walk-in customer'); setSubmitting(false); return; }
          resolvedWalkInId = wicData.customer._id;
          setWalkInId(resolvedWalkInId);
        }
        const { data } = await api.post('/orders/admin', {
          walkInCustomerId: resolvedWalkInId,
          items: lines.map(l => ({ menuItem: l.menuItem, quantity: l.quantity, specialInstructions: l.specialInstructions })),
          notes,
          orderPaymentMethod: 'cash', // walk-ins always cash
        });
        setOrders([data.order, ...orders]);
        toast.success('Walk-in order created — cash at desk');
      } else {
        if (!guestId) { toast.error('Select a hotel guest'); setSubmitting(false); return; }
        const { data } = await api.post('/orders/admin', {
          guestId,
          items: lines.map(l => ({ menuItem: l.menuItem, quantity: l.quantity, specialInstructions: l.specialInstructions })),
          notes,
          orderPaymentMethod: payMethod,
        });
        setOrders([data.order, ...orders]);
        toast.success('Order created');
      }
      setShowNew(false);
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const advance = async (id: string, cur: string) => {
    const next = TRANSITIONS[cur]; if (!next) return;
    try { await api.patch(`/orders/${id}/status`, { status: next }); updateOrderStatus(id, next); toast.success(`Order ${next}`); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
  };
  const cancel = async () => {
    if (!cancelTarget) return;
    try { await api.patch(`/orders/${cancelTarget}/cancel`, { reason: cancelReason || 'Cancelled by staff' }); updateOrderStatus(cancelTarget,'cancelled'); toast.success('Cancelled'); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
    finally { setCancelTarget(null); setCancelReason(''); }
  };

  const active = orders.filter(o => STATUS_ORDER.includes(o.status));
  const done   = orders.filter(o => ['delivered','cancelled'].includes(o.status));

  const canSubmit = !submitting && lines.length > 0 &&
    (customerMode === 'hotel_guest' ? !!guestId : !!walkInName.trim());

  return (
    <>
      <style>{adminTableCss + `
        .ord-card{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:box-shadow 0.3s;}
        .ord-card:hover{box-shadow:0 4px 20px -4px hsl(220 55% 18%/0.12);}
        .adv-btn{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.35rem 0.875rem;border:none;cursor:pointer;font-weight:700;transition:opacity 0.2s;display:flex;align-items:center;gap:0.3rem;}
        .adv-btn:hover{opacity:0.88;}
        .new-ord-btn{background:linear-gradient(135deg,hsl(220 55% 22%),hsl(220 55% 30%));color:${A.gold};font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;padding:0.6rem 1.25rem;border:none;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:0.4rem;transition:opacity 0.2s;}
        .new-ord-btn:hover{opacity:0.88;}
        .pay-toggle{display:flex;border:1px solid ${A.border};overflow:hidden;}
        .pay-toggle button{flex:1;padding:0.55rem 1rem;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;transition:background 0.2s,color 0.2s;}
        .pay-toggle .active-bill{background:hsl(220 55% 18%);color:${A.gold};}
        .pay-toggle .active-cash{background:hsl(142 45% 35%);color:#fff;}
        .pay-toggle .inactive{background:#fff;color:${A.muted};}
        .cust-toggle{display:flex;border:1px solid ${A.border};overflow:hidden;margin-bottom:1.25rem;}
        .cust-toggle button{flex:1;padding:0.55rem 1rem;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;transition:background 0.2s,color 0.2s;}
        .cust-toggle .active-hotel{background:hsl(220 55% 18%);color:${A.gold};}
        .cust-toggle .active-walkin{background:hsl(270 45% 40%);color:#fff;}
        .cust-toggle .inactive{background:#fff;color:${A.muted};}
        .pay-badge-bill{display:inline-flex;align-items:center;gap:0.25rem;background:hsl(220 55% 92%);color:hsl(220 55% 28%);font-family:'Cinzel',serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.5rem;}
        .pay-badge-cash{display:inline-flex;align-items:center;gap:0.25rem;background:hsl(142 40% 90%);color:hsl(142 45% 28%);font-family:'Cinzel',serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.5rem;}
        .walkin-badge{display:inline-flex;align-items:center;gap:0.25rem;background:hsl(270 40% 92%);color:hsl(270 45% 35%);font-family:'Cinzel',serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.5rem;}
      `}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Live Board" title="Kitchen Orders" />
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <button className="new-ord-btn" onClick={openNew}>
              <Plus size={12} strokeWidth={2.5} /> New Order
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.papyrus, padding:'0.75rem 1.25rem', border:`1px solid ${A.border}` }}>
              <div style={{ width:'0.6rem', height:'0.6rem', borderRadius:'50%', background:'hsl(142 50% 45%)', boxShadow:'0 0 0 3px hsl(142 60% 85%)', animation:'pulse 2s infinite' }} />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
              <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>Live via Socket</span>
            </div>
          </div>
        </div>

        {/* Active orders grid */}
        {active.length === 0 ? (
          <div style={{ textAlign:'center', padding:'4rem 2rem', background:'#fff', border:`1px solid ${A.border}`, marginBottom:'2rem' }}>
            <div style={{ display:'flex', justifyContent:'center', color:A.gold, marginBottom:'1rem' }}><ChefHat size={40} strokeWidth={1.2} /></div>
            <p style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.muted }}>No active orders</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1.25rem', marginBottom:'2.5rem' }}>
            {active.map((order:any) => (
              <div key={order._id} className="ord-card">
                <div style={{ background:A.navy, padding:'0.875rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.15rem', flexWrap:'wrap' }}>
                      {order.walkInCustomer ? (
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.gold }}>{order.walkInCustomer.name}</span>
                      ) : (
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.gold }}>Room {order.room?.roomNumber}</span>
                      )}
                      {order.walkInCustomer && <span className="walkin-badge"><UserPlus size={9}/> Walk-in</span>}
                      {order.isAdminOrder && !order.walkInCustomer && (
                        order.orderPaymentMethod === 'cash'
                          ? <span className="pay-badge-cash"><Banknote size={9}/> Cash</span>
                          : <span className="pay-badge-bill"><FileText size={9}/> Bill</span>
                      )}
                    </div>
                    <div style={{ fontFamily:A.raleway, fontSize:'0.68rem', color:'rgba(245,236,215,0.5)' }}>{new Date(order.placedAt).toLocaleTimeString()}</div>
                  </div>
                  <StatusPill status={order.status} />
                </div>
                <div style={{ padding:'1rem 1.25rem' }}>
                  <div style={{ marginBottom:'0.875rem' }}>
                    {order.items?.map((item:any,i:number) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'0.3rem 0', borderBottom:`1px solid ${A.border}` }}>
                        <span style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.navy }}>{item.quantity}× {item.menuItem?.name}</span>
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.gold }}>${(item.unitPrice*item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && <p style={{ fontFamily:A.cormo, fontStyle:'italic', fontSize:'0.82rem', color:A.muted, marginBottom:'0.875rem' }}>"{order.notes}"</p>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:A.cinzel, fontSize:'1.1rem', color:A.gold, fontWeight:700 }}>${order.totalAmount}</span>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      {TRANSITIONS[order.status] && (
                        <button className="adv-btn" onClick={()=>advance(order._id,order.status)}>
                          {NEXT_LABEL[order.status]} <ArrowRight size={10} strokeWidth={2.5} />
                        </button>
                      )}
                      {['pending','accepted'].includes(order.status) && (
                        <button onClick={()=>{ setCancelTarget(order._id); setCancelReason(''); }} style={{ color:'hsl(0 60% 42%)', border:'1px solid hsl(0 60% 75%)', background:'hsl(0 70% 97%)', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer' }}>Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed table */}
        {done.length > 0 && (
          <>
            <h2 style={{ fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.navy, marginBottom:'1rem' }}>Completed / Cancelled</h2>
            <AdminTable headers={['Order ID','Customer','Items','Total','Payment','Status','Time']} minWidth={700}>
              {done.map((o:any) => (
                <AdminRow key={o._id}>
                  <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>#{String(o._id).slice(-6).toUpperCase()}</AdminTd>
                  <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>
                    {o.walkInCustomer ? (
                      <span>{o.walkInCustomer.name} <span className="walkin-badge" style={{ marginLeft:'0.25rem' }}><UserPlus size={8}/> Walk-in</span></span>
                    ) : (
                      `Room ${o.room?.roomNumber}`
                    )}
                  </AdminTd>
                  <AdminTd>{o.items?.length}</AdminTd>
                  <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${o.totalAmount}</AdminTd>
                  <AdminTd>
                    {o.orderPaymentMethod === 'cash'
                      ? <span className="pay-badge-cash"><Banknote size={9}/> Cash</span>
                      : <span className="pay-badge-bill"><FileText size={9}/> Bill</span>}
                  </AdminTd>
                  <AdminTd><StatusPill status={o.status} /></AdminTd>
                  <AdminTd>{new Date(o.placedAt).toLocaleTimeString()}</AdminTd>
                </AdminRow>
              ))}
            </AdminTable>
          </>
        )}
      </div>

      {/* New Order Modal */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.75)', zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', overflowY:'auto' }}>
          <div style={{ background:'#fff', width:'100%', maxWidth:'560px', border:`1px solid ${A.border}`, marginTop:'1rem' }}>
            <div style={{ background:A.navy, padding:'1.25rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.gold, opacity:0.7, marginBottom:'0.2rem' }}>Kitchen</div>
                <h3 style={{ fontFamily:A.cinzel, fontSize:'0.9rem', color:A.gold, margin:0 }}>New Order</h3>
              </div>
              <button onClick={()=>setShowNew(false)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.5)', cursor:'pointer', padding:'0.25rem' }}><X size={18} /></button>
            </div>

            <div style={{ padding:'1.5rem' }}>
              {loadingData ? (
                <div style={{ textAlign:'center', padding:'2rem' }}><Spinner /></div>
              ) : (
                <>
                  {/* Customer type toggle */}
                  <div className="cust-toggle">
                    <button
                      className={customerMode === 'hotel_guest' ? 'active-hotel' : 'inactive'}
                      onClick={() => { setCustomerMode('hotel_guest'); setPayMethod('room_bill'); setWalkInId(''); }}
                    >
                      Hotel Guest
                    </button>
                    <button
                      className={customerMode === 'walk_in' ? 'active-walkin' : 'inactive'}
                      onClick={() => { setCustomerMode('walk_in'); setPayMethod('cash'); setGuestId(''); setWalkInId(''); }}
                    >
                      <UserPlus size={10} style={{ display:'inline', marginRight:'0.3rem' }} /> Walk-in (External)
                    </button>
                  </div>

                  {/* Hotel guest selector */}
                  {customerMode === 'hotel_guest' && (
                    <div style={{ marginBottom:'1.25rem' }}>
                      <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Guest (checked-in)</label>
                      <select
                        value={guestId}
                        onChange={e => setGuestId(e.target.value)}
                        style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color: guestId ? A.navy : A.muted, outline:'none', background:'#fff' }}
                      >
                        <option value="">— Select guest —</option>
                        {activeGuests.map(g => (
                          <option key={g._id} value={g._id}>{g.name} · Room {g.room?.roomNumber}</option>
                        ))}
                      </select>
                      {activeGuests.length === 0 && <p style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted, marginTop:'0.4rem' }}>No checked-in guests.</p>}
                    </div>
                  )}

                  {/* Walk-in customer fields */}
                  {customerMode === 'walk_in' && (
                    <div style={{ marginBottom:'1.25rem', padding:'1rem', background:A.papyrus, border:`1px solid ${A.border}` }}>
                      <p style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'hsl(270 45% 40%)', marginBottom:'0.75rem' }}>External Walk-in Customer — Cash Only</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                        <div>
                          <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.navy, marginBottom:'0.35rem' }}>Name *</label>
                          <input
                            type="text"
                            value={walkInName}
                            onChange={e => { setWalkInName(e.target.value); setWalkInId(''); }}
                            placeholder="e.g. John Smith"
                            style={{ width:'100%', padding:'0.5rem 0.6rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.navy, marginBottom:'0.35rem' }}>Phone (optional)</label>
                          <input
                            type="text"
                            value={walkInPhone}
                            onChange={e => { setWalkInPhone(e.target.value); setWalkInId(''); }}
                            placeholder="+1 555 000 0000"
                            style={{ width:'100%', padding:'0.5rem 0.6rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Menu item search */}
                  <div style={{ marginBottom:'1.25rem', position:'relative' }}>
                    <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Add Item</label>
                    <input
                      type="text"
                      placeholder="Search menu items…"
                      value={menuSearch}
                      onChange={e => { setMenuSearch(e.target.value); setMenuOpen(true); }}
                      onFocus={() => setMenuOpen(true)}
                      onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                      style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy, outline:'none', background:'#fff', boxSizing:'border-box' }}
                    />
                    {menuOpen && (() => {
                      const filtered = menuItems.filter(m =>
                        m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
                        (m.category ?? '').toLowerCase().includes(menuSearch.toLowerCase())
                      );
                      return filtered.length > 0 ? (
                        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:`1px solid ${A.border}`, borderTop:'none', zIndex:10, maxHeight:'200px', overflowY:'auto' }}>
                          {filtered.map(m => (
                            <div
                              key={m._id}
                              onMouseDown={() => { addLine(m._id); setMenuSearch(''); setMenuOpen(false); }}
                              style={{ padding:'0.5rem 0.75rem', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${A.border}` }}
                              onMouseEnter={e => (e.currentTarget.style.background = A.papyrus)}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                              <span style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy }}>{m.name}</span>
                              <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.gold }}>${m.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : menuSearch ? (
                        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:`1px solid ${A.border}`, borderTop:'none', zIndex:10, padding:'0.5rem 0.75rem' }}>
                          <span style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.muted }}>No items match "{menuSearch}"</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Order lines */}
                  {lines.length > 0 && (
                    <div style={{ marginBottom:'1.25rem', border:`1px solid ${A.border}` }}>
                      {lines.map((line, idx) => (
                        <div key={idx} style={{ padding:'0.75rem 1rem', borderBottom: idx < lines.length-1 ? `1px solid ${A.border}` : 'none' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
                            <span style={{ fontFamily:A.raleway, fontSize:'0.83rem', color:A.navy, fontWeight:600 }}>{line.name}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.gold }}>${(line.price * line.quantity).toFixed(2)}</span>
                              <div style={{ display:'flex', alignItems:'center', border:`1px solid ${A.border}` }}>
                                <button onClick={()=> line.quantity > 1 ? updateLine(idx,'quantity',line.quantity-1) : removeLine(idx)} style={{ width:'1.6rem', height:'1.6rem', border:'none', background:'#fff', cursor:'pointer', fontFamily:A.cinzel, fontSize:'0.8rem', color:A.navy, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                                <span style={{ padding:'0 0.5rem', fontFamily:A.cinzel, fontSize:'0.75rem', color:A.navy, minWidth:'1.5rem', textAlign:'center' }}>{line.quantity}</span>
                                <button onClick={()=>updateLine(idx,'quantity',line.quantity+1)} style={{ width:'1.6rem', height:'1.6rem', border:'none', background:'#fff', cursor:'pointer', fontFamily:A.cinzel, fontSize:'0.8rem', color:A.navy, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                              </div>
                              <button onClick={()=>removeLine(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:A.muted, padding:'0.1rem', display:'flex' }}><X size={13} /></button>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Special instructions (optional)"
                            value={line.specialInstructions}
                            onChange={e => updateLine(idx,'specialInstructions',e.target.value)}
                            style={{ width:'100%', padding:'0.35rem 0.5rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.75rem', color:A.navy, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                      ))}
                      <div style={{ padding:'0.75rem 1rem', background:A.papyrus, display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy }}>Total</span>
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.9rem', color:A.gold, fontWeight:700 }}>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div style={{ marginBottom:'1.25rem' }}>
                    <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Order Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Allergies, preferences..."
                      style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy, resize:'none', boxSizing:'border-box', outline:'none' }}
                    />
                  </div>

                  {/* Payment method — only for hotel guests */}
                  {customerMode === 'hotel_guest' && (
                    <div style={{ marginBottom:'1.5rem' }}>
                      <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Payment Method</label>
                      <div className="pay-toggle">
                        <button className={payMethod === 'room_bill' ? 'active-bill' : 'inactive'} onClick={()=>setPayMethod('room_bill')}>
                          <FileText size={10} style={{ display:'inline', marginRight:'0.3rem' }} /> Charge to Room Bill
                        </button>
                        <button className={payMethod === 'cash' ? 'active-cash' : 'inactive'} onClick={()=>setPayMethod('cash')}>
                          <Banknote size={10} style={{ display:'inline', marginRight:'0.3rem' }} /> Cash at Desk
                        </button>
                      </div>
                      <p style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted, marginTop:'0.4rem' }}>
                        {payMethod === 'room_bill' ? 'Added to guest bill automatically when order is delivered.' : 'Cash collected at point of service — will not appear on guest bill.'}
                      </p>
                    </div>
                  )}
                  {customerMode === 'walk_in' && (
                    <div style={{ marginBottom:'1.5rem', padding:'0.625rem 0.875rem', background:'hsl(142 40% 95%)', border:'1px solid hsl(142 40% 80%)' }}>
                      <p style={{ fontFamily:A.raleway, fontSize:'0.78rem', color:'hsl(142 45% 28%)', margin:0 }}>
                        <Banknote size={12} style={{ display:'inline', marginRight:'0.3rem', verticalAlign:'middle' }} />
                        Walk-in orders are always <strong>cash at desk</strong> — collected when delivered.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'0.75rem' }}>
                    <button onClick={()=>setShowNew(false)} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Cancel</button>
                    <button
                      onClick={submitOrder}
                      disabled={!canSubmit}
                      style={{ flex:2, background: !canSubmit ? A.muted : 'linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%))', color:A.navy, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor: !canSubmit ? 'not-allowed' : 'pointer', fontWeight:700 }}
                    >
                      {submitting ? 'Placing…' : `Place Order · $${total.toFixed(2)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div style={{ position:'fixed', inset:0, background:'hsl(220 55% 18% / 0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', maxWidth:'420px', width:'100%', padding:'2rem', border:`1px solid ${A.border}` }}>
            <h3 style={{ fontFamily:A.cinzel, fontSize:'0.8rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'1.25rem' }}>Cancel Order</h3>
            <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy, marginBottom:'0.5rem' }}>Reason (optional)</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Guest request, item unavailable..."
              style={{ width:'100%', padding:'0.625rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy, resize:'none', boxSizing:'border-box', outline:'none', marginBottom:'1.25rem' }}
            />
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={()=>{ setCancelTarget(null); setCancelReason(''); }} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Keep Order</button>
              <button onClick={cancel} style={{ flex:1, background:'hsl(0 60% 48%)', color:'#fff', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:600 }}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
