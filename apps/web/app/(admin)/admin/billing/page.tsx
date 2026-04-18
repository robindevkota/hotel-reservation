'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { X, Plus, DollarSign } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, GoldBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

export default function AdminBillingPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [chargeForm, setChargeForm] = useState({ description: '', amount: '' });
  const [paying, setPaying] = useState(false);

  const fetchData = async () => {
    try {
      const [inHouse, checkedOut] = await Promise.all([
        api.get('/reservations?status=checked_in&limit=200'),
        api.get('/reservations?status=checked_out&limit=200'),
      ]);
      const all = [
        ...(inHouse.data.reservations || []),
        ...(checkedOut.data.reservations || []),
      ];
      // Sort: checked_in first (open bills), then checked_out (awaiting payment)
      all.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'checked_in' ? -1 : 1;
      });
      setReservations(all);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const viewBill = async (reservationId: string) => {
    try {
      const { data } = await api.get(`/billing/reservation/${reservationId}`);
      setSelectedBill(data.bill);
      setSelectedGuestId(data.guestId);
    } catch(e: any) {
      toast.error(e.response?.data?.message || 'No bill found for this reservation');
    }
  };

  const addCharge = async () => {
    if (!chargeForm.description || !chargeForm.amount) { toast.error('Fill all fields'); return; }
    try {
      await api.post(`/billing/${selectedGuestId}/add`, { description: chargeForm.description, amount: Number(chargeForm.amount) });
      toast.success('Charge added');
      setChargeForm({ description: '', amount: '' });
      const { data } = await api.get(`/billing/${selectedGuestId}`);
      setSelectedBill(data.bill);
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const markCash = async (billId: string) => {
    setPaying(true);
    try {
      await api.post('/payment/cash', { billId });
      toast.success('Marked as cash payment');
      setSelectedBill(null);
      fetchData();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setPaying(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: `1px solid ${A.border}`, outline: 'none',
    fontFamily: A.raleway, fontSize: '0.82rem', color: A.navy,
    background: '#fff', boxSizing: 'border-box',
  };

  return (
    <>
      <style>{adminTableCss + `
        .bill-input:focus{border-color:hsl(43 72% 55%)!important;}
        .line-item:last-child{border-bottom:none!important;}
      `}</style>
      <div style={{ padding: '2rem', maxWidth: '1280px' }}>
        <PageHeader eyebrow="Billing" title="Guest Bills" />

        <AdminTable headers={['Guest','Room','Check-Out','Stay Status','Actions']} minWidth={620}>
          {loading ? <Spinner />
          : reservations.length === 0 ? <EmptyRow colSpan={5} message="No bills found" />
          : reservations.map((r:any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
              </AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{r.room?.name || '—'}</AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd><StatusPill status={r.status} /></AdminTd>
              <AdminTd><ActionBtn variant="view" onClick={() => viewBill(r._id)}>View Bill</ActionBtn></AdminTd>
            </AdminRow>
          ))}
        </AdminTable>
      </div>

      {/* Bill Modal */}
      {selectedBill && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.65)', backdropFilter:'blur(6px)' }} onClick={() => setSelectedBill(null)} />
          <div style={{ position:'relative', width:'100%', maxWidth:'30rem', background:'#fff', border:`1px solid ${A.border}`, boxShadow:'0 25px 60px hsl(220 55% 8%/0.35)', maxHeight:'90vh', overflowY:'auto' }}>
            {/* Modal header */}
            <div style={{ background:A.navy, padding:'1.25rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.8rem', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:'0.2rem' }}>Guest Bill</p>
                <h3 style={{ fontFamily:A.cinzel, fontSize:'1.1rem', color:'rgba(245,236,215,0.9)' }}>{selectedBill.guest?.name}</h3>
              </div>
              <button onClick={() => setSelectedBill(null)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.45)', cursor:'pointer', padding:'0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding:'1.5rem' }}>
              {/* Status */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <span style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.muted }}>Bill Status</span>
                <StatusPill status={selectedBill.status} />
              </div>

              {/* Pre-paid room section (non-refundable guests only) */}
              {selectedBill.prepaidAmount > 0 && (
                <div style={{ background:'hsl(142 50% 97%)', border:`1px solid hsl(142 50% 80%)`, marginBottom:'1rem', overflow:'hidden' }}>
                  <div style={{ background:'hsl(142 45% 30%)', padding:'0.5rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'#fff' }}>✓ Settled at Booking</span>
                  </div>
                  {selectedBill.lineItems?.filter((i:any) => i.type === 'room').map((item:any, idx:number) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 1rem' }}>
                      <div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:'hsl(142 40% 30%)' }}>{item.description}</div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.68rem', color:'hsl(142 30% 50%)' }}>Non-refundable — paid at booking</div>
                      </div>
                      <span style={{ fontFamily:A.cinzel, fontSize:'0.85rem', color:'hsl(142 40% 30%)', whiteSpace:'nowrap', marginLeft:'1rem' }}>${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* In-stay charges (food / spa / other — always due at checkout) */}
              <div style={{ background:A.papyrus, border:`1px solid ${A.border}`, marginBottom:'1.25rem' }}>
                {selectedBill.prepaidAmount > 0 && (
                  <div style={{ background:A.navy, padding:'0.5rem 1rem' }}>
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.gold }}>Charges Due at Checkout</span>
                  </div>
                )}
                {selectedBill.lineItems?.filter((i:any) => selectedBill.prepaidAmount > 0 ? i.type !== 'room' : true).length === 0
                  ? <div style={{ padding:'0.75rem 1rem', fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted }}>No additional charges</div>
                  : selectedBill.lineItems?.filter((i:any) => selectedBill.prepaidAmount > 0 ? i.type !== 'room' : true).map((item:any, i:number, arr:any[]) => (
                    <div key={i} className="line-item" style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 1rem', borderBottom: i < arr.length - 1 ? `1px solid ${A.border}` : 'none' }}>
                      <div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.navy }}>{item.description}</div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.68rem', color:A.muted, textTransform:'capitalize' }}>{item.type.replace('_',' ')}</div>
                      </div>
                      <span style={{ fontFamily:A.cinzel, fontSize:'0.85rem', color:A.navy, whiteSpace:'nowrap', marginLeft:'1rem' }}>${item.amount.toFixed(2)}</span>
                    </div>
                  ))
                }
              </div>

              {/* Totals */}
              <div style={{ borderTop:`2px solid ${A.border}`, paddingTop:'1rem', marginBottom:'1.5rem' }}>
                {[
                  ['Subtotal', `$${selectedBill.totalAmount?.toFixed(2)}`],
                  ['Tax (13%)', `$${selectedBill.taxAmount?.toFixed(2)}`],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem' }}>
                    <span style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.muted }}>{k}</span>
                    <span style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy }}>{v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:`1px solid ${A.border}` }}>
                  <span style={{ fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>
                    {selectedBill.prepaidAmount > 0 ? 'Amount Due' : 'Grand Total'}
                  </span>
                  <span style={{ fontFamily:A.cinzel, fontSize:'1.5rem', fontWeight:700, color:A.gold }}>${selectedBill.grandTotal?.toFixed(2)}</span>
                </div>
              </div>

              {/* Add charge */}
              {selectedBill.status === 'open' && (
                <div style={{ borderTop:`1px solid ${A.border}`, paddingTop:'1.25rem', marginBottom:'1.25rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.875rem' }}>
                    <Plus size={13} color={A.gold} strokeWidth={2} />
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>Add Charge to Bill</span>
                  </div>
                  {/* Quick-fill presets */}
                  <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginBottom:'0.625rem' }}>
                    {[
                      { label: 'Restaurant Dining', desc: 'Restaurant dining charge' },
                      { label: 'Minibar', desc: 'Minibar consumption' },
                      { label: 'Laundry', desc: 'Laundry service' },
                      { label: 'Other', desc: '' },
                    ].map(({ label, desc }) => (
                      <button key={label} onClick={() => setChargeForm(f => ({ ...f, description: desc }))}
                        style={{ fontFamily:A.cinzel, fontSize:'0.55rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.25rem 0.6rem', border:`1px solid ${A.border}`, background: chargeForm.description === desc && desc ? `${A.gold}18` : A.papyrus, color:A.navy, cursor:'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'0.625rem' }}>
                    <input className="bill-input" style={inputStyle} placeholder="Description" value={chargeForm.description} onChange={e => setChargeForm({...chargeForm, description:e.target.value})} />
                    <input className="bill-input" style={{...inputStyle, width:'6rem'}} type="number" placeholder="$0" value={chargeForm.amount} onChange={e => setChargeForm({...chargeForm, amount:e.target.value})} />
                  </div>
                  <button onClick={() => addCharge()} style={{ marginTop:'0.625rem', display:'flex', alignItems:'center', gap:'0.4rem', color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.4rem 1rem', cursor:'pointer' }}>
                    <DollarSign size={11} strokeWidth={2} /> Add Charge
                  </button>
                </div>
              )}

              {/* Pay button */}
              {selectedBill.status === 'pending_payment' && (
                <GoldBtn onClick={() => markCash(selectedBill._id)} disabled={paying}>
                  {paying ? 'Processing...' : 'Mark as Cash Payment'}
                </GoldBtn>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
