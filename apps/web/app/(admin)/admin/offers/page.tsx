'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { A, PageHeader } from '../../_adminStyles';

const inputBase: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem', border: `1px solid ${A.border}`,
  outline: 'none', fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy,
  background: '#fff', boxSizing: 'border-box',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.4rem', fontWeight: 600 }}>
      {children}
    </label>
  );
}

function pctBadge(value: number) {
  if (!value) return null;
  return (
    <span style={{ background: 'hsl(142 50% 92%)', color: 'hsl(142 50% 28%)', fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.2rem 0.6rem', fontWeight: 700 }}>
      {value}% OFF
    </span>
  );
}

const emptyForm = {
  title: '', description: '',
  roomDiscount: '0', foodDiscount: '0', spaDiscount: '0',
  startDate: '', endDate: '', isActive: true,
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.get('/offers');
      setOffers(res.data.offers);
    } catch {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setModal(true);
  }

  function openEdit(offer: any) {
    setEditing(offer);
    setForm({
      title:        offer.title,
      description:  offer.description ?? '',
      roomDiscount: String(offer.roomDiscount),
      foodDiscount: String(offer.foodDiscount),
      spaDiscount:  String(offer.spaDiscount),
      startDate:    offer.startDate?.slice(0, 10) ?? '',
      endDate:      offer.endDate?.slice(0, 10) ?? '',
      isActive:     offer.isActive,
    });
    setModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.startDate || !form.endDate) { toast.error('Start and end dates are required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      const payload = {
        title:        form.title.trim(),
        description:  form.description.trim(),
        roomDiscount: Number(form.roomDiscount),
        foodDiscount: Number(form.foodDiscount),
        spaDiscount:  Number(form.spaDiscount),
        startDate:    form.startDate,
        endDate:      form.endDate,
        isActive:     form.isActive,
      };
      if (editing) {
        await api.patch(`/offers/${editing._id}`, payload);
        toast.success('Offer updated');
      } else {
        await api.post('/offers', payload);
        toast.success('Offer created');
      }
      setModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this offer permanently?')) return;
    setDeleting(id);
    try {
      await api.delete(`/offers/${id}`);
      toast.success('Offer deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete offer');
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(offer: any) {
    try {
      await api.patch(`/offers/${offer._id}`, { isActive: !offer.isActive });
      toast.success(offer.isActive ? 'Offer deactivated' : 'Offer activated');
      fetchData();
    } catch {
      toast.error('Failed to update offer');
    }
  }

  function isLive(offer: any) {
    if (!offer.isActive) return false;
    const now = new Date();
    return new Date(offer.startDate) <= now && new Date(offer.endDate) >= now;
  }

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <style>{`
        .offer-row:hover td { background: hsl(38 40% 97%); }
        .offer-row td { transition: background 0.18s; }
      `}</style>

      <div style={{ padding: '2rem 2rem 3rem', maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <PageHeader eyebrow="Promotions" title="Special Offers" />
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: A.navy, color: A.gold, border: 'none', cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.7rem 1.25rem', marginTop: '0.25rem' }}>
            <Plus size={14} /> New Offer
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: A.cinzel, color: A.muted, fontSize: '0.8rem', letterSpacing: '0.15em' }}>Loading…</div>
        ) : offers.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '4rem', textAlign: 'center' }}>
            <Tag size={32} color={A.gold} style={{ marginBottom: '1rem' }} />
            <p style={{ fontFamily: A.cinzel, color: A.muted, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No offers yet</p>
            <p style={{ fontFamily: A.cormo, color: A.muted, fontSize: '1rem', fontStyle: 'italic', marginTop: '0.5rem' }}>Create your first promotional offer above.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${A.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: A.navy }}>
                  {['Title', 'Room', 'Food', 'Spa', 'Period', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', fontFamily: A.cinzel, fontSize: '0.57rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: A.gold, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => (
                  <tr key={offer._id} className="offer-row">
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.navy, marginBottom: '0.2rem' }}>{offer.title}</div>
                      {offer.description && (
                        <div style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      {offer.roomDiscount > 0 ? pctBadge(offer.roomDiscount) : <span style={{ color: 'hsl(220 15% 65%)', fontFamily: A.raleway, fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      {offer.foodDiscount > 0 ? pctBadge(offer.foodDiscount) : <span style={{ color: 'hsl(220 15% 65%)', fontFamily: A.raleway, fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      {offer.spaDiscount > 0 ? pctBadge(offer.spaDiscount) : <span style={{ color: 'hsl(220 15% 65%)', fontFamily: A.raleway, fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)`, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted }}>
                        {new Date(offer.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' → '}
                        {new Date(offer.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      {isLive(offer) ? (
                        <span style={{ background: 'hsl(142 50% 92%)', color: 'hsl(142 50% 28%)', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.7rem', fontWeight: 700 }}>LIVE</span>
                      ) : offer.isActive ? (
                        <span style={{ background: 'hsl(210 80% 94%)', color: 'hsl(210 70% 35%)', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.7rem' }}>Scheduled</span>
                      ) : (
                        <span style={{ background: 'hsl(220 20% 92%)', color: 'hsl(220 15% 42%)', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.7rem' }}>Inactive</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderBottom: `1px solid hsl(35 25% 88%)` }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => toggleActive(offer)} title={offer.isActive ? 'Deactivate' : 'Activate'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: offer.isActive ? A.gold : A.muted, padding: '0.25rem', display: 'flex' }}>
                          {offer.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => openEdit(offer)} style={{ background: 'none', border: `1px solid ${A.border}`, cursor: 'pointer', color: A.navy, padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(offer._id)} disabled={deleting === offer._id} style={{ background: 'none', border: '1px solid hsl(0 60% 82%)', cursor: 'pointer', color: 'hsl(0 60% 46%)', padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,27,62,0.55)', backdropFilter: 'blur(3px)', padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid hsl(43 72% 55% / 0.3)`, boxShadow: '0 20px 60px hsl(220 55% 10% / 0.35)' }}>
            {/* Header */}
            <div style={{ background: A.navy, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Tag size={15} color={A.gold} />
                <span style={{ fontFamily: A.cinzel, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: A.gold }}>
                  {editing ? 'Edit Offer' : 'New Offer'}
                </span>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,236,215,0.5)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              <div>
                <FieldLabel>Title *</FieldLabel>
                <input style={inputBase} placeholder="e.g. New Year Extravaganza" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea style={{ ...inputBase, resize: 'vertical', minHeight: '70px' }} placeholder="Brief description shown to guests…" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {/* Discounts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <FieldLabel>Room Discount %</FieldLabel>
                  <input type="number" min="0" max="100" style={inputBase} value={form.roomDiscount} onChange={e => set('roomDiscount', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Food Discount %</FieldLabel>
                  <input type="number" min="0" max="100" style={inputBase} value={form.foodDiscount} onChange={e => set('foodDiscount', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Spa Discount %</FieldLabel>
                  <input type="number" min="0" max="100" style={inputBase} value={form.spaDiscount} onChange={e => set('spaDiscount', e.target.value)} />
                </div>
              </div>

              {/* Date row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <FieldLabel>Start Date *</FieldLabel>
                  <input type="date" style={inputBase} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>End Date *</FieldLabel>
                  <input type="date" style={inputBase} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => set('isActive', !form.isActive)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: form.isActive ? A.gold : A.muted }}
                >
                  {form.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
                <span style={{ fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.1em', color: A.navy }}>
                  {form.isActive ? 'Active (will show to guests during date window)' : 'Inactive (hidden from guests)'}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid hsl(35 25% 88%)`, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '0.65rem 1.25rem', border: `1px solid ${A.border}`, background: 'transparent', cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.muted }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.65rem 1.75rem', border: 'none', background: A.navy, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.gold, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Update Offer' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
