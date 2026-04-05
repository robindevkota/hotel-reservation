'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Filter } from 'lucide-react';
import { A, StatusPill, PageHeader, AdminTable, AdminRow, AdminTd, ActionBtn, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

const STATUSES = ['','pending','confirmed','checked_in','checked_out','cancelled'];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get(`/reservations${filter ? `?status=${filter}` : ''}`)
      .then(({ data }) => { setReservations(data.reservations || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);

  const confirm   = async (id: string) => { try { await api.patch(`/reservations/${id}/confirm`);  toast.success('Confirmed');   fetchData(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } };
  const checkIn   = async (id: string) => { try { const {data} = await api.post(`/checkin/${id}`); toast.success('Checked in!'); fetchData(); if(data.qrCodeUrl) window.open(data.qrCodeUrl,'_blank'); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } };
  const cancel    = async (id: string) => { if(!confirm('Cancel this reservation?')) return; try { await api.patch(`/reservations/${id}/cancel`); toast.success('Cancelled'); fetchData(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } };

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <PageHeader eyebrow="Manage" title="Reservations" />
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem' }}>
            <Filter size={13} color={A.gold} strokeWidth={1.8} />
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              style={{ fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.navy, background:'transparent', border:'none', outline:'none', cursor:'pointer' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_',' ') : 'All Statuses'}</option>)}
            </select>
          </div>
        </div>

        <AdminTable headers={['Guest','Room','Check-In','Check-Out','Nights','Total','Status','Actions']} minWidth={900}>
          {loading ? <Spinner />
          : reservations.length === 0 ? <EmptyRow colSpan={8} message="No reservations found" />
          : reservations.map((r:any) => (
            <AdminRow key={r._id}>
              <AdminTd>
                <div style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy, marginBottom:'0.15rem' }}>{r.guest?.name}</div>
                <div style={{ fontSize:'0.7rem', color:A.muted }}>{r.guest?.email}</div>
              </AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, fontSize:'0.78rem', color:A.navy }}>{r.room?.name || '—'}</AdminTd>
              <AdminTd>{new Date(r.checkInDate).toLocaleDateString()}</AdminTd>
              <AdminTd>{new Date(r.checkOutDate).toLocaleDateString()}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>{r.totalNights}</AdminTd>
              <AdminTd style={{ fontFamily:A.cinzel, color:A.gold }}>${r.roomCharges?.toLocaleString()}</AdminTd>
              <AdminTd><StatusPill status={r.status} /></AdminTd>
              <AdminTd>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {r.status==='pending'    && <ActionBtn variant="confirm"  onClick={()=>confirm(r._id)}>Confirm</ActionBtn>}
                  {r.status==='confirmed'  && <ActionBtn variant="checkin"  onClick={()=>checkIn(r._id)}>Check In</ActionBtn>}
                  {['pending','confirmed'].includes(r.status) && <ActionBtn variant="cancel" onClick={()=>cancel(r._id)}>Cancel</ActionBtn>}
                </div>
              </AdminTd>
            </AdminRow>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
