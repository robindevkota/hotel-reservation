'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../../lib/api';
import { Star, Eye, EyeOff, AlertTriangle, ChevronLeft, ChevronRight, MessageSquare, BarChart2 } from 'lucide-react';

const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 18%)';
const MUTED  = 'hsl(220 15% 50%)';
const BORDER = 'hsl(35 25% 82%)';
const CINZEL  = "'Cinzel', serif";
const RALEWAY = "'Raleway', sans-serif";

type Filter = 'all' | 'visible' | 'hidden' | 'bad';
type Tab    = 'ratings' | 'feedback';

function Stars({ value, size = 14 }: { value?: number; size?: number }) {
  if (!value) return <span style={{ color: MUTED, fontSize: '0.7rem', fontFamily: RALEWAY }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', gap: '1px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} strokeWidth={1.5} fill={n <= value ? GOLD : 'none'} color={n <= value ? GOLD : MUTED} />
      ))}
      <span style={{ marginLeft: '0.3rem', fontFamily: CINZEL, fontSize: '0.65rem', color: NAVY }}>{value.toFixed(1)}</span>
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [filter, setFilter]     = useState<Filter>('all');
  const [tab, setTab]           = useState<Tab>('ratings');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const pageSize = 25;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filter === 'visible') params.set('hidden', 'false');
      if (filter === 'hidden')  params.set('hidden', 'true');
      if (filter === 'bad')     params.set('bad', 'true');
      const { data } = await api.get(`/reviews?${params}`);
      setReviews(data.reviews ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  useEffect(() => {
    api.get('/reviews/public?limit=1').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  async function toggleVisibility(id: string) {
    await api.patch(`/reviews/${id}/visibility`, {});
    fetchReviews();
  }

  const totalPages = Math.ceil(total / pageSize);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',     label: 'All'          },
    { key: 'visible', label: 'Visible'      },
    { key: 'hidden',  label: 'Hidden'       },
    { key: 'bad',     label: '≤2 Stars (Bad)' },
  ];

  // Feedback tab: reviews that have at least one text feedback field
  const withFeedback = reviews.filter(r => r.roomFeedback || r.foodFeedback || r.spaFeedback);

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Guest Feedback</p>
        <h1 style={{ fontFamily: CINZEL, color: NAVY, fontSize: '1.5rem', letterSpacing: '0.05em' }}>Reviews</h1>
      </div>

      {/* Stats bar — all 5 cards including total from live query */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* Total — always from the live count (includes hidden) */}
        <div style={{ background: NAVY, border: `1px solid hsl(43 72% 55% / 0.25)`, padding: '1rem 1.25rem' }}>
          <p style={{ fontFamily: CINZEL, color: 'hsl(43 72% 65%)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Reviews</p>
          <div style={{ fontFamily: CINZEL, color: GOLD, fontSize: '1.6rem', fontWeight: 700, lineHeight: 1 }}>
            {loading ? '—' : total}
          </div>
        </div>
        {[
          { label: 'Overall Avg', val: stats?.overall },
          { label: 'Room Avg',    val: stats?.room    },
          { label: 'Food Avg',    val: stats?.food    },
          { label: 'Spa Avg',     val: stats?.spa     },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${BORDER}`, padding: '1rem 1.25rem' }}>
            <p style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{label}</p>
            <div style={{ fontFamily: CINZEL, color: NAVY, fontSize: '1.1rem' }}>
              {val != null ? <Stars value={val} size={13} /> : <span style={{ color: MUTED, fontSize: '0.75rem' }}>—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: '1.25rem' }}>
        {([
          { key: 'ratings'  as Tab, label: 'Ratings',  Icon: BarChart2     },
          { key: 'feedback' as Tab, label: 'Feedback',  Icon: MessageSquare },
        ]).map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                border: 'none', borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                background: 'transparent',
                color: active ? NAVY : MUTED,
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
              {key === 'feedback' && withFeedback.length > 0 && (
                <span style={{ background: GOLD, color: NAVY, fontFamily: CINZEL, fontSize: '0.48rem', padding: '0.1rem 0.4rem', fontWeight: 700, letterSpacing: '0.05em', marginLeft: '0.2rem' }}>
                  {withFeedback.length}
                </span>
              )}
            </button>
          );
        })}

        {/* Filter pills — only shown on ratings tab */}
        {tab === 'ratings' && (
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '0.25rem' }}>
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => { setFilter(key); setPage(1); }}
                  style={{
                    padding: '0.3rem 0.75rem', fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    border: `1px solid ${active ? NAVY : BORDER}`,
                    background: active ? NAVY : '#fff',
                    color: active ? GOLD : MUTED,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  {key === 'bad' && <AlertTriangle size={10} strokeWidth={2} />}
                  {label}
                </button>
              );
            })}
            <span style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.58rem' }}>
              {total} review{total !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Tab: Ratings ── */}
      {tab === 'ratings' && (
        <>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}` }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 5rem', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: `1px solid ${BORDER}`, background: 'hsl(38 30% 96%)' }}>
              {['Guest', 'Date', 'Room', 'Food', 'Spa', 'Overall', ''].map(h => (
                <span key={h} style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: MUTED, fontFamily: RALEWAY }}>Loading…</div>
            ) : reviews.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: MUTED, fontFamily: RALEWAY }}>No reviews found</div>
            ) : reviews.map(r => {
              const isExpanded = expanded === r._id;
              const isBad = [r.roomRating, r.foodRating, r.spaRating].some(v => v !== undefined && v <= 2);
              return (
                <div key={r._id} style={{ borderBottom: `1px solid ${BORDER}`, opacity: r.isHidden ? 0.55 : 1 }}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : r._id)}
                    style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 5rem', gap: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer', alignItems: 'center' }}
                  >
                    <div>
                      <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem' }}>{r.guest?.name ?? '—'}</p>
                      <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.65rem', marginTop: '0.1rem' }}>{r.guest?.email ?? ''}</p>
                      {isBad && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(0 65% 45%)', background: 'hsl(0 65% 96%)', padding: '0.2rem 0.5rem', border: '1px solid hsl(0 65% 85%)' }}><AlertTriangle size={11} strokeWidth={2} />Needs attention</span>}
                    </div>
                    <span style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.72rem' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <Stars value={r.roomRating} size={12} />
                    <Stars value={r.foodRating} size={12} />
                    <Stars value={r.spaRating}  size={12} />
                    <Stars value={r.overallRating} size={12} />
                    <button
                      onClick={e => { e.stopPropagation(); toggleVisibility(r._id); }}
                      title={r.isHidden ? 'Show review' : 'Hide review'}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.6rem', border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontFamily: CINZEL, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: r.isHidden ? GOLD : MUTED }}
                    >
                      {r.isHidden ? <Eye size={12} strokeWidth={1.8} /> : <EyeOff size={12} strokeWidth={1.8} />}
                      {r.isHidden ? 'Show' : 'Hide'}
                    </button>
                  </div>

                  {/* Expanded feedback inline */}
                  {isExpanded && (
                    <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: `1px solid ${BORDER}`, paddingTop: '0.875rem' }}>
                      {[
                        { label: 'Room & Hotel', rating: r.roomRating, feedback: r.roomFeedback },
                        { label: 'Food & Dining', rating: r.foodRating, feedback: r.foodFeedback },
                        { label: 'Spa',           rating: r.spaRating,  feedback: r.spaFeedback  },
                      ].filter(d => d.rating !== undefined).map(({ label, rating, feedback }) => (
                        <div key={label} style={{ background: 'hsl(38 30% 97%)', border: `1px solid ${BORDER}`, padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: feedback ? '0.5rem' : 0 }}>
                            <span style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: '7rem' }}>{label}</span>
                            <Stars value={rating} size={13} />
                          </div>
                          {feedback && <p style={{ fontFamily: RALEWAY, color: 'hsl(220 20% 28%)', fontSize: '0.85rem', lineHeight: 1.65, fontStyle: 'italic' }}>"{feedback}"</p>}
                        </div>
                      ))}
                      {r.reservation && (
                        <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem' }}>
                          Booking: <strong style={{ fontFamily: CINZEL, color: NAVY }}>{r.reservation.bookingRef}</strong> · Check-in {r.reservation.checkInDate ? new Date(r.reservation.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 0.6rem', border: `1px solid ${BORDER}`, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} color={NAVY} />
              </button>
              <span style={{ fontFamily: CINZEL, fontSize: '0.62rem', color: NAVY, letterSpacing: '0.1em' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 0.6rem', border: `1px solid ${BORDER}`, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} color={NAVY} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Feedback ── */}
      {tab === 'feedback' && (
        <div>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: MUTED, fontFamily: RALEWAY }}>Loading…</div>
          ) : withFeedback.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: MUTED, fontFamily: RALEWAY }}>
              No written feedback in current results.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {withFeedback.map(r => {
                const isBad = [r.roomRating, r.foodRating, r.spaRating].some(v => v !== undefined && v <= 2);
                const depts = [
                  { label: 'Room & Hotel', rating: r.roomRating, feedback: r.roomFeedback, color: 'hsl(210 60% 96%)', border: 'hsl(210 50% 82%)' },
                  { label: 'Food & Dining', rating: r.foodRating, feedback: r.foodFeedback, color: 'hsl(38 60% 96%)',  border: 'hsl(38 50% 82%)'  },
                  { label: 'Spa',           rating: r.spaRating,  feedback: r.spaFeedback,  color: 'hsl(150 40% 96%)', border: 'hsl(150 35% 80%)' },
                ].filter(d => d.feedback);

                if (depts.length === 0) return null;

                return (
                  <div key={r._id} style={{ background: '#fff', border: `1px solid ${isBad ? 'hsl(0 65% 82%)' : BORDER}` }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: `1px solid ${BORDER}`, background: 'hsl(38 30% 97%)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div>
                          <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.78rem', marginBottom: '0.1rem' }}>{r.guest?.name ?? '—'}</p>
                          <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.65rem' }}>{r.guest?.email ?? ''}</p>
                        </div>
                        {isBad && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(0 65% 45%)', background: 'hsl(0 65% 96%)', padding: '0.2rem 0.6rem', border: '1px solid hsl(0 65% 85%)' }}>
                            <AlertTriangle size={11} strokeWidth={2} />Needs attention
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Stars value={r.overallRating} size={13} />
                        <span style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.7rem' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {r.isHidden && (
                          <span style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, background: 'hsl(220 20% 92%)', padding: '0.2rem 0.6rem', border: `1px solid ${BORDER}` }}>Hidden</span>
                        )}
                      </div>
                    </div>

                    {/* Feedback blocks */}
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {depts.map(({ label, rating, feedback, color, border }) => (
                        <div key={label} style={{ background: color, border: `1px solid ${border}`, padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: '7rem' }}>{label}</span>
                            <Stars value={rating} size={13} />
                          </div>
                          <p style={{ fontFamily: RALEWAY, color: 'hsl(220 20% 28%)', fontSize: '0.85rem', lineHeight: 1.65, fontStyle: 'italic' }}>
                            &ldquo;{feedback}&rdquo;
                          </p>
                        </div>
                      ))}
                      {r.reservation && (
                        <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem', marginTop: '0.15rem' }}>
                          Booking: <strong style={{ fontFamily: CINZEL, color: NAVY }}>{r.reservation.bookingRef}</strong> · Check-in {r.reservation.checkInDate ? new Date(r.reservation.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination (shared state) */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 0.6rem', border: `1px solid ${BORDER}`, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} color={NAVY} />
              </button>
              <span style={{ fontFamily: CINZEL, fontSize: '0.62rem', color: NAVY, letterSpacing: '0.1em' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 0.6rem', border: `1px solid ${BORDER}`, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} color={NAVY} />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
