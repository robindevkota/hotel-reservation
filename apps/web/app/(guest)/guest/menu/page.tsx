'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import { useCart } from '../../../../hooks/useCart';
import { useCartStore } from '../../../../store/cartStore';
import toast from 'react-hot-toast';
import { ShoppingBag, Clock, Leaf, Plus, Minus, X, ChevronRight } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD   = 'hsl(43 72% 55%)';
const NAVY   = 'hsl(220 55% 14%)';
const NAVY2  = 'hsl(220 48% 20%)';
const CREAM  = 'hsl(40 33% 96%)';
const PAPER  = 'hsl(38 40% 92%)';
const MUTED  = 'hsl(220 15% 45%)';
const BORDER = 'hsl(35 25% 82%)';
const CINZEL = "'Cinzel', serif" as const;
const RALEWAY = "'Raleway', sans-serif" as const;

const CATEGORIES = ['all','breakfast','lunch','dinner','snacks','beverages','desserts'];

export default function MenuPage() {
  const [items, setItems]             = useState<any[]>([]);
  const [activeCategory, setActive]   = useState('all');
  const [cartOpen, setCartOpen]       = useState(false);
  const [orderNotes, setOrderNotes]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [placing, setPlacing]         = useState(false);
  const { addItem, items: cartItems, removeItem, updateQty, total } = useCartStore();
  const { placeOrder } = useCart();

  useEffect(() => {
    api.get('/menu').then(({ data }) => { setItems(data.items); setLoading(false); });
  }, []);

  const filtered  = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);
  const cartTotal = total();
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    const ok = await placeOrder(orderNotes);
    if (ok) { setCartOpen(false); setOrderNotes(''); }
    setPlacing(false);
  };

  return (
    <>
      <style>{`
        .menu-cat:hover { color: ${GOLD} !important; border-color: ${GOLD} !important; }
        .menu-card:hover { box-shadow: 0 6px 24px -4px hsl(220 55% 14% / 0.12); transform: translateY(-1px); }
        .add-btn:hover { background: ${GOLD} !important; color: ${NAVY} !important; }
        .qty-btn:hover { background: ${GOLD} !important; color: ${NAVY} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ background: CREAM, minHeight: '100vh', paddingBottom: '7rem' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ background: NAVY, padding: '2rem 1.5rem 1.75rem', textAlign: 'center' }}>
          <p style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.58rem', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>In-Room Dining</p>
          <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.6rem', lineHeight: 1.2, marginBottom: '1rem' }}>Royal Menu</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}50)` }} />
            <span style={{ color: GOLD, fontSize: '0.9rem' }}>𓂀</span>
            <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}50)` }} />
          </div>
        </div>

        {/* ── Category Filter ──────────────────────────────────────────────── */}
        <div style={{ background: NAVY2, borderBottom: `1px solid ${GOLD}20`, padding: '0.875rem 1rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem', minWidth: 'max-content' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} className="menu-cat" onClick={() => setActive(cat)}
                style={{ fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.45rem 1rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.18s', background: activeCategory === cat ? GOLD : 'transparent', color: activeCategory === cat ? NAVY : 'hsl(40 30% 85% / 0.55)', borderColor: activeCategory === cat ? GOLD : 'hsl(40 30% 85% / 0.2)', fontWeight: activeCategory === cat ? 700 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Items ────────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ width: '2rem', height: '2rem', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', fontFamily: CINZEL, color: MUTED, fontSize: '0.75rem', letterSpacing: '0.1em' }}>No items in this category</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {filtered.map(item => {
                const inCart = cartItems.find(c => c.menuItemId === item._id);
                return (
                  <div key={item._id} className="menu-card" style={{ background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', overflow: 'hidden', transition: 'box-shadow 0.25s, transform 0.25s' }}>
                    {/* Image */}
                    <div style={{ position: 'relative', width: '7rem', flexShrink: 0 }}>
                      <Image src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'} alt={item.name} fill style={{ objectFit: 'cover' }} />
                      {item.isVeg && (
                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', width: '1.2rem', height: '1.2rem', background: 'hsl(142 50% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Leaf size={10} color="#fff" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <h3 style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.82rem', letterSpacing: '0.05em', fontWeight: 600, lineHeight: 1.3 }}>{item.name}</h3>
                          <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.95rem', fontWeight: 700, flexShrink: 0 }}>${item.price}</span>
                        </div>
                        <p style={{ fontFamily: RALEWAY, color: MUTED, fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '0.35rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: MUTED }}>
                          <Clock size={11} strokeWidth={1.8} />
                          <span style={{ fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.08em' }}>~{item.preparationTime} min</span>
                        </div>
                      </div>

                      {/* Cart controls */}
                      <div style={{ marginTop: '0.75rem' }}>
                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <button className="qty-btn" onClick={() => updateQty(item._id, inCart.quantity - 1)}
                              style={{ width: '1.75rem', height: '1.75rem', border: `1px solid ${GOLD}`, color: GOLD, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.82rem', fontWeight: 700, minWidth: '1.25rem', textAlign: 'center' }}>{inCart.quantity}</span>
                            <button className="qty-btn" onClick={() => updateQty(item._id, inCart.quantity + 1)}
                              style={{ width: '1.75rem', height: '1.75rem', border: `1px solid ${GOLD}`, color: GOLD, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                            <span style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.78rem', fontWeight: 600, marginLeft: '0.25rem' }}>${(item.price * inCart.quantity).toFixed(2)}</span>
                          </div>
                        ) : (
                          <button className="add-btn" onClick={() => { addItem({ menuItemId: item._id, name: item.name, price: item.price, image: item.image }); toast.success(`${item.name} added`); }}
                            style={{ fontFamily: CINZEL, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, border: `1px solid ${GOLD}60`, background: 'transparent', padding: '0.4rem 1rem', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                            <Plus size={11} strokeWidth={2.5} /> Add to Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Cart Button ─────────────────────────────────────────────── */}
      {itemCount > 0 && (
        <div style={{ position: 'fixed', bottom: '5.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 1rem', zIndex: 40, animation: 'slideUp 0.25s ease' }}>
          <button onClick={() => setCartOpen(true)}
            style={{ background: `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: NAVY, fontFamily: CINZEL, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.875rem 2rem', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.875rem', boxShadow: `0 8px 28px -4px ${GOLD}60` }}>
            <ShoppingBag size={15} strokeWidth={2.5} />
            <span>View Order ({itemCount})</span>
            <span style={{ borderLeft: `1px solid ${NAVY}30`, paddingLeft: '0.875rem' }}>${cartTotal.toFixed(2)}</span>
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Cart Modal ───────────────────────────────────────────────────────── */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 8% / 0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setCartOpen(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '42rem', background: '#fff', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>

            {/* Modal header */}
            <div style={{ background: NAVY, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: CINZEL, color: `${GOLD}99`, fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Review</p>
                <h2 style={{ fontFamily: CINZEL, color: 'hsl(40 30% 94%)', fontSize: '1rem' }}>Your Order</h2>
              </div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', color: 'hsl(40 30% 85% / 0.4)', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>

            {/* Items */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' }}>
              {cartItems.map(item => (
                <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.875rem', marginBottom: '0.875rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: CINZEL, color: NAVY, fontSize: '0.82rem', marginBottom: '0.4rem' }}>{item.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="qty-btn" onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                        style={{ width: '1.5rem', height: '1.5rem', border: `1px solid ${GOLD}60`, color: GOLD, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
                        <Minus size={10} strokeWidth={2.5} />
                      </button>
                      <span style={{ fontFamily: CINZEL, fontSize: '0.78rem', color: NAVY, fontWeight: 700, minWidth: '1rem', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                        style={{ width: '1.5rem', height: '1.5rem', border: `1px solid ${GOLD}60`, color: GOLD, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
                        <Plus size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: CINZEL, color: GOLD, fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.3rem' }}>${(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => removeItem(item.menuItemId)} style={{ fontFamily: CINZEL, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontFamily: CINZEL, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: NAVY, display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Special Requests</label>
                <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} placeholder="Allergies, special requests..."
                  style={{ width: '100%', padding: '0.75rem', border: `1px solid ${BORDER}`, outline: 'none', fontFamily: RALEWAY, fontSize: '0.85rem', color: NAVY, resize: 'none', background: PAPER, boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${BORDER}`, background: PAPER }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontFamily: CINZEL, color: MUTED, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Total</span>
                <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1.4rem', fontWeight: 700 }}>${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handlePlaceOrder} disabled={placing}
                style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: NAVY, fontFamily: CINZEL, fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem', border: 'none', cursor: placing ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: placing ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                {placing ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
