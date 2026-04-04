'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import { useCart } from '../../../../hooks/useCart';
import { useCartStore } from '../../../../store/cartStore';
import Button from '../../../../components/ui/Button';
import GoldDivider from '../../../../components/ui/GoldDivider';
import Modal from '../../../../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = ['all', 'breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'desserts'];

export default function MenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const { addItem, items: cartItems, removeItem, updateQty, total, clearCart } = useCartStore();
  const { placeOrder } = useCart();

  useEffect(() => {
    api.get('/menu').then(({ data }) => { setItems(data.items); setLoading(false); });
  }, []);

  const filtered = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);
  const cartTotal = total();
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    const ok = await placeOrder(orderNotes);
    if (ok) { setCartOpen(false); setOrderNotes(''); }
    setPlacing(false);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-[#0D1B3E] px-4 py-8 text-center sticky top-16 z-30">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">In-Room Dining</p>
        <h1 className="font-[Cinzel_Decorative] text-[#F5ECD7] text-2xl">Royal Menu</h1>
      </div>

      {/* Category Filter */}
      <div className="bg-[#0D1B3E]/95 sticky top-[120px] z-20 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'font-[Cinzel] text-[10px] tracking-widest uppercase px-4 py-2 border transition-all',
                activeCategory === cat
                  ? 'bg-[#C9A84C] text-[#0D1B3E] border-[#C9A84C]'
                  : 'text-[#F5ECD7]/60 border-[#F5ECD7]/20 hover:border-[#C9A84C] hover:text-[#C9A84C]',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const inCart = cartItems.find((c) => c.menuItemId === item._id);
              return (
                <div key={item._id} className="bg-white border border-[#0D1B3E]/10 flex overflow-hidden">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <Image
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                    {item.isVeg && (
                      <div className="absolute top-1 left-1 bg-green-500 w-4 h-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-2">
                        <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm tracking-wider">{item.name}</h3>
                        <p className="text-[#5A6478] text-xs mt-1 line-clamp-2">{item.description}</p>
                        <p className="font-[Cinzel] text-[#5A6478] text-[10px] mt-1 tracking-wider">~{item.preparationTime} min</p>
                      </div>
                      <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-lg flex-shrink-0">${item.price}</span>
                    </div>
                    <div className="mt-3">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item._id, inCart.quantity - 1)}
                            className="w-7 h-7 border border-[#C9A84C] text-[#C9A84C] font-bold hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors"
                          >−</button>
                          <span className="font-[Cinzel] text-[#0D1B3E] text-sm w-6 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQty(item._id, inCart.quantity + 1)}
                            className="w-7 h-7 border border-[#C9A84C] text-[#C9A84C] font-bold hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors"
                          >+</button>
                          <span className="font-[Cinzel] text-[#C9A84C] text-xs ml-1">${(item.price * inCart.quantity).toFixed(2)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            addItem({ menuItemId: item._id, name: item.name, price: item.price, image: item.image });
                            toast.success(`${item.name} added to cart`);
                          }}
                          className="font-[Cinzel] text-[10px] tracking-widest uppercase text-[#C9A84C] border border-[#C9A84C]/50 px-4 py-1.5 hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors"
                        >
                          Add to Order
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

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="bg-[#C9A84C] text-[#0D1B3E] font-[Cinzel] text-xs tracking-widest uppercase px-8 py-4 shadow-2xl flex items-center gap-3 hover:bg-[#E8C97A] transition-colors"
          >
            <span>View Order ({itemCount})</span>
            <span className="font-[Cinzel_Decorative]">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Your Order">
        <div className="space-y-3 mb-4">
          {cartItems.map((item) => (
            <div key={item.menuItemId} className="flex justify-between items-center border-b border-[#C9A84C]/10 pb-3">
              <div className="flex-1">
                <p className="font-[Cinzel] text-[#0D1B3E] text-sm">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQty(item.menuItemId, item.quantity - 1)} className="w-6 h-6 border border-[#C9A84C]/50 text-[#C9A84C] text-xs hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors">−</button>
                  <span className="font-[Cinzel] text-xs text-[#0D1B3E] w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menuItemId, item.quantity + 1)} className="w-6 h-6 border border-[#C9A84C]/50 text-[#C9A84C] text-xs hover:bg-[#C9A84C] hover:text-[#0D1B3E] transition-colors">+</button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-[Cinzel_Decorative] text-[#C9A84C]">${(item.price * item.quantity).toFixed(2)}</p>
                <button onClick={() => removeItem(item.menuItemId)} className="text-[10px] font-[Cinzel] text-[#5A6478] hover:text-red-500 mt-1">Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Order Notes</label>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={2}
            placeholder="Allergies, special requests..."
            className="w-full px-3 py-2 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none text-sm resize-none bg-white"
          />
        </div>
        <GoldDivider />
        <div className="flex justify-between items-center mb-4">
          <span className="font-[Cinzel] text-[#0D1B3E] tracking-wider uppercase text-sm">Total</span>
          <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-xl">${cartTotal.toFixed(2)}</span>
        </div>
        <Button variant="primary" loading={placing} className="w-full" onClick={handlePlaceOrder}>
          Place Order
        </Button>
      </Modal>
    </div>
  );
}
