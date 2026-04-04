'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import toast from 'react-hot-toast';

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'desserts'];

const emptyForm = { name: '', description: '', category: 'breakfast', price: '', preparationTime: '20', isVeg: false, image: '' };

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    api.get('/menu?category=all').then(({ data }) => { setItems(data.items); setLoading(false); });
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ ...emptyForm }); setModal(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ ...item, price: String(item.price), preparationTime: String(item.preparationTime) });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, price: Number(form.price), preparationTime: Number(form.preparationTime) };
    try {
      if (editItem) {
        await api.put(`/menu/${editItem._id}`, payload);
        toast.success('Updated');
      } else {
        await api.post('/menu', payload);
        toast.success('Menu item added');
      }
      setModal(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    await api.delete(`/menu/${id}`);
    toast.success('Deleted');
    fetch();
  };

  const handleToggle = async (item: any) => {
    await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
    fetch();
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Manage</p>
          <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Menu Items</h1>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Add Item</Button>
      </div>
      <GoldDivider ornament="𓌀" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : items.map((item) => (
          <div key={item._id} className={`bg-white border overflow-hidden ${item.isAvailable ? 'border-[#0D1B3E]/10' : 'border-[#0D1B3E]/5 opacity-60'}`}>
            <div className="relative h-40">
              <Image
                src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                alt={item.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-[#0D1B3E] text-[#C9A84C] font-[Cinzel] text-[9px] tracking-widest uppercase px-2 py-1">{item.category}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm flex-1 mr-2">{item.name}</h3>
                <span className="font-[Cinzel_Decorative] text-[#C9A84C]">${item.price}</span>
              </div>
              <p className="text-[#5A6478] text-xs mt-1 line-clamp-2">{item.description}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(item)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-blue-700 border border-blue-200 px-2 py-1 hover:bg-blue-50">Edit</button>
                <button onClick={() => handleToggle(item)} className={`font-[Cinzel] text-[9px] tracking-wider uppercase px-2 py-1 border ${item.isAvailable ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                  {item.isAvailable ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(item._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none text-sm resize-none bg-white" />
          </div>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price ($)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Prep Time (min)" type="number" value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value })} />
          </div>
          <Input label="Image URL (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <label className="flex items-center gap-2 font-[Cinzel] text-xs tracking-wider cursor-pointer">
            <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} />
            Vegetarian
          </label>
          <Button variant="primary" loading={saving} className="w-full" onClick={handleSave}>
            {editItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
