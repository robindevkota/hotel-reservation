'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

export default function GuestsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string|null>(null);

  const fetchData = () => {
    api.get('/reservations?status=checked_in')
      .then(({ data }) => { setReservations(data.reservations || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckOut = async (id: string) => {
    if (!confirm('Initiate checkout for this guest?')) return;
    setCheckingOut(id);
    try {
      await api.post(`/checkin/checkout/${id}`);
      toast.success('Guest checked out — bill locked');
      fetchData();
    } catch(e:any) {
      toast.error(e.response?.data?.message || 'Checkout failed');
    } finally { setCheckingOut(null); }
  };

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Current Guests" title="In-House Guests" />
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.papyrus, padding:'0.75rem 1.25rem', border:`1px solid ${A.border}` }}>
            <div style={{ width:'0.6rem', height:'0.6rem', borderRadius:'50%', background:'hsl(142 50% 45%)', boxShadow:'0 0 0 3px hsl(142 60% 85%)' }} />
            <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy }}>{reservations.length} Checked In</span>
          </div>
        </div>

        <AdminTable headers={['Guest','Contact','Room','Check-In','Check-Out','Nights','Action']} minWidth={750}>
          {loading ? <Spinner />
          : reservations.length === 0 ? <EmptyRow colSpan={7} message="No guests currently checked in" />
          : reservations.map((r:any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
              </AdminTd>
              <AdminTd style={{ fontSize:'0.75rem' }}>{r.guest?.phone}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{r.room?.name || r.room?.roomNumber || '—'}</AdminTd>
              <AdminTd>{new Date(r.checkInDate).toLocaleDateString()}</AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{r.totalNights}</AdminTd>
              <AdminTd>
                <button onClick={() => handleCheckOut(r._id)} disabled={checkingOut === r._id}
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem', color:'hsl(38 80% 35%)', border:'1px solid hsl(38 80% 70%)', background:'hsl(38 90% 95%)', fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.35rem 0.75rem', cursor:'pointer', opacity: checkingOut===r._id ? 0.55 : 1 }}>
                  <LogOut size={11} strokeWidth={2} />
                  {checkingOut === r._id ? 'Processing...' : 'Check Out'}
                </button>
              </AdminTd>
            </AdminRow>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
