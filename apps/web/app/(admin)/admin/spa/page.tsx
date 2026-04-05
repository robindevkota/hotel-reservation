'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

export default function AdminSpaPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    api.get('/spa/bookings')
      .then(({ data }) => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try { await api.patch(`/spa/bookings/${id}/status`, { status }); toast.success(`Booking ${status}`); fetchData(); }
    catch(e:any){ toast.error(e.response?.data?.message || 'Failed'); }
  };

  const pending   = bookings.filter(b => b.status === 'pending');
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const done      = bookings.filter(b => ['completed','cancelled'].includes(b.status));

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Manage" title="Spa Schedule" />
          <div style={{ display:'flex', gap:'1rem' }}>
            {[{ label:'Pending', count: pending.length, color:'hsl(38 80% 45%)' },
              { label:'Confirmed', count: confirmed.length, color:'hsl(142 50% 40%)' }].map(s => (
              <div key={s.label} style={{ background:'#fff', border:`1px solid ${A.border}`, padding:'0.625rem 1.25rem', textAlign:'center' }}>
                <div style={{ fontFamily:A.cinzel, fontSize:'1.25rem', fontWeight:700, color:s.color }}>{s.count}</div>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <AdminTable headers={['Guest','Service','Date','Time','Duration','Price','Status','Actions']} minWidth={850}>
          {loading ? <Spinner />
          : bookings.length === 0 ? <EmptyRow colSpan={8} message="No spa bookings" />
          : bookings.map((b:any) => (
            <AdminRow key={b._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{b.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{b.guest?.email}</div>
              </AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.navy }}>{b.service?.name}</AdminTd>
              <AdminTd>{new Date(b.date).toLocaleDateString()}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.72rem' }}>{b.startTime} – {b.endTime}</AdminTd>
              <AdminTd>{b.service?.duration} min</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${b.price}</AdminTd>
              <AdminTd><StatusPill status={b.status} /></AdminTd>
              <AdminTd>
                <div style={{ display:'flex', gap:'0.4rem' }}>
                  {b.status === 'pending'   && <ActionBtn variant="confirm"  onClick={()=>updateStatus(b._id,'confirmed')}>Confirm</ActionBtn>}
                  {b.status === 'confirmed' && <ActionBtn variant="complete" onClick={()=>updateStatus(b._id,'completed')}>Complete</ActionBtn>}
                  {['pending','confirmed'].includes(b.status) && <ActionBtn variant="cancel" onClick={()=>updateStatus(b._id,'cancelled')}>Cancel</ActionBtn>}
                </div>
              </AdminTd>
            </AdminRow>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
