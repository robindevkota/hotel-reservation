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

const emptyRoom = {
  name: '', slug: '', type: 'standard', pricePerNight: '', capacity: '2',
  description: '', floorNumber: '', roomNumber: '', amenities: '', images: '',
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyRoom });
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<any>(null);

  const fetchRooms = () => {
    api.get('/rooms').then(({ data }) => { setRooms(data.rooms); setLoading(false); });
  };

  useEffect(() => { fetchRooms(); }, []);

  const openCreate = () => { setEditRoom(null); setForm({ ...emptyRoom }); setModal(true); };
  const openEdit = (room: any) => {
    setEditRoom(room);
    setForm({
      ...room,
      pricePerNight: String(room.pricePerNight),
      capacity: String(room.capacity),
      floorNumber: String(room.floorNumber),
      amenities: (room.amenities || []).join(', '),
      images: (room.images || []).join(', '),
    });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      floorNumber: Number(form.floorNumber),
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editRoom) {
        await api.put(`/rooms/${editRoom._id}`, payload);
        toast.success('Room updated');
      } else {
        await api.post('/rooms', payload);
        toast.success('Room created');
      }
      setModal(false);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    await api.delete(`/rooms/${id}`);
    toast.success('Room deleted');
    fetchRooms();
  };

  const handleRegenerateQR = async (id: string) => {
    const { data } = await api.post(`/rooms/${id}/qr/refresh`);
    toast.success('QR code regenerated');
    setQrModal({ qrCodeUrl: data.qrCodeUrl });
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Manage</p>
          <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Rooms</h1>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>+ Add Room</Button>
      </div>
      <GoldDivider ornament="𓉐" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : rooms.map((room) => (
          <div key={room._id} className="bg-white border border-[#0D1B3E]/10 overflow-hidden">
            <div className="relative h-40">
              <Image
                src={room.images?.[0] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400'}
                alt={room.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2 bg-[#0D1B3E] text-[#C9A84C] font-[Cinzel] text-[9px] tracking-widest uppercase px-2 py-1">{room.type}</div>
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${room.isAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-[Cinzel] text-[#0D1B3E] text-sm flex-1 mr-2">{room.name}</h3>
                <span className="font-[Cinzel_Decorative] text-[#C9A84C]">${room.pricePerNight}</span>
              </div>
              <p className="text-[#5A6478] text-xs">Room #{room.roomNumber} · Floor {room.floorNumber}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => openEdit(room)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-blue-700 border border-blue-200 px-2 py-1 hover:bg-blue-50">Edit</button>
                <button onClick={() => handleRegenerateQR(room._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-[#8B6914] border border-[#C9A84C]/30 px-2 py-1 hover:bg-[#C9A84C]/10">QR Code</button>
                <button onClick={() => handleDelete(room._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-red-600 border border-red-200 px-2 py-1 hover:bg-red-50">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editRoom ? 'Edit Room' : 'Add Room'} className="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} hint="url-friendly" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={['standard', 'deluxe', 'suite', 'royal'].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
            <Input label="Price/Night ($)" type="number" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <Input label="Floor" type="number" value={form.floorNumber} onChange={(e) => setForm({ ...form, floorNumber: e.target.value })} />
            <Input label="Room #" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E] block mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-[#0D1B3E]/20 focus:border-[#C9A84C] outline-none text-sm resize-none bg-white" />
          </div>
          <Input label="Amenities (comma-separated)" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          <Input label="Image URLs (comma-separated)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
          <Button variant="primary" loading={saving} className="w-full" onClick={handleSave}>
            {editRoom ? 'Save Changes' : 'Create Room'}
          </Button>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="Room QR Code">
        {qrModal?.qrCodeUrl && (
          <div className="text-center">
            <img src={qrModal.qrCodeUrl} alt="Room QR Code" className="mx-auto w-48 h-48" />
            <p className="font-[Cinzel] text-[#5A6478] text-xs mt-4 tracking-wider">Print or display for guests to scan</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
