'use client';
import React, { useEffect } from 'react';
import api from '../../../../lib/api';
import { useOrderStore } from '../../../../store/orderStore';
import { useKitchenSocket } from '../../../../hooks/useSocket';
import toast from 'react-hot-toast';
import { ChefHat, ArrowRight } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

const TRANSITIONS: Record<string,string> = { pending:'accepted', accepted:'preparing', preparing:'ready', ready:'delivering', delivering:'delivered' };
const NEXT_LABEL: Record<string,string>  = { pending:'Accept', accepted:'Start Cooking', preparing:'Mark Ready', ready:'Send Out', delivering:'Delivered' };

const STATUS_ORDER = ['pending','accepted','preparing','ready','delivering'];

export default function KitchenOrdersPage() {
  const { orders, setOrders, updateOrderStatus } = useOrderStore();
  useKitchenSocket();

  useEffect(() => { api.get('/orders').then(({ data }) => setOrders(data.orders || [])); }, [setOrders]);

  const advance = async (id: string, cur: string) => {
    const next = TRANSITIONS[cur]; if (!next) return;
    try { await api.patch(`/orders/${id}/status`, { status: next }); updateOrderStatus(id, next); toast.success(`Order ${next}`); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
  };
  const cancel = async (id: string) => {
    if (!confirm('Cancel this order?')) return;
    try { await api.patch(`/orders/${id}/cancel`, { reason:'Cancelled by staff' }); updateOrderStatus(id,'cancelled'); toast.success('Cancelled'); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
  };

  const active = orders.filter(o => STATUS_ORDER.includes(o.status));
  const done   = orders.filter(o => ['delivered','cancelled'].includes(o.status));

  return (
    <>
      <style>{adminTableCss + `
        .ord-card{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:box-shadow 0.3s;}
        .ord-card:hover{box-shadow:0 4px 20px -4px hsl(220 55% 18%/0.12);}
        .adv-btn{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.35rem 0.875rem;border:none;cursor:pointer;font-weight:700;transition:opacity 0.2s;display:flex;align-items:center;gap:0.3rem;}
        .adv-btn:hover{opacity:0.88;}
      `}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Live Board" title="Kitchen Orders" />
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.papyrus, padding:'0.75rem 1.25rem', border:`1px solid ${A.border}` }}>
            <div style={{ width:'0.6rem', height:'0.6rem', borderRadius:'50%', background:'hsl(142 50% 45%)', boxShadow:'0 0 0 3px hsl(142 60% 85%)', animation:'pulse 2s infinite' }} />
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
            <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>Live via Socket</span>
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
                    <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.gold, marginBottom:'0.15rem' }}>Room {order.room?.roomNumber}</div>
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
                        <button onClick={()=>cancel(order._id)} style={{ color:'hsl(0 60% 42%)', border:'1px solid hsl(0 60% 75%)', background:'hsl(0 70% 97%)', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer' }}>Cancel</button>
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
            <AdminTable headers={['Order ID','Room','Items','Total','Status','Time']} minWidth={600}>
              {done.map((o:any) => (
                <AdminRow key={o._id}>
                  <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.72rem', color:A.muted }}>#{String(o._id).slice(-6).toUpperCase()}</AdminTd>
                  <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{o.room?.roomNumber}</AdminTd>
                  <AdminTd>{o.items?.length}</AdminTd>
                  <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${o.totalAmount}</AdminTd>
                  <AdminTd><StatusPill status={o.status} /></AdminTd>
                  <AdminTd>{new Date(o.placedAt).toLocaleTimeString()}</AdminTd>
                </AdminRow>
              ))}
            </AdminTable>
          </>
        )}
      </div>
    </>
  );
}
