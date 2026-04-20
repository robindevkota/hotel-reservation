'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { X, Plus, DollarSign, Search, Printer } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, GoldBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

export default function AdminBillingPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
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
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const q = search.trim().toLowerCase();
  const filtered = reservations.filter(r => {
    const matchSearch = !q ||
      r.guest?.name?.toLowerCase().includes(q) ||
      r.guest?.email?.toLowerCase().includes(q) ||
      r.bookingRef?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const printBill = () => {
    if (!selectedBill) return;
    const b = selectedBill;
    const allItems = b.lineItems || [];
    const prepaid = b.prepaidAmount > 0;
    const chargeItems = prepaid ? allItems.filter((i:any) => i.type !== 'room') : allItems;
    const prepaidItems = prepaid ? allItems.filter((i:any) => i.type === 'room') : [];

    const rows = (items: any[]) => items.map((i:any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e8dcc8;">${i.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8dcc8;text-transform:capitalize;color:#888;">${i.type.replace('_',' ')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8dcc8;text-align:right;font-weight:600;">$${i.amount.toFixed(2)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Bill — ${b.guest?.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Georgia,serif;background:#F5ECD7;color:#0D1B3E;padding:40px;}
        .header{text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #C9A84C;}
        .logo{font-size:24px;letter-spacing:6px;font-weight:bold;color:#C9A84C;}
        .sub{font-size:11px;letter-spacing:3px;color:#888;margin-top:4px;}
        .guest-row{display:flex;justify-content:space-between;margin-bottom:24px;background:#fff;padding:16px 20px;border:1px solid #e8dcc8;}
        .label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9a8a6a;margin-bottom:4px;}
        .value{font-size:14px;color:#0D1B3E;}
        table{width:100%;border-collapse:collapse;margin-bottom:24px;background:#fff;}
        thead tr{background:#0D1B3E;color:#C9A84C;}
        thead td{padding:10px 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;}
        .totals{background:#fff;padding:16px 20px;border:1px solid #e8dcc8;margin-bottom:24px;}
        .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#555;border-bottom:1px solid #f0e8d8;}
        .grand{display:flex;justify-content:space-between;padding-top:12px;margin-top:8px;border-top:2px solid #C9A84C;}
        .grand-label{font-size:12px;letter-spacing:2px;text-transform:uppercase;}
        .grand-value{font-size:22px;font-weight:bold;color:#C9A84C;}
        .status-badge{display:inline-block;padding:3px 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;border:1px solid;margin-left:8px;}
        .paid{color:#166534;border-color:#166534;background:#f0faf4;}
        .open{color:#92400e;border-color:#d97706;background:#fffbeb;}
        .pending{color:#1e40af;border-color:#3b82f6;background:#eff6ff;}
        .footer{text-align:center;font-size:11px;color:#9a8a6a;margin-top:32px;padding-top:16px;border-top:1px solid #e8dcc8;}
        @media print{body{padding:20px;}button{display:none!important;}}
      </style></head><body>
      <div class="header">
        <div class="logo">ROYAL SUITES</div>
        <div class="sub">LUXURY HOTEL &amp; SPA</div>
      </div>
      <div class="guest-row">
        <div><div class="label">Guest</div><div class="value" style="font-size:16px;font-weight:bold;">${b.guest?.name || '—'}</div></div>
        <div><div class="label">Bill Status</div><div class="value"><span class="status-badge ${b.status === 'paid' ? 'paid' : b.status === 'pending_payment' ? 'pending' : 'open'}">${b.status.replace('_',' ')}</span></div></div>
        <div><div class="label">Date</div><div class="value">${new Date().toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric'})}</div></div>
      </div>
      ${prepaid ? `
      <div style="background:#f0faf4;border:1px solid #bbf0d0;padding:10px 16px;margin-bottom:8px;font-size:12px;color:#166534;">
        ✓ &nbsp;Room charge settled at booking (non-refundable rate)
      </div>
      <table><thead><tr><td>Description</td><td>Type</td><td style="text-align:right;">Amount</td></tr></thead>
        <tbody>${rows(prepaidItems)}</tbody></table>
      <div style="margin-bottom:16px;padding:10px 12px;background:#0D1B3E;color:#C9A84C;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Charges Due at Checkout</div>` : ''}
      <table><thead><tr><td>Description</td><td>Type</td><td style="text-align:right;">Amount</td></tr></thead>
        <tbody>${rows(chargeItems)}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>$${b.totalAmount?.toFixed(2)}</span></div>
        <div class="total-row"><span>Tax (13%)</span><span>$${b.taxAmount?.toFixed(2)}</span></div>
        <div class="grand">
          <span class="grand-label">${prepaid ? 'Amount Due' : 'Grand Total'}</span>
          <span class="grand-value">$${b.grandTotal?.toFixed(2)}</span>
        </div>
      </div>
      <div class="footer">Royal Suites · Thank you for your stay · noreply@royalsuitesnp.com</div>
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (w) { w.document.write(html); w.document.close(); }
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <PageHeader eyebrow="Billing" title="Guest Bills" />
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem' }}>
              <Search size={14} color={A.gold} strokeWidth={1.8} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, email or booking ref…"
                style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.navy, background:'transparent', border:'none', outline:'none', width:'220px' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:'0', display:'flex', alignItems:'center', color:A.muted }}>
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding:'0.5rem 0.75rem', border:`1px solid ${A.border}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, background:'#fff', outline:'none', cursor:'pointer' }}
            >
              <option value="">All statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
            </select>
            {(search || statusFilter) && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); }} style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.08em', color:A.muted, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <AdminTable headers={['Guest','Room','Check-Out','Stay Status','Actions']} minWidth={620}>
          {loading ? <Spinner />
          : paginated.length === 0 ? <EmptyRow colSpan={5} message="No bills found" />
          : paginated.map((r:any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
                <div style={{ fontSize:'0.75rem', color:A.gold, marginTop:'0.1rem', letterSpacing:'0.05em' }}>{r.bookingRef}</div>
              </AdminTd>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.room?.name || '—'}</div>
                {(r.room?.floorNumber || r.room?.roomNumber) && (
                  <div style={{ fontSize:'0.7rem', color:A.muted }}>
                    {r.room?.floorNumber ? `Floor ${r.room.floorNumber}` : ''}
                    {r.room?.floorNumber && r.room?.roomNumber ? ' · ' : ''}
                    {r.room?.roomNumber ? `Room ${r.room.roomNumber}` : ''}
                  </div>
                )}
              </AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd><StatusPill status={r.status} /></AdminTd>
              <AdminTd><ActionBtn variant="view" onClick={() => viewBill(r._id)}>View Bill</ActionBtn></AdminTd>
            </AdminRow>
          ))}
        </AdminTable>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1.25rem', paddingTop:'1rem', borderTop:`1px solid ${A.border}` }}>
            <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', color:A.muted }}>
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display:'flex', gap:'0.35rem' }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.875rem', border:`1px solid ${A.border}`, background:'#fff', color: page===1 ? A.muted : A.navy, cursor: page===1 ? 'default' : 'pointer', opacity: page===1 ? 0.45 : 1 }}>
                Prev
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.7rem', border:`1px solid ${n===page ? A.gold : A.border}`, background: n===page ? A.gold : '#fff', color: n===page ? '#fff' : A.navy, cursor:'pointer', fontWeight: n===page ? 700 : 400 }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.08em', padding:'0.4rem 0.875rem', border:`1px solid ${A.border}`, background:'#fff', color: page===totalPages ? A.muted : A.navy, cursor: page===totalPages ? 'default' : 'pointer', opacity: page===totalPages ? 0.45 : 1 }}>
                Next
              </button>
            </div>
          </div>
        )}
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
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <button onClick={printBill} title="Print Bill"
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'transparent', border:`1px solid ${A.gold}`, color:A.gold, fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.4rem 0.875rem', cursor:'pointer' }}>
                  <Printer size={13} strokeWidth={1.8} /> Print
                </button>
                <button onClick={() => setSelectedBill(null)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.45)', cursor:'pointer', padding:'0.25rem' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding:'1.5rem' }}>
              {/* Status */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.muted }}>Bill Status</span>
                <StatusPill status={selectedBill.status} />
              </div>

              {/* Pre-paid room section (non-refundable guests only) */}
              {selectedBill.prepaidAmount > 0 && (
                <div style={{ background:'hsl(142 50% 97%)', border:`1px solid hsl(142 50% 80%)`, marginBottom:'1rem', overflow:'hidden' }}>
                  <div style={{ background:'hsl(142 45% 30%)', padding:'0.5rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'#fff' }}>✓ Settled at Booking</span>
                  </div>
                  {selectedBill.lineItems?.filter((i:any) => i.type === 'room').map((item:any, idx:number) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 1rem' }}>
                      <div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:'hsl(142 40% 30%)' }}>{item.description}</div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:'hsl(142 30% 50%)' }}>Non-refundable — paid at booking</div>
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
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.gold }}>Charges Due at Checkout</span>
                  </div>
                )}
                {selectedBill.lineItems?.filter((i:any) => selectedBill.prepaidAmount > 0 ? i.type !== 'room' : true).length === 0
                  ? <div style={{ padding:'0.75rem 1rem', fontFamily:A.cinzel, fontSize:'0.7rem', color:A.muted }}>No additional charges</div>
                  : selectedBill.lineItems?.filter((i:any) => selectedBill.prepaidAmount > 0 ? i.type !== 'room' : true).map((item:any, i:number, arr:any[]) => (
                    <div key={i} className="line-item" style={{ display:'flex', justifyContent:'space-between', padding:'0.75rem 1rem', borderBottom: i < arr.length - 1 ? `1px solid ${A.border}` : 'none' }}>
                      <div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.navy }}>{item.description}</div>
                        <div style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted, textTransform:'capitalize' }}>{item.type.replace('_',' ')}</div>
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
                  <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>
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
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>Add Charge to Bill</span>
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
                        style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.25rem 0.6rem', border:`1px solid ${A.border}`, background: chargeForm.description === desc && desc ? `${A.gold}18` : A.papyrus, color:A.navy, cursor:'pointer' }}>
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
