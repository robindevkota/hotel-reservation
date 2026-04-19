'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight, Leaf } from 'lucide-react';
import { A, PageHeader, GoldBtn, NavyBtn, adminTableCss, Pagination, ConfirmDialog } from '../../_adminStyles';

const PAGE_SIZE = 12;

const CATEGORIES = ['breakfast','lunch','dinner','snacks','beverages','desserts'];
const empty = { name:'', description:'', category:'breakfast', price:'', preparationTime:'20', isVeg:false, image:'' };

const CAT_COLOR: Record<string,string> = {
  breakfast:'hsl(38 80% 45%)', lunch:'hsl(195 60% 38%)', dinner:'hsl(270 50% 45%)',
  snacks:'hsl(142 50% 38%)', beverages:'hsl(210 70% 42%)', desserts:'hsl(340 60% 45%)',
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({...empty});
  const [saving, setSaving] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = () => {
    api.get('/menu?all=true')
      .then(({ data }) => { setItems(data.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditItem(null); setForm({...empty}); setModal(true); };
  const openEdit   = (item: any) => { setEditItem(item); setForm({...item, price:String(item.price), preparationTime:String(item.preparationTime)}); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, price: Number(form.price), preparationTime: Number(form.preparationTime) };
    try {
      editItem ? await api.put(`/menu/${editItem._id}`, payload) : await api.post('/menu', payload);
      toast.success(editItem ? 'Updated' : 'Menu item added');
      setModal(false); fetchData();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/menu/${id}`); toast.success('Deleted'); fetchData();
  };

  const handleToggle = async (item: any) => {
    await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable }); fetchData();
  };

  const byCat   = activeCat === 'all' ? items : items.filter(i => i.category === activeCat);
  const filtered = search ? byCat.filter(i => i.name?.toLowerCase().includes(search.toLowerCase())) : byCat;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'0.625rem 0.875rem', border:`1px solid ${A.border}`,
    outline:'none', fontFamily:A.raleway, fontSize:'0.85rem', color:A.navy,
    background:'#fff', boxSizing:'border-box',
  };

  return (
    <>
      <style>{adminTableCss + `
        .m-input:focus{border-color:hsl(43 72% 55%)!important;}
        .m-card{background:#fff;border:1px solid hsl(35 25% 82%);overflow:hidden;transition:box-shadow 0.3s,transform 0.3s;}
        .m-card:hover{box-shadow:0 6px 20px -4px hsl(220 55% 18%/0.12);transform:translateY(-2px);}
        .cat-pill{font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.35rem 0.875rem;border:none;cursor:pointer;transition:all 0.2s;}
      `}</style>

      <div style={{ padding:'2rem', maxWidth:'1280px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
          <PageHeader eyebrow="Manage" title="Menu Items" />
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:A.gradGold, color:A.navy, fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.18em', textTransform:'uppercase', padding:'0.625rem 1.25rem', border:'none', cursor:'pointer', fontWeight:700 }}>
            <Plus size={14} strokeWidth={2.5} /> Add Item
          </button>
        </div>

        {/* Category filter + search */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem', alignItems:'center' }}>
          {['all',...CATEGORIES].map(c => (
            <button key={c} className="cat-pill" onClick={() => { setActiveCat(c); setPage(1); }}
              style={{ background: activeCat===c ? A.navy : '#fff', color: activeCat===c ? A.gold : A.muted, border: `1px solid ${activeCat===c ? A.navy : A.border}` }}>
              {c === 'all' ? 'All Items' : c}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
          <div style={{ position:'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position:'absolute', left:'0.65rem', top:'50%', transform:'translateY(-50%)', color:A.muted, pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search menu items…"
              style={{ padding:'0.45rem 0.75rem 0.45rem 2rem', border:`1px solid ${A.border}`, fontFamily:A.cinzel, fontSize:'0.72rem', color:A.navy, background:'#fff', outline:'none', width:'220px' }}
            />
          </div>
          <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.muted }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'4rem 0' }}>
            <div style={{ display:'inline-block', width:'1.5rem', height:'1.5rem', border:`2px solid ${A.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
          {filtered.length === 0 && (
            <p style={{ fontFamily:A.cinzel, fontSize:'0.75rem', color:A.muted, textAlign:'center', padding:'3rem 0' }}>No items match your search.</p>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.25rem' }}>
            {paginated.map(item => (
              <div key={item._id} className="m-card" style={{ opacity: item.isAvailable ? 1 : 0.6 }}>
                <div style={{ position:'relative', height:'11rem', overflow:'hidden' }}>
                  <Image src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} alt={item.name} fill style={{ objectFit:'cover' }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,hsl(220 55% 18%/0.5) 0%,transparent 60%)' }} />
                  <div style={{ position:'absolute', top:'0.75rem', left:'0.75rem', background: CAT_COLOR[item.category] || A.navy, padding:'0.2rem 0.65rem' }}>
                    <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff' }}>{item.category}</span>
                  </div>
                  {item.isVeg && (
                    <div style={{ position:'absolute', top:'0.75rem', right:'0.75rem', background:'hsl(142 50% 40%)', padding:'0.2rem 0.5rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                      <Leaf size={10} color="#fff" strokeWidth={2} />
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'hsl(220 55% 18%/0.55)' }}>
                      <span style={{ fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(245,236,215,0.8)' }}>Unavailable</span>
                    </div>
                  )}
                </div>
                <div style={{ padding:'1rem 1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem' }}>
                    <h3 style={{ fontFamily:A.cinzel, fontSize:'0.88rem', color:A.navy, flex:1, marginRight:'0.75rem' }}>{item.name}</h3>
                    <span style={{ fontFamily:A.cinzel, fontSize:'1rem', color:A.gold, fontWeight:700, whiteSpace:'nowrap' }}>${item.price}</span>
                  </div>
                  <p style={{ fontFamily:A.raleway, fontSize:'0.75rem', color:A.muted, lineHeight:1.5, marginBottom:'1rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</p>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button onClick={() => openEdit(item)} style={{ display:'flex', alignItems:'center', gap:'0.35rem', color:'hsl(210 70% 35%)', border:'1px solid hsl(210 70% 75%)', background:'hsl(210 80% 97%)', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 0.65rem', cursor:'pointer' }}>
                      <Edit2 size={10} strokeWidth={2} /> Edit
                    </button>
                    <button onClick={() => handleToggle(item)} style={{ display:'flex', alignItems:'center', gap:'0.35rem', color: item.isAvailable ? 'hsl(38 80% 35%)' : 'hsl(142 50% 30%)', border:`1px solid ${item.isAvailable ? 'hsl(38 80% 70%)' : 'hsl(142 50% 70%)'}`, background: item.isAvailable ? 'hsl(38 90% 95%)' : 'hsl(142 60% 95%)', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 0.65rem', cursor:'pointer' }}>
                      {item.isAvailable ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                      {item.isAvailable ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => setDeleteTarget(item._id)} style={{ display:'flex', alignItems:'center', gap:'0.35rem', color:'hsl(0 60% 42%)', border:'1px solid hsl(0 60% 75%)', background:'hsl(0 70% 97%)', fontFamily:A.cinzel, fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.3rem 0.65rem', cursor:'pointer', marginLeft:'auto' }}>
                      <Trash2 size={10} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <div style={{ position:'absolute', inset:0, background:'hsl(220 55% 18%/0.65)', backdropFilter:'blur(6px)' }} onClick={() => setModal(false)} />
          <div style={{ position:'relative', width:'100%', maxWidth:'32rem', background:'#fff', border:`1px solid ${A.border}`, boxShadow:'0 25px 60px hsl(220 55% 8%/0.35)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ background:A.navy, padding:'1.25rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
              <div>
                <p style={{ fontFamily:A.cormo, color:A.gold, fontSize:'0.78rem', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:'0.2rem' }}>{editItem ? 'Update' : 'Create'}</p>
                <h3 style={{ fontFamily:A.cinzel, fontSize:'1.1rem', color:'rgba(245,236,215,0.9)' }}>{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              </div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', color:'rgba(245,236,215,0.45)', cursor:'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Name</label>
                <input className="m-input" style={inputStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Royal Breakfast Platter" />
              </div>
              <div>
                <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Description</label>
                <textarea className="m-input" style={{...inputStyle,resize:'none'}} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Category</label>
                <select className="m-input" style={{...inputStyle,cursor:'pointer'}} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div>
                  <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Price ($)</label>
                  <input className="m-input" style={inputStyle} type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="25" />
                </div>
                <div>
                  <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Prep Time (min)</label>
                  <input className="m-input" style={inputStyle} type="number" value={form.preparationTime} onChange={e=>setForm({...form,preparationTime:e.target.value})} placeholder="20" />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontFamily:A.cinzel, fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:A.navy, marginBottom:'0.4rem' }}>Image URL (optional)</label>
                <input className="m-input" style={inputStyle} value={form.image} onChange={e=>setForm({...form,image:e.target.value})} placeholder="https://..." />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:'0.625rem', cursor:'pointer' }}>
                <input type="checkbox" checked={form.isVeg} onChange={e=>setForm({...form,isVeg:e.target.checked})} style={{ accentColor:A.gold, width:'1rem', height:'1rem' }} />
                <span style={{ fontFamily:A.cinzel, fontSize:'0.75rem', letterSpacing:'0.12em', textTransform:'uppercase', color:A.navy }}>Vegetarian / Vegan</span>
              </label>
              <div style={{ display:'flex', gap:'0.75rem', paddingTop:'0.5rem' }}>
                <NavyBtn onClick={() => setModal(false)}>Cancel</NavyBtn>
                <GoldBtn onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}</GoldBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteTarget) { handleDelete(deleteTarget); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
