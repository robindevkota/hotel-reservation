'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, QrCode, X,
  DollarSign, Users, Building2, Hash, AlignLeft,
  ImageIcon, ListChecks, Crown, Star, Gem, Bed,
  CheckCircle, XCircle, CalendarDays, UserPlus,
  ChevronLeft, ChevronRight, BedDouble, CalendarCheck, DoorOpen,
} from 'lucide-react';
import { A, PageHeader } from '../../_adminStyles';

const TYPE_CONFIG = [
  { value:'standard', label:'Standard', Icon:Bed,   color:'hsl(220 15% 45%)' },
  { value:'deluxe',   label:'Deluxe',   Icon:Star,  color:'hsl(210 70% 45%)' },
  { value:'suite',    label:'Suite',    Icon:Gem,   color:'hsl(270 50% 48%)' },
  { value:'royal',    label:'Royal',    Icon:Crown, color:'hsl(43 72% 55%)' },
];
const TYPE_MAP = Object.fromEntries(TYPE_CONFIG.map(t => [t.value, t]));

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  available:   { label: 'Available',   bg: 'hsl(142 50% 95%)', color: 'hsl(142 50% 30%)', dot: 'hsl(142 50% 42%)' },
  reserved:    { label: 'Reserved',    bg: 'hsl(210 80% 95%)', color: 'hsl(210 70% 30%)', dot: 'hsl(210 70% 45%)' },
  occupied:    { label: 'Occupied',    bg: 'hsl(0 60% 95%)',   color: 'hsl(0 60% 38%)',   dot: 'hsl(0 60% 50%)' },
  unavailable: { label: 'Unavailable', bg: 'hsl(30 15% 93%)',  color: 'hsl(30 10% 40%)',  dot: 'hsl(30 10% 55%)' },
};

const empty = { name:'', slug:'', type:'standard', pricePerNight:'', capacity:'2', description:'', floorNumber:'', roomNumber:'', amenities:'', images:'' };
const emptyWalkIn = { guestName:'', guestEmail:'', guestPhone:'', roomId:'', checkInDate:'', checkOutDate:'', numberOfGuests:'1', specialRequests:'' };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.13em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem', fontWeight:600 }}>{children}</label>;
}

