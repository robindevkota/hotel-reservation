'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, Trash2, Plus, Globe, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { A, PageHeader } from '../../_adminStyles';

const SOURCE_OPTIONS = [
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'agoda',       label: 'Agoda' },
  { value: 'other',       label: 'Other OTA' },
];

const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  booking_com: { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
  agoda:       { bg: '#FEF2F2', color: '#B91C1C', border: '#FCA5A5' },
  other:       { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
};

interface Channel {
  _id: string;
  source: string;
  label: string;
  icalUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string;
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.7rem 0.875rem',
  border: `1px solid ${A.border}`,
  fontFamily: A.cinzel, fontSize: '0.9rem',
  color: A.navy, background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const lblSt: React.CSSProperties = {
  display: 'block', fontFamily: A.cinzel, fontSize: '0.82rem',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: A.navy, marginBottom: '0.4rem', marginTop: '1.1rem',
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function ChannelModal({ existing, onClose, onSaved }: {
  existing?: Channel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [source, setSource]   = useState(existing?.source || 'booking_com');
  const [label, setLabel]     = useState(existing?.label || '');
  const [icalUrl, setIcalUrl] = useState(existing?.icalUrl || '');
  const [busy, setBusy]       = useState(false);

  const save = async () => {
    if (!label.trim() || !icalUrl.trim()) { toast.error('Label and iCal URL are required'); return; }
    setBusy(true);
    try {
      await api.post('/channels', { source, label: label.trim(), icalUrl: icalUrl.trim() });
      toast.success(existing ? 'Channel updated' : 'Channel added');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 55% 18% / 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', maxWidth: '520px', width: '100%', padding: '2rem', border: `1px solid ${A.border}` }}>
        <h3 style={{ fontFamily: A.cinzel, fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.5rem' }}>
          {existing ? 'Edit Channel' : 'Add Booking Channel'}
        </h3>
        <p style={{ fontFamily: A.cormo, fontSize: '1rem', color: A.muted, marginBottom: '0.5rem', lineHeight: 1.7 }}>
          Paste the iCal export URL from the platform's extranet. Royal Suites will poll it every 20 minutes and block those dates automatically.
        </p>

        {!existing && (
          <>
            <label style={lblSt}>Platform</label>
            <select value={source} onChange={e => setSource(e.target.value)} style={inputSt}>
              {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}

        <label style={lblSt}>Display Name</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Booking.com – Property 123" style={inputSt} />

        <label style={lblSt}>iCal URL</label>
        <input value={icalUrl} onChange={e => setIcalUrl(e.target.value)} placeholder="https://admin.booking.com/hotel/hoteladmin/ical.ics?..." style={{ ...inputSt, fontFamily: A.cormo, fontSize: '0.8rem' }} />

        <p style={{ fontFamily: A.cormo, fontSize: '0.95rem', color: A.muted, marginTop: '0.6rem', lineHeight: 1.8 }}>
          <strong>Booking.com:</strong> Extranet → Calendar → Export calendar → Copy link<br />
          <strong>Agoda:</strong> YCS → Calendar → Sync Calendar → iCal URL
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
          <button onClick={onClose} style={{ flex: 1, background: '#fff', color: A.muted, fontFamily: A.cinzel, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: `1px solid ${A.border}`, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={busy} style={{ flex: 1, background: A.navy, color: '#fff', fontFamily: A.cinzel, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.875rem', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState<Channel | undefined>();
  const [syncing, setSyncing]   = useState<string | null>(null);

  const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const icalExportUrl = NEXT_PUBLIC_API_URL.replace('/api', '') + '/api/channels/ical.ics';

  const load = () => {
    setLoading(true);
    api.get('/channels')
      .then(({ data }) => setChannels(data.channels || []))
      .catch(() => toast.error('Failed to load channels'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteChannel = async (source: string, label: string) => {
    if (!confirm(`Remove ${label}?`)) return;
    try {
      await api.delete(`/channels/${source}`);
      toast.success('Channel removed');
      load();
    } catch { toast.error('Failed to remove'); }
  };

  const sync = async (source: string) => {
    setSyncing(source);
    try {
      await api.post(`/channels/sync/${source}`);
      toast.success('Sync complete');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Sync failed');
    } finally { setSyncing(null); }
  };

  const syncAll = async () => {
    setSyncing('all');
    try {
      await api.post('/channels/sync/all');
      toast.success('All channels synced');
      load();
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(null); }
  };

  return (
    <>
      <div style={{ padding: '2rem', maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <PageHeader eyebrow="Channel Manager" title="Booking Channels" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {channels.length > 0 && (
              <button onClick={syncAll} disabled={syncing === 'all'} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', border: `1px solid ${A.border}`, background: '#fff', fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, cursor: 'pointer', opacity: syncing === 'all' ? 0.6 : 1 }}>
                <RefreshCw size={13} strokeWidth={2} />
                Sync All
              </button>
            )}
            <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', border: 'none', background: A.navy, fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              <Plus size={13} strokeWidth={2.5} />
              Add Channel
            </button>
          </div>
        </div>

        {/* iCal Export box */}
        <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Globe size={14} color={A.gold} strokeWidth={2} />
            <span style={{ fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, fontWeight: 700 }}>Your Royal Suites iCal Feed</span>
          </div>
          <p style={{ fontFamily: A.cinzel, fontSize: '0.68rem', color: A.muted, lineHeight: 1.7, marginBottom: '0.75rem' }}>
            Paste this URL into Booking.com and Agoda's calendar sync settings so they always see your confirmed bookings and never double-book.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: A.navy, background: 'hsl(38 40% 94%)', padding: '0.45rem 0.75rem', border: `1px solid ${A.border}`, flex: 1, wordBreak: 'break-all' }}>
              {icalExportUrl}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(icalExportUrl); toast.success('Copied!'); }}
              style={{ padding: '0.45rem 0.9rem', border: `1px solid ${A.border}`, background: '#fff', fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Copy URL
            </button>
          </div>
        </div>

        {/* Channel cards */}
        {loading ? (
          <p style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.muted, padding: '2rem 0' }}>Loading…</p>
        ) : channels.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.muted, marginBottom: '0.5rem' }}>No channels configured yet</p>
            <p style={{ fontFamily: A.cinzel, fontSize: '0.68rem', color: A.muted }}>Click "Add Channel" to connect Booking.com or Agoda</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {channels.map(ch => {
              const sc = SOURCE_COLORS[ch.source] || SOURCE_COLORS.other;
              const isSync = syncing === ch.source;
              return (
                <div key={ch._id} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Source badge */}
                  <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                    <span style={{ display: 'inline-block', fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {SOURCE_OPTIONS.find(o => o.value === ch.source)?.label || ch.source}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: A.cinzel, fontSize: '0.82rem', color: A.navy, fontWeight: 700, marginBottom: '0.2rem' }}>{ch.label}</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: A.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.5rem' }}>{ch.icalUrl}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {ch.lastSyncError ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.62rem', color: 'hsl(0 60% 42%)' }}>
                          <AlertCircle size={11} /> {ch.lastSyncError}
                        </span>
                      ) : ch.lastSyncedAt ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.62rem', color: 'hsl(142 50% 32%)' }}>
                          <CheckCircle2 size={11} /> Last synced {new Date(ch.lastSyncedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.62rem', color: A.muted }}>
                          <Clock size={11} /> Not yet synced
                        </span>
                      )}
                      {!ch.isActive && (
                        <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(0 60% 42%)', background: 'hsl(0 70% 96%)', border: '1px solid hsl(0 60% 85%)', padding: '0.15rem 0.4rem' }}>Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button onClick={() => sync(ch.source)} disabled={isSync} title="Sync now" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: `1px solid ${A.border}`, background: '#fff', fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.navy, cursor: 'pointer', opacity: isSync ? 0.55 : 1 }}>
                      <RefreshCw size={11} strokeWidth={2} style={{ animation: isSync ? 'spin 1s linear infinite' : 'none' }} />
                      {isSync ? 'Syncing…' : 'Sync'}
                    </button>
                    <button onClick={() => setEditing(ch)} title="Edit" style={{ padding: '0.4rem 0.75rem', border: `1px solid ${A.border}`, background: '#fff', fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.navy, cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => deleteChannel(ch.source, ch.label)} title="Remove" style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.6rem', border: '1px solid hsl(0 60% 85%)', background: 'hsl(0 70% 97%)', color: 'hsl(0 60% 42%)', cursor: 'pointer' }}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How it works info */}
        <div style={{ marginTop: '2rem', background: 'hsl(43 72% 55% / 0.07)', border: `1px solid hsl(43 72% 55% / 0.25)`, padding: '1.25rem 1.5rem' }}>
          <p style={{ fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy, fontWeight: 700, marginBottom: '0.75rem' }}>How It Works</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              '1. Royal Suites polls each platform\'s iCal URL every 20 minutes automatically',
              '2. New bookings from Booking.com or Agoda appear in Reservations with the correct source badge',
              '3. Staff assign a room and update guest details — OTA emails already have the full guest info',
              '4. Your Royal Suites feed URL (above) blocks those dates on OTA calendars too — preventing double-bookings',
            ].map(s => (
              <p key={s} style={{ fontFamily: A.cinzel, fontSize: '0.68rem', color: A.muted, lineHeight: 1.7 }}>{s}</p>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {showAdd && (
        <ChannelModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />
      )}
      {editing && (
        <ChannelModal existing={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      )}
    </>
  );
}
