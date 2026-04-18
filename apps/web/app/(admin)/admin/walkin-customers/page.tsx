'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, Banknote, Coffee, Sparkles, RefreshCw } from 'lucide-react';
import { A, PageHeader, AdminTable, AdminRow, AdminTd, Spinner, EmptyRow, adminTableCss } from '../../_adminStyles';

type WalkInType = 'dine_in' | 'spa' | '';

interface WalkInCustomer {
  _id: string;
  name: string;
  phone?: string;
  type: 'dine_in' | 'spa';
  notes?: string;
  createdBy?: { name: string };
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = { dine_in: 'Dine-in', spa: 'Spa' };
const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  dine_in: { bg: 'hsl(195 60% 90%)', color: 'hsl(195 60% 28%)' },
  spa:     { bg: 'hsl(270 50% 90%)', color: 'hsl(270 50% 32%)' },
};

export default function WalkInCustomersPage() {
  const [customers, setCustomers]   = useState<WalkInCustomer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState<WalkInType>('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (dateFilter) params.set('date', dateFilter);
      const { data } = await api.get(`/walkin-customers?${params.toString()}`);
      setCustomers(data.customers || []);
    } catch { toast.error('Failed to load walk-in customers'); }
    finally { setLoading(false); }
  }, [typeFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const dineInCount = customers.filter(c => c.type === 'dine_in').length;
  const spaCount    = customers.filter(c => c.type === 'spa').length;

  return (
    <>
      <style>{adminTableCss}</style>
      <div style={{ padding: '2rem', maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <PageHeader eyebrow="External Visitors" title="Walk-in Customers" />
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: A.papyrus, border: `1px solid ${A.border}`, padding: '0.6rem 1rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, cursor: 'pointer' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Today', value: customers.length, icon: <UserPlus size={18} strokeWidth={1.4} /> },
            { label: 'Dine-in', value: dineInCount, icon: <Coffee size={18} strokeWidth={1.4} /> },
            { label: 'Spa', value: spaCount, icon: <Sparkles size={18} strokeWidth={1.4} /> },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.muted, marginBottom: '0.35rem' }}>{k.label}</p>
                <p style={{ fontFamily: A.cinzel, fontSize: '1.5rem', color: A.navy, fontWeight: 700 }}>{k.value}</p>
              </div>
              <span style={{ color: A.gold, opacity: 0.7 }}>{k.icon}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.35rem' }}>Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: `1px solid ${A.border}`, fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.35rem' }}>Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as WalkInType)}
              style={{ padding: '0.5rem 0.75rem', border: `1px solid ${A.border}`, fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy, outline: 'none', background: '#fff' }}
            >
              <option value="">All types</option>
              <option value="dine_in">Dine-in</option>
              <option value="spa">Spa</option>
            </select>
          </div>
        </div>

        {/* Revenue note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'hsl(142 40% 95%)', border: '1px solid hsl(142 40% 80%)', padding: '0.625rem 1rem', marginBottom: '1.5rem' }}>
          <Banknote size={14} color="hsl(142 45% 35%)" />
          <span style={{ fontFamily: A.raleway, fontSize: '0.78rem', color: 'hsl(142 45% 28%)' }}>
            All walk-in transactions are <strong>cash only</strong> — collected at point of service. Revenue is reflected in the dashboard under Food & Bar / Spa.
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><Spinner /></div>
        ) : (
          <AdminTable headers={['Name', 'Phone', 'Type', 'Notes', 'Registered By', 'Time']} minWidth={600}>
            {customers.length === 0 ? (
              <EmptyRow colSpan={6} message="No walk-in customers for this date / filter" />
            ) : (
              customers.map(c => (
                <AdminRow key={c._id}>
                  <AdminTd style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.navy, fontWeight: 600 }}>{c.name}</AdminTd>
                  <AdminTd style={{ fontFamily: A.raleway, fontSize: '0.8rem', color: A.muted }}>{c.phone || '—'}</AdminTd>
                  <AdminTd>
                    <span style={{
                      display: 'inline-block',
                      background: TYPE_COLOR[c.type].bg,
                      color: TYPE_COLOR[c.type].color,
                      fontFamily: A.cinzel,
                      fontSize: '0.58rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.55rem',
                    }}>
                      {c.type === 'dine_in' ? <><Coffee size={9} style={{ display: 'inline', marginRight: '0.25rem' }} /></> : <><Sparkles size={9} style={{ display: 'inline', marginRight: '0.25rem' }} /></>}
                      {TYPE_LABEL[c.type]}
                    </span>
                  </AdminTd>
                  <AdminTd style={{ fontFamily: A.raleway, fontSize: '0.8rem', color: A.muted }}>{c.notes || '—'}</AdminTd>
                  <AdminTd style={{ fontFamily: A.raleway, fontSize: '0.78rem', color: A.muted }}>{c.createdBy?.name || '—'}</AdminTd>
                  <AdminTd style={{ fontFamily: A.raleway, fontSize: '0.78rem', color: A.muted }}>
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </AdminTd>
                </AdminRow>
              ))
            )}
          </AdminTable>
        )}
      </div>
    </>
  );
}