const inputBase: React.CSSProperties = {
  width:'100%', padding:'0.65rem 0.875rem', border:`1px solid ${A.border}`,
  outline:'none', fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy,
  background:'#fff', boxSizing:'border-box', transition:'border-color 0.18s',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Availability state
  const [view, setView] = useState<'rooms' | 'availability'>('rooms');
  const [availDate, setAvailDate] = useState(todayStr());
  const [availability, setAvailability] = useState<any[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [todayAvail, setTodayAvail] = useState<any[]>([]);

  // Walk-in modal
  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ ...emptyWalkIn });
  const [walkInSaving, setWalkInSaving] = useState(false);
  const [walkInError, setWalkInError] = useState('');

  const fetchRooms = () => {
    api.get('/rooms').then(({ data }) => { setRooms(data.rooms || []); setLoading(false); }).catch(() => setLoading(false));
  };
  const fetchTodayAvail = () => {
    const t = todayStr();
    api.get('/rooms/availability', { params: { checkIn: t, checkOut: t } })
      .then(({ data }) => setTodayAvail(data.rooms || []))
      .catch(() => {});
  };
  useEffect(() => { fetchRooms(); fetchTodayAvail(); }, []);

  const fetchAvailability = (date: string) => {
    setAvailLoading(true);
    api.get('/rooms/availability', { params: { checkIn: date, checkOut: date } })
      .then(({ data }) => { setAvailability(data.rooms || []); })
      .catch(() => toast.error('Failed to load availability'))
      .finally(() => setAvailLoading(false));
  };

  useEffect(() => {
    if (view === 'availability') fetchAvailability(availDate);
  }, [view, availDate]);

  const openCreate = () => { setEditRoom(null); setForm({ ...empty }); setStep(1); setModal(true); };
  const openEdit = (room: any) => {
    setEditRoom(room);
    setForm({ ...room, pricePerNight:String(room.pricePerNight), capacity:String(room.capacity), floorNumber:String(room.floorNumber), amenities:(room.amenities||[]).join(', '), images:(room.images||[]).join(', ') });
    setStep(1); setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.pricePerNight) { toast.error('Fill required fields'); return; }
    setSaving(true);
    const payload = { ...form, pricePerNight:Number(form.pricePerNight), capacity:Number(form.capacity), floorNumber:Number(form.floorNumber), amenities:form.amenities.split(',').map(s=>s.trim()).filter(Boolean), images:form.images.split(',').map(s=>s.trim()).filter(Boolean) };
    try {
      editRoom ? await api.put(`/rooms/${editRoom._id}`, payload) : await api.post('/rooms', payload);
      toast.success(editRoom ? 'Room updated' : 'Room created');
      setModal(false); fetchRooms();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/rooms/${id}`); toast.success('Room deleted'); setDeleteConfirm(null); fetchRooms();
  };

  const handleQR = async (room: any) => {
    // Always fetch fresh room state to avoid stale isAvailable
    const { data: fresh } = await api.get(`/rooms/${room._id}/qr`);
    const freshRoom = fresh.room;

    let qrToken: string;
    if (!freshRoom.isAvailable) {
      // Occupied — use existing token, never regenerate while guest is checked in
      qrToken = freshRoom.qrToken;
    } else {
      // Available — regenerate token
      const { data } = await api.post(`/rooms/${room._id}/qr/refresh`);
      toast.success('QR regenerated');
      qrToken = data.qrToken;
    }

    // Generate QR image client-side using the browser's own origin — works on any IP/network
    const qrUrl = `${window.location.origin}/qr/${qrToken}`;
    const qrCodeUrl = await QRCode.toDataURL(qrUrl, {
      width: 300, margin: 2,
      color: { dark: '#0D1B3E', light: '#F5ECD7' },
    });
    setQrModal({ url: qrCodeUrl });
  };

  const openWalkIn = () => {
    setWalkInForm({ ...emptyWalkIn });
    setWalkInError('');
    setWalkInModal(true);
  };

  const handleWalkIn = async () => {
    if (!walkInForm.guestName || !walkInForm.guestEmail || !walkInForm.guestPhone || !walkInForm.roomId || !walkInForm.checkInDate || !walkInForm.checkOutDate) {
      setWalkInError('Please fill all required fields'); return;
    }
    setWalkInSaving(true);
    setWalkInError('');
    try {
      await api.post('/reservations/walk-in', {
        guest: { name: walkInForm.guestName, email: walkInForm.guestEmail, phone: walkInForm.guestPhone },
        room: walkInForm.roomId,
        checkInDate: walkInForm.checkInDate,
        checkOutDate: walkInForm.checkOutDate,
        numberOfGuests: Number(walkInForm.numberOfGuests),
        specialRequests: walkInForm.specialRequests,
      });
      toast.success('Walk-in reservation created!');
      setWalkInModal(false);
      fetchRooms();
      fetchTodayAvail();
      if (view === 'availability') fetchAvailability(availDate);
    } catch(e:any) {
      setWalkInError(e.response?.data?.message || 'Failed to create reservation');
    } finally {
      setWalkInSaving(false);
    }
  };

  const shiftDate = (d: number) => {
    const dt = new Date(availDate);
    dt.setDate(dt.getDate() + d);
    setAvailDate(dt.toISOString().split('T')[0]);
  };

  // Group availability by status for summary
  const availSummary = availability.reduce<Record<string,number>>((acc, r) => {
    acc[r.availabilityStatus] = (acc[r.availabilityStatus] || 0) + 1; return acc;
  }, {});

  return (
    <>
      <style>{`
        .rm-input:focus{border-color:hsl(43 72% 55%)!important;}
        .rm-card{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:box-shadow 0.3s,transform 0.3s;}
        .rm-card:hover{box-shadow:0 8px 28px -4px hsl(220 55% 18%/0.14);transform:translateY(-3px);}
        .rm-card:hover .rm-img{transform:scale(1.06);}
        .rm-img{transition:transform 0.7s ease;width:100%;height:100%;object-fit:cover;}
        .type-btn{border:2px solid transparent;padding:0.625rem 0.5rem;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:0.4rem;background:#fff;}
        .act-btn{display:inline-flex;align-items:center;gap:0.35rem;font-family:'Cinzel',serif;font-size:0.67rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.35rem 0.8rem;cursor:pointer;border:1px solid;transition:opacity 0.2s;font-weight:600;}
        .act-btn:hover{opacity:0.75;}
        .view-tab{font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.5rem 1.25rem;cursor:pointer;transition:all 0.2s;border:1px solid;display:flex;align-items:center;gap:0.4rem;}
        .avail-row:hover{background:hsl(43 72% 55%/0.04)!important;}
      `}</style>

      <div style={{ padding:'2rem 2.5rem', maxWidth:'1400px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Manage" title="Rooms" />
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button onClick={openWalkIn} style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#fff', color:A.navy, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', padding:'0.75rem 1.25rem', border:`1px solid ${A.border}`, cursor:'pointer', fontWeight:600 }}>
              <UserPlus size={14} strokeWidth={2} /> Walk-In Guest
            </button>
            <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.gradGold, color:A.navy, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', padding:'0.75rem 1.5rem', border:'none', cursor:'pointer', fontWeight:700, boxShadow:'0 4px 14px -2px hsl(43 72% 55%/0.35)' }}>
              <Plus size={15} strokeWidth={2.5} /> Add Room
            </button>
          </div>
        </div>

        {/* Stats row — today's status */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
          {[
            { key:'available', label:'Available Today', Icon:CheckCircle,  iconColor:'hsl(142 50% 42%)', bg:'hsl(142 50% 94%)', color:'hsl(142 50% 28%)', border:'hsl(142 50% 75%)', numColor:'hsl(142 50% 28%)' },
            { key:'reserved',  label:'Reserved Today',  Icon:CalendarCheck, iconColor:'hsl(210 70% 45%)', bg:'hsl(210 80% 95%)', color:'hsl(210 70% 30%)', border:'hsl(210 70% 75%)', numColor:'hsl(210 70% 35%)' },
            { key:'occupied',  label:'Occupied Now',    Icon:DoorOpen,      iconColor:'hsl(0 60% 50%)',   bg:'hsl(0 60% 96%)',   color:'hsl(0 60% 38%)',   border:'hsl(0 60% 78%)',   numColor:'hsl(0 60% 40%)' },
            { key:'total',     label:'Total Rooms',     Icon:BedDouble,     iconColor:A.gold,             bg:'#fff',             color:A.muted,            border:A.border,           numColor:A.navy },
          ].map(({ key, label, Icon, iconColor, bg, color, border, numColor }) => {
            const count = key === 'total' ? rooms.length : todayAvail.filter(r => r.availabilityStatus === key).length;
            return (
              <div key={key} style={{ background:bg, border:`1px solid ${border}`, padding:'1.1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:'2.5rem', height:'2.5rem', background:'rgba(255,255,255,0.6)', border:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} color={iconColor} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontFamily:A.cinzel, fontSize:'1.6rem', fontWeight:700, color:numColor, lineHeight:1 }}>{count}</div>
                  <div style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.1em', textTransform:'uppercase', color, marginTop:'0.25rem' }}>{label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Tabs */}
        <div style={{ display:'flex', gap:'0', marginBottom:'2rem', borderBottom:`1px solid ${A.border}` }}>
          <button className="view-tab" onClick={() => setView('rooms')}
            style={{ borderColor: view==='rooms' ? A.gold : 'transparent', color: view==='rooms' ? A.navy : A.muted, background: view==='rooms' ? 'hsl(43 72% 55%/0.06)' : 'transparent', borderBottom: view==='rooms' ? `2px solid ${A.gold}` : '2px solid transparent', marginBottom:'-1px' }}>
            <Bed size={13} strokeWidth={2} /> Room Cards
          </button>
          <button className="view-tab" onClick={() => setView('availability')}
            style={{ borderColor: view==='availability' ? A.gold : 'transparent', color: view==='availability' ? A.navy : A.muted, background: view==='availability' ? 'hsl(43 72% 55%/0.06)' : 'transparent', borderBottom: view==='availability' ? `2px solid ${A.gold}` : '2px solid transparent', marginBottom:'-1px' }}>
            <CalendarDays size={13} strokeWidth={2} /> Availability
          </button>
        </div>

        {/* ── ROOM CARDS VIEW ── */}
        {view === 'rooms' && (
          loading ? (
            <div style={{ textAlign:'center', padding:'4rem', display:'flex', justifyContent:'center' }}>
              <div style={{ width:'1.75rem', height:'1.75rem', border:`2px solid ${A.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1.5rem' }}>
              {rooms.map(room => {
                const tc = TYPE_MAP[room.type];
                return (
                  <div key={room._id} className="rm-card">
                    {/* Image */}
                    <div style={{ position:'relative', height:'13rem', overflow:'hidden' }}>
                      <Image src={room.images?.[0] || 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600'} alt={room.name} fill className="rm-img" />
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,hsl(220 55% 18%/0.7) 0%,transparent 55%)' }} />
                      {/* Type badge */}
                      <div style={{ position:'absolute', top:'0.75rem', left:'0.75rem', background:`${tc?.color || A.navy}e0`, backdropFilter:'blur(6px)', padding:'0.3rem 0.85rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        {tc && <tc.Icon size={12} color="#fff" strokeWidth={2} />}
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff', fontWeight:700 }}>{room.type}</span>
                      </div>
                      {/* Availability dot */}
                      <div style={{ position:'absolute', top:'0.75rem', right:'0.75rem', width:'0.6rem', height:'0.6rem', borderRadius:'50%', background: room.isAvailable ? 'hsl(142 50% 45%)' : 'hsl(0 60% 52%)', boxShadow:`0 0 0 3px ${room.isAvailable ? 'hsl(142 60% 85%)' : 'hsl(0 70% 85%)'}` }} />
                      {/* Price */}
                      <div style={{ position:'absolute', bottom:'0.875rem', right:'0.875rem', fontFamily:A.cinzel, fontSize:'1.2rem', fontWeight:700, color:A.gold }}>
                        ${room.pricePerNight}<span style={{ fontSize:'0.68rem', color:'rgba(245,236,215,0.6)' }}>/night</span>
                      </div>
                      {/* Name */}
                      <div style={{ position:'absolute', bottom:'0.875rem', left:'0.875rem' }}>
                        <h3 style={{ fontFamily:A.cinzel, fontSize:'1rem', color:'rgba(245,236,215,0.95)', marginBottom:'0.2rem' }}>{room.name}</h3>
                        <p style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:'rgba(245,236,215,0.65)' }}>Room #{room.roomNumber} · Floor {room.floorNumber} · {room.capacity} guests</p>
                      </div>
                    </div>

                    {/* Amenity tags */}
                    <div style={{ padding:'0.875rem 1rem', borderBottom:`1px solid ${A.border}` }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                        {room.amenities?.slice(0,4).map((a:string) => (
                          <span key={a} style={{ fontFamily:A.raleway, fontSize:'0.75rem', background:A.papyrus, color:A.muted, padding:'0.22rem 0.6rem', border:`1px solid ${A.border}` }}>{a}</span>
                        ))}
                        {room.amenities?.length > 4 && <span style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.gold, fontWeight:600 }}>+{room.amenities.length-4}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <button className="act-btn" onClick={() => openEdit(room)} style={{ color:'hsl(210 70% 35%)', borderColor:'hsl(210 70% 75%)', background:'hsl(210 80% 97%)' }}>
                        <Edit2 size={10} strokeWidth={2} /> Edit
                      </button>
                      <button className="act-btn" onClick={() => handleQR(room)} style={{ color:'hsl(43 65% 35%)', borderColor:'hsl(43 65% 70%)', background:'hsl(43 80% 97%)' }}>
                        <QrCode size={10} strokeWidth={2} /> QR
                      </button>
                      <button className="act-btn" onClick={() => setDeleteConfirm(room._id)} style={{ color:'hsl(0 60% 42%)', borderColor:'hsl(0 60% 75%)', background:'hsl(0 70% 97%)', marginLeft:'auto' }}>
                        <Trash2 size={10} strokeWidth={2} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── AVAILABILITY VIEW ── */}
        {view === 'availability' && (
          <div>
            {/* Date navigator */}
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem' }}>
              <button onClick={() => shiftDate(-1)} style={{ background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem', cursor:'pointer', display:'flex', alignItems:'center', color:A.navy }}>
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <input type="date" value={availDate} onChange={e => setAvailDate(e.target.value)}
                style={{ fontFamily:A.cinzel, fontSize:'0.82rem', letterSpacing:'0.08em', color:A.navy, border:`1px solid ${A.border}`, padding:'0.5rem 0.875rem', outline:'none', background:'#fff', cursor:'pointer' }} />
              <button onClick={() => shiftDate(1)} style={{ background:'#fff', border:`1px solid ${A.border}`, padding:'0.5rem', cursor:'pointer', display:'flex', alignItems:'center', color:A.navy }}>
                <ChevronRight size={16} strokeWidth={2} />
              </button>
              <button onClick={() => setAvailDate(todayStr())} style={{ fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.gold, border:`1px solid hsl(43 72% 55%/0.4)`, background:'hsl(43 72% 55%/0.06)', padding:'0.5rem 0.875rem', cursor:'pointer' }}>
                Today
              </button>

              {/* Summary pills */}
              <div style={{ display:'flex', gap:'0.5rem', marginLeft:'auto' }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const count = availSummary[key] || 0;
                  if (!count) return null;
                  return (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:cfg.bg, border:`1px solid ${cfg.dot}40`, padding:'0.35rem 0.75rem' }}>
                      <div style={{ width:'0.5rem', height:'0.5rem', borderRadius:'50%', background:cfg.dot }} />
                      <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', color:cfg.color, fontWeight:600 }}>{count} {cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Availability table */}
            {availLoading ? (
              <div style={{ textAlign:'center', padding:'3rem', display:'flex', justifyContent:'center' }}>
                <div style={{ width:'1.75rem', height:'1.75rem', border:`2px solid ${A.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              </div>
            ) : (
              <div style={{ background:'#fff', border:`1px solid ${A.border}`, overflow:'hidden' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr 1fr', background:A.navy, padding:'0.75rem 1.25rem', gap:'1rem' }}>
                  {['Room', 'Type', 'Floor / #', 'Status / Guest', 'Actions'].map(h => (
                    <span key={h} style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'hsl(43 72% 55% / 0.7)' }}>{h}</span>
                  ))}
                </div>

                {availability.length === 0 && (
                  <div style={{ padding:'2rem', textAlign:'center', fontFamily:A.raleway, color:A.muted, fontSize:'0.85rem' }}>No rooms found</div>
                )}

                {availability.map((room, i) => {
                  const sc = STATUS_CONFIG[room.availabilityStatus] || STATUS_CONFIG.unavailable;
                  const tc = TYPE_MAP[room.type];
                  const res = room.currentReservation;
                  return (
                    <div key={room._id} className="avail-row" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr 1fr', padding:'0.875rem 1.25rem', gap:'1rem', alignItems:'center', borderTop: i > 0 ? `1px solid ${A.border}` : 'none', background:'#fff' }}>
                      {/* Room name */}
                      <div>
                        <p style={{ fontFamily:A.cinzel, fontSize:'0.82rem', color:A.navy, fontWeight:600, marginBottom:'0.15rem' }}>{room.name}</p>
                        <p style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>${room.pricePerNight}/night · {room.capacity} guests</p>
                      </div>

                      {/* Type */}
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        {tc && <tc.Icon size={13} color={tc.color} strokeWidth={1.8} />}
                        <span style={{ fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', color:tc?.color || A.muted }}>{room.type}</span>
                      </div>

                      {/* Floor / # */}
                      <div style={{ fontFamily:A.raleway, fontSize:'0.78rem', color:A.muted }}>
                        Floor {room.floorNumber}<br />
                        <span style={{ fontSize:'0.72rem' }}>#{room.roomNumber}</span>
                      </div>

                      {/* Status */}
                      <div>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', background:sc.bg, border:`1px solid ${sc.dot}50`, padding:'0.25rem 0.625rem', marginBottom: res ? '0.4rem' : 0 }}>
                          <div style={{ width:'0.45rem', height:'0.45rem', borderRadius:'50%', background:sc.dot }} />
                          <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', color:sc.color, fontWeight:700 }}>{sc.label}</span>
                        </div>
                        {res && (
                          <p style={{ fontFamily:A.raleway, fontSize:'0.72rem', color:A.muted }}>
                            {res.guestName} · {new Date(res.checkInDate).toLocaleDateString()} – {new Date(res.checkOutDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        {room.availabilityStatus === 'available' && (
                          <button onClick={() => { setWalkInForm({ ...emptyWalkIn, roomId: room._id, checkInDate: availDate, checkOutDate: availDate }); setWalkInError(''); setWalkInModal(true); }}
                            style={{ fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.3rem 0.6rem', background:'hsl(142 50% 95%)', color:'hsl(142 50% 28%)', border:'1px solid hsl(142 50% 70%)', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                            <UserPlus size={10} strokeWidth={2} /> Walk-in
                          </button>
                        )}
                        <button onClick={() => openEdit(room)}
                          style={{ fontFamily:A.cinzel, fontSize:'0.58rem', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0.3rem 0.6rem', background:'hsl(210 80% 97%)', color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                          <Edit2 size={10} strokeWidth={2} /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Walk-In Modal ── */}
      {walkInModal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.7)', backdropFilter:'blur(6px)' }} onClick={() => setWalkInModal(false)} />
          <div style={{ position:'relative', width:'100%', maxWidth:'34rem', background:'#fff', boxShadow:'0 30px 80px hsl(220 55% 8%/0.4)', maxHeight:'92vh', overflowY:'auto' }}>
            {/* Header */}
            <div style={{ background:A.navy, padding:'1.25rem 1.75rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
              <div>
                <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.78rem', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:'0.2rem' }}>New Walk-In</p>
                <h3 style={{ fontFamily:A.cinzel, fontSize:'1.1rem', color:'rgba(245,236,215,0.92)' }}>Guest Check-In</h3>
              </div>
              <button onClick={() => setWalkInModal(false)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.4)', cursor:'pointer', padding:'0.25rem', display:'flex' }}><X size={22} /></button>
            </div>

            <div style={{ padding:'1.75rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              {/* Error */}
              {walkInError && (
                <div style={{ background:'hsl(0 60% 97%)', border:'1px solid hsl(0 60% 80%)', padding:'0.875rem 1rem', display:'flex', gap:'0.5rem', alignItems:'flex-start' }}>
                  <XCircle size={15} color="hsl(0 60% 45%)" strokeWidth={2} style={{ flexShrink:0, marginTop:'0.05rem' }} />
                  <p style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:'hsl(0 60% 38%)' }}>{walkInError}</p>
                </div>
              )}

              {/* Guest details */}
              <div>
                <p style={{ fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.muted, marginBottom:'0.875rem', borderBottom:`1px solid ${A.border}`, paddingBottom:'0.5rem' }}>Guest Information</p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                  <div>
                    <FieldLabel>Full Name *</FieldLabel>
                    <input className="rm-input" style={inputBase} value={walkInForm.guestName} onChange={e=>setWalkInForm({...walkInForm,guestName:e.target.value})} placeholder="John Smith" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
                    <div>
                      <FieldLabel>Email *</FieldLabel>
                      <input className="rm-input" style={inputBase} type="email" value={walkInForm.guestEmail} onChange={e=>setWalkInForm({...walkInForm,guestEmail:e.target.value})} placeholder="guest@email.com" />
                    </div>
                    <div>
                      <FieldLabel>Phone *</FieldLabel>
                      <input className="rm-input" style={inputBase} value={walkInForm.guestPhone} onChange={e=>setWalkInForm({...walkInForm,guestPhone:e.target.value})} placeholder="+1 555 0000" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Room & dates */}
              <div>
                <p style={{ fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', color:A.muted, marginBottom:'0.875rem', borderBottom:`1px solid ${A.border}`, paddingBottom:'0.5rem' }}>Reservation Details</p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                  <div>
                    <FieldLabel>Room *</FieldLabel>
                    <select className="rm-input" style={{...inputBase, appearance:'none'}} value={walkInForm.roomId} onChange={e=>setWalkInForm({...walkInForm,roomId:e.target.value})}>
                      <option value="">Select a room...</option>
                      {rooms.map(r => (
                        <option key={r._id} value={r._id}>{r.name} — #{r.roomNumber} · Floor {r.floorNumber} · ${r.pricePerNight}/night</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.875rem' }}>
                    <div>
                      <FieldLabel>Check-In *</FieldLabel>
                      <input className="rm-input" style={inputBase} type="date" value={walkInForm.checkInDate} onChange={e=>setWalkInForm({...walkInForm,checkInDate:e.target.value})} />
                    </div>
                    <div>
                      <FieldLabel>Check-Out *</FieldLabel>
                      <input className="rm-input" style={inputBase} type="date" value={walkInForm.checkOutDate} onChange={e=>setWalkInForm({...walkInForm,checkOutDate:e.target.value})} />
                    </div>
                    <div>
                      <FieldLabel>Guests</FieldLabel>
                      <input className="rm-input" style={inputBase} type="number" min="1" value={walkInForm.numberOfGuests} onChange={e=>setWalkInForm({...walkInForm,numberOfGuests:e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Special Requests</FieldLabel>
                    <textarea className="rm-input" style={{...inputBase,resize:'none'}} rows={2} value={walkInForm.specialRequests} onChange={e=>setWalkInForm({...walkInForm,specialRequests:e.target.value})} placeholder="Extra pillows, late check-in, etc." />
                  </div>
                </div>
              </div>

              {/* Price preview */}
              {walkInForm.roomId && walkInForm.checkInDate && walkInForm.checkOutDate && (() => {
                const room = rooms.find(r => r._id === walkInForm.roomId);
                if (!room) return null;
                const nights = Math.max(0, Math.ceil((new Date(walkInForm.checkOutDate).getTime() - new Date(walkInForm.checkInDate).getTime()) / 86400000));
                if (nights <= 0) return null;
                return (
                  <div style={{ background:A.papyrus, border:`1px solid ${A.border}`, padding:'0.875rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:A.raleway, fontSize:'0.8rem', color:A.muted }}>{nights} night{nights>1?'s':''} × ${room.pricePerNight}</span>
                    <span style={{ fontFamily:A.cinzel, fontSize:'1rem', fontWeight:700, color:A.navy }}>${(nights * room.pricePerNight).toLocaleString()}</span>
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ display:'flex', gap:'0.875rem', paddingTop:'0.25rem' }}>
                <button onClick={() => setWalkInModal(false)} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.875rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleWalkIn} disabled={walkInSaving} style={{ flex:2, background:A.gradGold, color:A.navy, fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', padding:'0.875rem', border:'none', cursor:'pointer', fontWeight:700, opacity:walkInSaving?0.6:1 }}>
                  {walkInSaving ? 'Creating...' : 'Create Walk-In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.7)', backdropFilter:'blur(6px)' }} onClick={() => setModal(false)} />

          <div style={{ position:'relative', width:'100%', maxWidth:'38rem', background:'#fff', boxShadow:'0 30px 80px hsl(220 55% 8%/0.4)', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>

            {/* Modal header */}
            <div style={{ background:A.navy, padding:'1.25rem 1.75rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
              <div>
                <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.78rem', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:'0.2rem' }}>{editRoom ? 'Update Room' : 'New Room'}</p>
                <h3 style={{ fontFamily:A.cinzel, fontSize:'1.15rem', color:'rgba(245,236,215,0.92)' }}>{editRoom ? editRoom.name : 'Add a Chamber'}</h3>
              </div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.4)', cursor:'pointer', padding:'0.25rem', display:'flex' }}><X size={22} /></button>
            </div>

            {/* Step indicator */}
            <div style={{ padding:'1.25rem 1.75rem', borderBottom:`1px solid ${A.border}`, display:'flex', alignItems:'center', gap:'0.75rem', background:A.papyrus }}>
              {[1,2].map(s => (
                <React.Fragment key={s}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <div style={{ width:'1.75rem', height:'1.75rem', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:A.cinzel, fontSize:'0.72rem', fontWeight:700, background: step >= s ? A.gradGold : '#fff', color: step >= s ? A.navy : A.muted, border: step >= s ? 'none' : `1px solid ${A.border}`, transition:'all 0.2s' }}>
                      {step > s ? '✓' : s}
                    </div>
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', color: step === s ? A.navy : A.muted }}>
                      {s === 1 ? 'Basic Info' : 'Details & Media'}
                    </span>
                  </div>
                  {s < 2 && <div style={{ flex:1, height:'1px', background: step > 1 ? A.gold : A.border }} />}
                </React.Fragment>
              ))}
            </div>

            <div style={{ padding:'1.75rem', flex:1 }}>
              {/* ── Step 1 ── */}
              {step === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                  {/* Room type */}
                  <div>
                    <FieldLabel>Room Type</FieldLabel>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.625rem' }}>
                      {TYPE_CONFIG.map(({ value, label, Icon, color }) => (
                        <button key={value} className="type-btn" onClick={() => setForm({...form, type:value})}
                          style={{ borderColor: form.type===value ? color : A.border, background: form.type===value ? `${color}12` : '#fff' }}>
                          <Icon size={20} color={form.type===value ? color : A.muted} strokeWidth={form.type===value ? 2 : 1.5} />
                          <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', color: form.type===value ? color : A.muted }}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name + Slug */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <FieldLabel>Room Name *</FieldLabel>
                      <input className="rm-input" style={inputBase} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Pharaoh's Suite" />
                    </div>
                    <div>
                      <FieldLabel>URL Slug *</FieldLabel>
                      <input className="rm-input" style={inputBase} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="pharaohs-suite" />
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ maxWidth:'14rem' }}>
                    <FieldLabel>Price per Night ($) *</FieldLabel>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><DollarSign size={14} strokeWidth={1.8} /></div>
                      <input className="rm-input" style={{...inputBase, paddingLeft:'2rem'}} type="number" value={form.pricePerNight} onChange={e=>setForm({...form,pricePerNight:e.target.value})} placeholder="450" />
                    </div>
                  </div>

                  <button onClick={() => { if(!form.name||!form.slug){toast.error('Name and slug required');return;} setStep(2); }}
                    style={{ marginTop:'0.5rem', background:A.gradGold, color:A.navy, fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', padding:'0.875rem', border:'none', cursor:'pointer', fontWeight:700 }}>
                    Continue →
                  </button>
                </div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

                  {/* Room # / Floor / Capacity */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
                    <div>
                      <FieldLabel>Room #</FieldLabel>
                      <div style={{ position:'relative' }}>
                        <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><Hash size={13} strokeWidth={1.8} /></div>
                        <input className="rm-input" style={{...inputBase,paddingLeft:'2rem'}} value={form.roomNumber} onChange={e=>setForm({...form,roomNumber:e.target.value})} placeholder="101" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Floor</FieldLabel>
                      <div style={{ position:'relative' }}>
                        <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><Building2 size={13} strokeWidth={1.8} /></div>
                        <input className="rm-input" style={{...inputBase,paddingLeft:'2rem'}} type="number" value={form.floorNumber} onChange={e=>setForm({...form,floorNumber:e.target.value})} placeholder="3" />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Capacity</FieldLabel>
                      <div style={{ position:'relative' }}>
                        <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><Users size={13} strokeWidth={1.8} /></div>
                        <input className="rm-input" style={{...inputBase,paddingLeft:'2rem'}} type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="2" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:'0.75rem', top:'0.75rem', color:A.gold }}><AlignLeft size={13} strokeWidth={1.8} /></div>
                      <textarea className="rm-input" style={{...inputBase,paddingLeft:'2rem',resize:'none'}} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the room experience..." />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <FieldLabel>Amenities (comma separated)</FieldLabel>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><ListChecks size={13} strokeWidth={1.8} /></div>
                      <input className="rm-input" style={{...inputBase,paddingLeft:'2rem'}} value={form.amenities} onChange={e=>setForm({...form,amenities:e.target.value})} placeholder="Jacuzzi, King Bed, City View, Mini Bar" />
                    </div>
                    {form.amenities && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem', marginTop:'0.5rem' }}>
                        {form.amenities.split(',').map(a=>a.trim()).filter(Boolean).map(a => (
                          <span key={a} style={{ fontFamily:A.raleway, fontSize:'0.65rem', background:A.papyrus, color:A.muted, padding:'0.18rem 0.5rem', border:`1px solid ${A.border}` }}>{a}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image URLs */}
                  <div>
                    <FieldLabel>Image URLs (comma separated)</FieldLabel>
                    <div style={{ position:'relative' }}>
                      <div style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:A.gold }}><ImageIcon size={13} strokeWidth={1.8} /></div>
                      <input className="rm-input" style={{...inputBase,paddingLeft:'2rem'}} value={form.images} onChange={e=>setForm({...form,images:e.target.value})} placeholder="https://..., https://..." />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'0.875rem', marginTop:'0.5rem' }}>
                    <button onClick={() => setStep(1)} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.875rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>
                      ← Back
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ flex:2, background:A.gradGold, color:A.navy, fontFamily:A.cinzel, fontSize:'0.68rem', letterSpacing:'0.2em', textTransform:'uppercase', padding:'0.875rem', border:'none', cursor:'pointer', fontWeight:700, opacity:saving?0.6:1 }}>
                      {saving ? 'Saving...' : editRoom ? 'Save Changes' : 'Create Room'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.7)', backdropFilter:'blur(6px)' }} onClick={() => setDeleteConfirm(null)} />
          <div style={{ position:'relative', background:'#fff', padding:'2rem', maxWidth:'22rem', width:'100%', border:`1px solid ${A.border}`, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', color:'hsl(0 60% 52%)', marginBottom:'1rem' }}><Trash2 size={32} strokeWidth={1.5} /></div>
            <h3 style={{ fontFamily:A.cinzel, fontSize:'0.9rem', color:A.navy, marginBottom:'0.5rem' }}>Delete Room?</h3>
            <p style={{ fontFamily:A.raleway, fontSize:'0.82rem', color:A.muted, marginBottom:'1.5rem' }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex:1, background:'#fff', color:A.muted, fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.75rem', border:`1px solid ${A.border}`, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex:1, background:'hsl(0 60% 48%)', color:'#fff', fontFamily:A.cinzel, fontSize:'0.62rem', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0.75rem', border:'none', cursor:'pointer', fontWeight:700 }}>
                <XCircle size={12} style={{ display:'inline',marginRight:'0.4rem' }} strokeWidth={2} />Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {qrModal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.7)', backdropFilter:'blur(6px)' }} onClick={() => setQrModal(null)} />
          <div style={{ position:'relative', background:'#fff', padding:'2.5rem', textAlign:'center', maxWidth:'20rem', width:'100%', border:`1px solid ${A.border}` }}>
            <button onClick={() => setQrModal(null)} style={{ position:'absolute', top:'0.875rem', right:'0.875rem', background:'none', border:'none', cursor:'pointer', color:A.muted }}><X size={18} /></button>
            <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.82rem', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:'0.5rem' }}>Room QR Code</p>
            <h3 style={{ fontFamily:A.cinzel, fontSize:'1rem', color:A.navy, marginBottom:'1.5rem' }}>Scan for Guest Portal</h3>
            <img src={qrModal.url} alt="Room QR" style={{ width:'11rem', height:'11rem', margin:'0 auto 1.25rem', display:'block' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', background:A.papyrus, padding:'0.625rem', border:`1px solid ${A.border}` }}>
              <CheckCircle size={13} color={A.gold} strokeWidth={2} />
              <span style={{ fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', color:A.muted }}>Print or display for guests</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
