'use client';
import React, { useEffect, useState, useRef } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import {
  Package2, AlertTriangle, AlertOctagon, Plus, Edit2, Trash2, X,
  RefreshCw, ShoppingCart, Upload, ChevronDown, Warehouse,
  UtensilsCrossed, Wine, BarChart3, ClipboardList, TrendingDown,
  FlaskConical, ClipboardCheck, LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  A, PageHeader, AdminTable, AdminRow, AdminTd,
  GoldBtn, NavyBtn, Spinner, EmptyRow, StatusPill,
} from '../../_adminStyles';

// ── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  _id: string; name: string; unit: string; stock: number;
  costPrice: number; lowStockThreshold: number; category: string; isActive: boolean;
}
interface RecipeIngredient {
  ingredient: Ingredient; qtyPerServing: number;
}
interface Recipe {
  _id: string; name: string; servingLabel: string; sellingPrice: number;
  section: string; ingredients: RecipeIngredient[]; isActive: boolean;
}
interface RecipeStat {
  recipeId: string; name: string; servingLabel: string; sellingPrice: number;
  section: string; servingsPossible: number; limitingIngredient: string | null;
  status: 'ok' | 'low' | 'out'; revenueNPR: number; cogsNPR: number; profitNPR: number;
}
interface StockLevel {
  _id: string; name: string; unit: string; stock: number;
  threshold: number; category: string; status: 'ok' | 'low' | 'out'; pct: number;
}
interface LogEntry {
  _id: string; type: string; recipeName?: string; servingsConsumed?: number;
  lines: { ingredientName: string; unit: string; delta: number }[];
  note: string; createdAt: string; performedBy?: { name: string };
}
interface VarianceIngredient {
  id: string; name: string; unit: string; category: string;
  restocked: number; sold: number; consumed: number; wastage: number;
  stocktakeVariance: number; expectedStock: number; currentStock: number;
  shrinkage: number; shrinkagePct: number; alert: boolean;
}
interface VarianceSummary {
  totalRestocked: number; totalSold: number; totalConsumed: number;
  totalWastage: number; totalShrinkage: number;
}
interface InventoryAnalytics {
  totalStockCost: number;
  totalExpectedRevenue: number;
  totalExpectedProfit: number;
  roi: number;
  bySection: { section: string; stockCost: number; expectedRevenue: number; expectedProfit: number; servings: number }[];
  topIngredientsByValue: { name: string; unit: string; stock: number; costPrice: number; stockValue: number; category: string }[];
  usageBreakdown: { sold: number; staffConsumed: number; ownerConsumed: number; wastage: number; complimentary: number };
  trend: { date: string; sold: number; consumed: number; wasted: number; gifted: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',     label: 'Overview',     Icon: BarChart3 },
  { key: 'ingredients',  label: 'Ingredients',  Icon: Warehouse },
  { key: 'recipes',      label: 'Recipes',      Icon: UtensilsCrossed },
  { key: 'logs',         label: 'Stock Log',    Icon: ClipboardList },
  { key: 'variance',     label: 'Stock Check',  Icon: TrendingDown },
  { key: 'analytics',   label: 'Analytics',    Icon: LineChartIcon },
] as const;
type Tab = typeof TABS[number]['key'];

const UNITS = ['kg','g','litre','ml','piece','packet','bottle'];
const CATEGORIES = ['kitchen','bar','general'];
const CONSUME_TYPES = ['staff_consumption','owner_consumption','wastage','complimentary'];
const CONSUME_TYPE_LABELS: Record<string, string> = {
  staff_consumption: 'Staff drink',
  owner_consumption: 'Owner drink',
  wastage:           'Spillage / waste',
  complimentary:     'Free drink / gift',
};
const WASTAGE_REASONS = ['spillage','breakage','expired','other'];
const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  ok:  { bg: 'hsl(142 50% 94%)', color: 'hsl(142 50% 28%)', dot: 'hsl(142 50% 42%)' },
  low: { bg: 'hsl(38 90% 94%)',  color: 'hsl(38 80% 35%)',  dot: 'hsl(38 80% 45%)' },
  out: { bg: 'hsl(0 60% 95%)',   color: 'hsl(0 60% 38%)',   dot: 'hsl(0 60% 50%)' },
};

const inputBase: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem', border: `1px solid ${A.border}`,
  outline: 'none', fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy,
  background: '#fff', boxSizing: 'border-box',
};
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.35rem', fontWeight: 600 }}>{children}</label>;
}
function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: s.bg, border: `1px solid ${s.dot}50`, padding: '0.2rem 0.6rem' }}>
      <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: s.color, fontWeight: 700 }}>{status}</span>
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes]         = useState<Recipe[]>([]);
  const [recipeStats, setRecipeStats] = useState<RecipeStat[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [statsLoading, setStatsLoading]   = useState(false);
  const [ingLoading, setIngLoading]       = useState(false);
  const [recLoading, setRecLoading]       = useState(false);
  const [logLoading, setLogLoading]       = useState(false);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [lowStockCount, setLowStockCount]       = useState(0);
  const [outOfStockCount, setOutOfStockCount]   = useState(0);

  // Variance data
  const [varianceData, setVarianceData]     = useState<VarianceIngredient[]>([]);
  const [varianceSummary, setVarianceSummary] = useState<VarianceSummary | null>(null);
  const [varianceLoading, setVarianceLoading] = useState(false);

  // Analytics data
  const [analyticsData, setAnalyticsData]   = useState<InventoryAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Ingredient modal
  const [ingModal, setIngModal]   = useState(false);
  const [editIng, setEditIng]     = useState<Ingredient | null>(null);
  const [ingForm, setIngForm]     = useState({ name:'', unit:'kg', stock:'0', costPrice:'', lowStockThreshold:'', category:'general' });
  const [ingSaving, setIngSaving] = useState(false);

  // Restock modal
  const [restockModal, setRestockModal] = useState<Ingredient | null>(null);
  const [restockQty, setRestockQty]     = useState('');
  const [restockNote, setRestockNote]   = useState('');
  const [restockSaving, setRestockSaving] = useState(false);

  // Recipe modal
  const [recModal, setRecModal]   = useState(false);
  const [editRec, setEditRec]     = useState<Recipe | null>(null);
  const [recForm, setRecForm]     = useState({ name:'', servingLabel:'', sellingPrice:'', section:'kitchen' });
  const [recLines, setRecLines]   = useState<{ ingredient: string; qtyPerServing: string }[]>([{ ingredient:'', qtyPerServing:'' }]);
  const [recSaving, setRecSaving] = useState(false);

  // Sell modal
  const [sellModal, setSellModal] = useState<Recipe | null>(null);
  const [sellQty, setSellQty]     = useState('1');
  const [sellSaving, setSellSaving] = useState(false);

  // Import modal
  const [importModal, setImportModal]     = useState(false);
  const [importFile, setImportFile]       = useState<File | null>(null);
  const [importSaving, setImportSaving]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteIngConfirm, setDeleteIngConfirm] = useState<string | null>(null);
  const [deleteRecConfirm, setDeleteRecConfirm] = useState<string | null>(null);

  // Consume modal
  const [consumeModal, setConsumeModal] = useState(false);
  const [consumeForm, setConsumeForm]   = useState({
    type: 'staff_consumption',
    ingredientId: '',
    qty: '',
    consumedBy: '',
    consumptionReason: '',
    guestId: '',
    note: '',
  });
  const [consumeSaving, setConsumeSaving] = useState(false);

  // Stocktake modal
  const [stocktakeModal, setStocktakeModal] = useState(false);
  const [stocktakeLines, setStocktakeLines] = useState<{ ingredientId: string; actualQty: string }[]>([]);
  const [stocktakeSaving, setStocktakeSaving] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchStats = () => {
    setStatsLoading(true);
    api.get('/inventory/stats').then(({ data }) => {
      setTotalIngredients(data.totalIngredients);
      setLowStockCount(data.lowStockCount);
      setOutOfStockCount(data.outOfStockCount);
      setRecipeStats(data.recipeStats || []);
      setStockLevels(data.stockLevels || []);
    }).catch(() => {}).finally(() => setStatsLoading(false));
  };

  const fetchIngredients = () => {
    setIngLoading(true);
    api.get('/inventory/ingredients').then(({ data }) => setIngredients(data.ingredients || [])).catch(() => {}).finally(() => setIngLoading(false));
  };

  const fetchRecipes = () => {
    setRecLoading(true);
    api.get('/inventory/recipes').then(({ data }) => setRecipes(data.recipes || [])).catch(() => {}).finally(() => setRecLoading(false));
  };

  const fetchLogs = () => {
    setLogLoading(true);
    api.get('/inventory/logs').then(({ data }) => setLogs(data.logs || [])).catch(() => {}).finally(() => setLogLoading(false));
  };

  const fetchVariance = () => {
    setVarianceLoading(true);
    api.get('/inventory/variance').then(({ data }) => {
      setVarianceData(data.ingredients || []);
      setVarianceSummary(data.summary || null);
    }).catch(() => {}).finally(() => setVarianceLoading(false));
  };

  const fetchAnalytics = () => {
    setAnalyticsLoading(true);
    api.get('/inventory/analytics').then(({ data }) => {
      setAnalyticsData(data);
    }).catch(() => {}).finally(() => setAnalyticsLoading(false));
  };

  useEffect(() => {
    fetchStats();
    fetchIngredients();
  }, []);

  useEffect(() => {
    if (tab === 'recipes' && recipes.length === 0) fetchRecipes();
    if (tab === 'logs') fetchLogs();
    if (tab === 'variance') fetchVariance();
    if (tab === 'analytics') fetchAnalytics();
  }, [tab]);

  // ── Ingredient handlers ──────────────────────────────────────────────────────

  const openCreateIng = () => {
    setEditIng(null);
    setIngForm({ name:'', unit:'kg', stock:'0', costPrice:'', lowStockThreshold:'', category:'general' });
    setIngModal(true);
  };
  const openEditIng = (ing: Ingredient) => {
    setEditIng(ing);
    setIngForm({ name: ing.name, unit: ing.unit, stock: String(ing.stock), costPrice: String(ing.costPrice), lowStockThreshold: String(ing.lowStockThreshold), category: ing.category });
    setIngModal(true);
  };
  const saveIng = async () => {
    if (!ingForm.name || !ingForm.costPrice || !ingForm.lowStockThreshold) { toast.error('Fill required fields'); return; }
    setIngSaving(true);
    const payload = { ...ingForm, stock: Number(ingForm.stock), costPrice: Number(ingForm.costPrice), lowStockThreshold: Number(ingForm.lowStockThreshold) };
    try {
      editIng ? await api.put(`/inventory/ingredients/${editIng._id}`, payload) : await api.post('/inventory/ingredients', payload);
      toast.success(editIng ? 'Ingredient updated' : 'Ingredient created');
      setIngModal(false); fetchIngredients(); fetchStats();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setIngSaving(false); }
  };
  const deleteIng = async (id: string) => {
    await api.delete(`/inventory/ingredients/${id}`);
    toast.success('Ingredient removed'); setDeleteIngConfirm(null); fetchIngredients(); fetchStats();
  };
  const doRestock = async () => {
    if (!restockQty || Number(restockQty) <= 0) { toast.error('Enter a valid quantity'); return; }
    setRestockSaving(true);
    try {
      await api.post(`/inventory/ingredients/${restockModal!._id}/restock`, { qty: Number(restockQty), note: restockNote });
      toast.success('Stock updated'); setRestockModal(null); setRestockQty(''); setRestockNote(''); fetchIngredients(); fetchStats();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setRestockSaving(false); }
  };

  // ── Recipe handlers ──────────────────────────────────────────────────────────

  const openCreateRec = () => {
    setEditRec(null);
    setRecForm({ name:'', servingLabel:'', sellingPrice:'', section:'kitchen' });
    setRecLines([{ ingredient:'', qtyPerServing:'' }]);
    setRecModal(true);
  };
  const openEditRec = (r: Recipe) => {
    setEditRec(r);
    setRecForm({ name: r.name, servingLabel: r.servingLabel, sellingPrice: String(r.sellingPrice), section: r.section });
    setRecLines(r.ingredients.map(l => ({ ingredient: l.ingredient._id, qtyPerServing: String(l.qtyPerServing) })));
    setRecModal(true);
  };
  const saveRec = async () => {
    if (!recForm.name || !recForm.sellingPrice) { toast.error('Fill required fields'); return; }
    setRecSaving(true);
    const payload = {
      ...recForm, sellingPrice: Number(recForm.sellingPrice),
      ingredients: recLines.filter(l => l.ingredient && l.qtyPerServing).map(l => ({ ingredient: l.ingredient, qtyPerServing: Number(l.qtyPerServing) })),
    };
    try {
      editRec ? await api.put(`/inventory/recipes/${editRec._id}`, payload) : await api.post('/inventory/recipes', payload);
      toast.success(editRec ? 'Recipe updated' : 'Recipe created');
      setRecModal(false); fetchRecipes(); fetchStats();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setRecSaving(false); }
  };
  const deleteRec = async (id: string) => {
    await api.delete(`/inventory/recipes/${id}`);
    toast.success('Recipe removed'); setDeleteRecConfirm(null); fetchRecipes(); fetchStats();
  };
  const doSell = async () => {
    if (!sellQty || Number(sellQty) < 1) { toast.error('Enter valid quantity'); return; }
    setSellSaving(true);
    try {
      await api.post('/inventory/sell', { recipeId: sellModal!._id, servings: Number(sellQty) });
      toast.success(`Sold ${sellQty} × ${sellModal!.name}`);
      setSellModal(null); setSellQty('1'); fetchIngredients(); fetchStats(); fetchRecipes();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSellSaving(false); }
  };

  // ── Import handler ────────────────────────────────────────────────────────────

  const doImport = async () => {
    if (!importFile) { toast.error('Select a file'); return; }
    setImportSaving(true);
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const { data } = await api.post('/inventory/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${data.ingredientsCount} ingredients, ${data.recipesCount} recipes`);
      if (data.errors?.length) toast.error(`${data.errors.length} warnings — check logs`);
      setImportModal(false); setImportFile(null); fetchIngredients(); fetchRecipes(); fetchStats();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Import failed'); }
    finally { setImportSaving(false); }
  };

  // ── Consume handler ───────────────────────────────────────────────────────────

  const openConsumeModal = () => {
    setConsumeForm({ type:'staff_consumption', ingredientId:'', qty:'', consumedBy:'', consumptionReason:'', guestId:'', note:'' });
    setConsumeModal(true);
  };
  const doConsume = async () => {
    if (!consumeForm.ingredientId) { toast.error('Select an ingredient'); return; }
    if (!consumeForm.qty || Number(consumeForm.qty) <= 0) { toast.error('Enter a valid quantity'); return; }
    setConsumeSaving(true);
    const payload: any = {
      type: consumeForm.type,
      ingredientId: consumeForm.ingredientId,
      qty: Number(consumeForm.qty),
    };
    if (consumeForm.consumedBy) payload.consumedBy = consumeForm.consumedBy;
    if (consumeForm.consumptionReason) payload.consumptionReason = consumeForm.consumptionReason;
    if (consumeForm.guestId) payload.guestId = consumeForm.guestId;
    if (consumeForm.note) payload.note = consumeForm.note;
    try {
      await api.post('/inventory/consume', payload);
      toast.success('Consumption logged');
      setConsumeModal(false); fetchIngredients(); fetchStats();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setConsumeSaving(false); }
  };

  // ── Stocktake handler ─────────────────────────────────────────────────────────

  const openStocktakeModal = () => {
    setStocktakeLines(ingredients.map(ing => ({ ingredientId: ing._id, actualQty: String(ing.stock) })));
    setStocktakeModal(true);
  };
  const doStocktake = async () => {
    const lines = stocktakeLines
      .filter(l => l.actualQty !== '')
      .map(l => ({ ingredientId: l.ingredientId, actualQty: Number(l.actualQty) }));
    if (!lines.length) { toast.error('Enter at least one count'); return; }
    setStocktakeSaving(true);
    try {
      const { data } = await api.post('/inventory/stocktake', { lines });
      toast.success(`Stock count saved — difference: ${data.totalVariance >= 0 ? '+' : ''}${data.totalVariance.toFixed(2)}`);
      setStocktakeModal(false); fetchIngredients(); fetchStats(); if (tab === 'variance') fetchVariance();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setStocktakeSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .inv-row:hover td { background: hsl(43 72% 55% / 0.03); }
        .inv-input:focus { border-color: hsl(43 72% 55%) !important; }
        .inv-tab { font-family:'Cinzel',serif; font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; padding:0.55rem 1.25rem; cursor:pointer; transition:all 0.2s; border:none; background:none; display:flex; align-items:center; gap:0.4rem; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ padding: '2rem 2.5rem', maxWidth: '1400px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <PageHeader eyebrow="Kitchen & Bar" title="Inventory" />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: A.navy, fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.7rem 1.25rem', border: `1px solid ${A.border}`, cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={14} strokeWidth={2} /> Import Excel
            </button>
            <button onClick={openConsumeModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: 'hsl(270 50% 38%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.7rem 1.25rem', border: '1px solid hsl(270 50% 75%)', cursor: 'pointer', fontWeight: 600 }}>
              <FlaskConical size={14} strokeWidth={2} /> Record Usage
            </button>
            <button onClick={openStocktakeModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: 'hsl(210 70% 35%)', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.7rem 1.25rem', border: '1px solid hsl(210 70% 75%)', cursor: 'pointer', fontWeight: 600 }}>
              <ClipboardCheck size={14} strokeWidth={2} /> Count Stock
            </button>
            {tab === 'ingredients' && (
              <button onClick={openCreateIng} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: A.gradGold, color: A.navy, fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.7rem 1.5rem', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                <Plus size={14} strokeWidth={2.5} /> Add Ingredient
              </button>
            )}
            {tab === 'recipes' && (
              <button onClick={openCreateRec} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: A.gradGold, color: A.navy, fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.7rem 1.5rem', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                <Plus size={14} strokeWidth={2.5} /> Add Recipe
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Ingredients', value: totalIngredients, Icon: Package2,     iconColor: A.gold,              bg: '#fff',                  border: A.border },
            { label: 'Low Stock Alerts',  value: lowStockCount,    Icon: AlertTriangle, iconColor: 'hsl(38 80% 45%)',   bg: 'hsl(38 90% 96%)',       border: 'hsl(38 80% 78%)' },
            { label: 'Out of Stock',      value: outOfStockCount,  Icon: AlertOctagon,  iconColor: 'hsl(0 60% 50%)',    bg: 'hsl(0 60% 97%)',        border: 'hsl(0 60% 80%)' },
          ].map(({ label, value, Icon, iconColor, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', background: `${iconColor}18`, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={iconColor} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontFamily: A.cinzel, fontSize: '1.6rem', fontWeight: 700, color: A.navy, lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.muted, marginTop: '0.25rem' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${A.border}`, marginBottom: '2rem' }}>
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} className="inv-tab" onClick={() => setTab(key)}
              style={{ color: tab === key ? A.navy : A.muted, borderBottom: tab === key ? `2px solid ${A.gold}` : '2px solid transparent', marginBottom: '-1px', fontWeight: tab === key ? 700 : 400 }}>
              <Icon size={13} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', border: `2px solid ${A.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              </div>
            ) : (
              <>
                {/* Per-recipe table */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <p style={{ fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: A.navy, marginBottom: '1rem' }}>Revenue Potential</p>
                  <AdminTable headers={['Item', 'Section', 'Servings', 'Bottleneck', 'Revenue (NPR)', 'Cost (NPR)', 'Profit (NPR)', 'Status']} minWidth={900}>
                    {recipeStats.length === 0 && <EmptyRow colSpan={8} message="No recipes yet — add recipes to see revenue potential" />}
                    {recipeStats.map(r => (
                      <AdminRow key={r.recipeId}>
                        <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.82rem', color: A.navy, fontWeight: 600 }}>{r.name}</span><br /><span style={{ fontSize: '0.72rem' }}>{r.servingLabel}</span></AdminTd>
                        <AdminTd><span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{r.section === 'bar' ? <Wine size={13} color="hsl(270 50% 48%)" /> : <UtensilsCrossed size={13} color="hsl(210 70% 45%)" />}<span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{r.section}</span></span></AdminTd>
                        <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '1rem', fontWeight: 700, color: A.navy }}>{r.servingsPossible}</span></AdminTd>
                        <AdminTd style={{ fontSize: '0.78rem' }}>{r.limitingIngredient || '—'}</AdminTd>
                        <AdminTd><span style={{ fontFamily: A.cinzel, fontWeight: 600, color: 'hsl(142 50% 30%)' }}>NPR {r.revenueNPR.toLocaleString()}</span></AdminTd>
                        <AdminTd>NPR {r.cogsNPR.toLocaleString()}</AdminTd>
                        <AdminTd><span style={{ fontFamily: A.cinzel, fontWeight: 600, color: r.profitNPR >= 0 ? 'hsl(142 50% 30%)' : 'hsl(0 60% 42%)' }}>NPR {r.profitNPR.toLocaleString()}</span></AdminTd>
                        <AdminTd><StatusBadge status={r.status} /></AdminTd>
                      </AdminRow>
                    ))}
                  </AdminTable>
                </div>

                {/* Stock level bars */}
                <div>
                  <p style={{ fontFamily: A.cinzel, fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: A.navy, marginBottom: '1rem' }}>Stock Levels</p>
                  <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem' }}>
                    {stockLevels.length === 0 && <p style={{ fontFamily: A.raleway, color: A.muted, fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No ingredients yet</p>}
                    {stockLevels.map((s, i) => (
                      <div key={s._id} style={{ marginBottom: i < stockLevels.length - 1 ? '1rem' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontFamily: A.raleway, fontSize: '0.82rem', color: A.navy, fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontFamily: A.raleway, fontSize: '0.75rem', color: A.muted }}>{s.stock} {s.unit} / threshold: {s.threshold} {s.unit}</span>
                        </div>
                        <div style={{ height: '0.5rem', background: A.papyrus, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.pct}%`, background: s.status === 'out' ? 'hsl(0 60% 50%)' : s.status === 'low' ? 'hsl(38 80% 50%)' : 'hsl(142 50% 45%)', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── INGREDIENTS TAB ──────────────────────────────────────────────── */}
        {tab === 'ingredients' && (
          <AdminTable headers={['Name', 'Category', 'Unit', 'Stock', 'Cost (NPR)', 'Threshold', 'Status', 'Actions']} minWidth={800}>
            {ingLoading && <Spinner />}
            {!ingLoading && ingredients.length === 0 && <EmptyRow colSpan={8} message="No ingredients yet" />}
            {ingredients.map(ing => {
              let status: 'ok' | 'low' | 'out' = 'ok';
              if (ing.stock === 0) status = 'out';
              else if (ing.stock <= ing.lowStockThreshold) status = 'low';
              return (
                <AdminRow key={ing._id}>
                  <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.82rem', color: A.navy, fontWeight: 600 }}>{ing.name}</span></AdminTd>
                  <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: A.muted }}>{ing.category}</span></AdminTd>
                  <AdminTd>{ing.unit}</AdminTd>
                  <AdminTd><span style={{ fontFamily: A.cinzel, fontWeight: 700, color: A.navy }}>{ing.stock}</span></AdminTd>
                  <AdminTd>NPR {ing.costPrice}</AdminTd>
                  <AdminTd>{ing.lowStockThreshold}</AdminTd>
                  <AdminTd><StatusBadge status={status} /></AdminTd>
                  <AdminTd>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => { setRestockModal(ing); setRestockQty(''); setRestockNote(''); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'hsl(142 60% 97%)', color: 'hsl(142 50% 30%)', border: '1px solid hsl(142 50% 75%)', cursor: 'pointer', fontWeight: 600 }}>
                        <RefreshCw size={10} strokeWidth={2} /> Restock
                      </button>
                      <button onClick={() => openEditIng(ing)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'hsl(210 80% 97%)', color: 'hsl(210 70% 35%)', border: '1px solid hsl(210 70% 75%)', cursor: 'pointer', fontWeight: 600 }}>
                        <Edit2 size={10} strokeWidth={2} /> Edit
                      </button>
                      <button onClick={() => setDeleteIngConfirm(ing._id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'hsl(0 70% 97%)', color: 'hsl(0 60% 42%)', border: '1px solid hsl(0 60% 75%)', cursor: 'pointer', fontWeight: 600 }}>
                        <Trash2 size={10} strokeWidth={2} /> Delete
                      </button>
                    </div>
                  </AdminTd>
                </AdminRow>
              );
            })}
          </AdminTable>
        )}

        {/* ── RECIPES TAB ──────────────────────────────────────────────────── */}
        {tab === 'recipes' && (
          <AdminTable headers={['Name', 'Section', 'Serving', 'Price (NPR)', 'Ingredients', 'Servings Now', 'Actions']} minWidth={900}>
            {recLoading && <Spinner />}
            {!recLoading && recipes.length === 0 && <EmptyRow colSpan={7} message="No recipes yet" />}
            {recipes.map(rec => {
              const stat = recipeStats.find(s => s.recipeId === rec._id);
              return (
                <AdminRow key={rec._id}>
                  <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.82rem', color: A.navy, fontWeight: 600 }}>{rec.name}</span></AdminTd>
                  <AdminTd><span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{rec.section === 'bar' ? <Wine size={12} color="hsl(270 50% 48%)" /> : <UtensilsCrossed size={12} color="hsl(210 70% 45%)" />}<span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{rec.section}</span></span></AdminTd>
                  <AdminTd style={{ fontSize: '0.78rem' }}>{rec.servingLabel}</AdminTd>
                  <AdminTd><span style={{ fontFamily: A.cinzel, fontWeight: 600 }}>NPR {rec.sellingPrice}</span></AdminTd>
                  <AdminTd style={{ fontSize: '0.75rem', maxWidth: '14rem' }}>{rec.ingredients.map(l => `${l.ingredient.name} (${l.qtyPerServing} ${l.ingredient.unit})`).join(', ')}</AdminTd>
                  <AdminTd>
                    {stat ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: A.cinzel, fontWeight: 700, fontSize: '1rem', color: A.navy }}>{stat.servingsPossible}</span>
                        <StatusBadge status={stat.status} />
                      </span>
                    ) : '—'}
                  </AdminTd>
                  <AdminTd>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => { setSellModal(rec); setSellQty('1'); }} disabled={stat?.servingsPossible === 0} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: stat?.servingsPossible === 0 ? A.papyrus : 'hsl(43 80% 97%)', color: stat?.servingsPossible === 0 ? A.muted : 'hsl(43 65% 30%)', border: `1px solid ${stat?.servingsPossible === 0 ? A.border : 'hsl(43 65% 70%)'}`, cursor: stat?.servingsPossible === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: stat?.servingsPossible === 0 ? 0.5 : 1 }}>
                        <ShoppingCart size={10} strokeWidth={2} /> Sell
                      </button>
                      <button onClick={() => openEditRec(rec)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'hsl(210 80% 97%)', color: 'hsl(210 70% 35%)', border: '1px solid hsl(210 70% 75%)', cursor: 'pointer', fontWeight: 600 }}>
                        <Edit2 size={10} strokeWidth={2} /> Edit
                      </button>
                      <button onClick={() => setDeleteRecConfirm(rec._id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'hsl(0 70% 97%)', color: 'hsl(0 60% 42%)', border: '1px solid hsl(0 60% 75%)', cursor: 'pointer', fontWeight: 600 }}>
                        <Trash2 size={10} strokeWidth={2} /> Delete
                      </button>
                    </div>
                  </AdminTd>
                </AdminRow>
              );
            })}
          </AdminTable>
        )}

        {/* ── STOCK LOG TAB ─────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <AdminTable headers={['Date / Time', 'Type', 'Description', 'Lines', 'By']} minWidth={700}>
            {logLoading && <Spinner />}
            {!logLoading && logs.length === 0 && <EmptyRow colSpan={5} message="No stock activity yet" />}
            {logs.map(log => {
              const typeColors: Record<string, { bg: string; color: string }> = {
                sale:              { bg: A.navy,             color: A.gold },
                restock:           { bg: 'hsl(142 50% 94%)', color: 'hsl(142 50% 28%)' },
                import:            { bg: 'hsl(210 80% 94%)', color: 'hsl(210 70% 30%)' },
                adjustment:        { bg: 'hsl(38 90% 94%)',  color: 'hsl(38 80% 35%)' },
                staff_consumption: { bg: 'hsl(270 50% 94%)', color: 'hsl(270 50% 32%)' },
                owner_consumption: { bg: 'hsl(300 40% 94%)', color: 'hsl(300 40% 32%)' },
                wastage:           { bg: 'hsl(0 60% 95%)',   color: 'hsl(0 60% 38%)' },
                complimentary:     { bg: 'hsl(43 80% 94%)',  color: 'hsl(43 65% 30%)' },
                stocktake:         { bg: 'hsl(195 60% 94%)', color: 'hsl(195 60% 28%)' },
              };
              const tc = typeColors[log.type] || typeColors.adjustment;
              return (
                <AdminRow key={log._id}>
                  <AdminTd style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</AdminTd>
                  <AdminTd>
                    <span style={{ background: tc.bg, color: tc.color, fontFamily: A.cinzel, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.25rem 0.65rem', fontWeight: 700 }}>{log.type.replace(/_/g, ' ')}</span>
                  </AdminTd>
                  <AdminTd style={{ fontSize: '0.8rem', maxWidth: '18rem' }}>{log.note}</AdminTd>
                  <AdminTd style={{ fontSize: '0.75rem' }}>
                    {log.lines.map((l, i) => (
                      <div key={i} style={{ color: l.delta < 0 ? 'hsl(0 60% 42%)' : 'hsl(142 50% 30%)' }}>
                        {l.delta > 0 ? '+' : ''}{l.delta} {l.unit} {l.ingredientName}
                      </div>
                    ))}
                  </AdminTd>
                  <AdminTd style={{ fontSize: '0.78rem' }}>{log.performedBy?.name || '—'}</AdminTd>
                </AdminRow>
              );
            })}
          </AdminTable>
        )}

        {/* ── VARIANCE TAB ──────────────────────────────────────────────────── */}
        {tab === 'variance' && (
          <div>
            {varianceLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', border: `2px solid ${A.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                {varianceSummary && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
                    {[
                      { label: 'Restocked',  value: varianceSummary.totalRestocked.toFixed(2),  color: 'hsl(142 50% 30%)' },
                      { label: 'Sold',       value: varianceSummary.totalSold.toFixed(2),        color: A.navy },
                      { label: 'Consumed',   value: varianceSummary.totalConsumed.toFixed(2),    color: 'hsl(270 50% 35%)' },
                      { label: 'Wastage',    value: varianceSummary.totalWastage.toFixed(2),     color: 'hsl(0 60% 42%)' },
                      { label: 'Unaccounted', value: varianceSummary.totalShrinkage.toFixed(2),  color: varianceSummary.totalShrinkage > 0 ? 'hsl(0 60% 42%)' : 'hsl(142 50% 30%)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '0.875rem 1rem' }}>
                        <div style={{ fontFamily: A.cinzel, fontSize: '1.2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                        <div style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.muted, marginTop: '0.25rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Per-ingredient variance table */}
                <AdminTable headers={['Ingredient', 'Cat.', 'Restocked', 'Sold', 'Used', 'Wasted', 'Count Diff', 'Expected', 'Actual', 'Unaccounted', 'Alert']} minWidth={1100}>
                  {varianceData.length === 0 && <EmptyRow colSpan={11} message="No variance data yet — perform a stocktake or log consumption first" />}
                  {varianceData.map(v => (
                    <AdminRow key={v.id}>
                      <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.8rem', color: A.navy, fontWeight: 600 }}>{v.name}</span></AdminTd>
                      <AdminTd><span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: A.muted }}>{v.category}</span></AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem', color: 'hsl(142 50% 30%)' }}>+{v.restocked.toFixed(2)} {v.unit}</AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem' }}>{v.sold.toFixed(2)}</AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem' }}>{v.consumed.toFixed(2)}</AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem' }}>{v.wastage.toFixed(2)}</AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem', color: v.stocktakeVariance < 0 ? 'hsl(0 60% 42%)' : 'hsl(142 50% 30%)' }}>
                        {v.stocktakeVariance >= 0 ? '+' : ''}{v.stocktakeVariance.toFixed(2)}
                      </AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem' }}>{v.expectedStock.toFixed(2)}</AdminTd>
                      <AdminTd style={{ fontSize: '0.78rem', fontWeight: 600, color: A.navy }}>{v.currentStock.toFixed(2)}</AdminTd>
                      <AdminTd>
                        <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', fontWeight: 700, color: v.shrinkage > 0 ? 'hsl(0 60% 42%)' : 'hsl(142 50% 30%)' }}>
                          {v.shrinkage.toFixed(2)} <span style={{ fontSize: '0.65rem', color: A.muted }}>({v.shrinkagePct.toFixed(1)}%)</span>
                        </span>
                      </AdminTd>
                      <AdminTd>
                        {v.alert ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'hsl(0 60% 95%)', border: '1px solid hsl(0 60% 80%)', padding: '0.2rem 0.55rem' }}>
                            <AlertTriangle size={10} color="hsl(0 60% 42%)" strokeWidth={2.5} />
                            <span style={{ fontFamily: A.cinzel, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(0 60% 38%)', fontWeight: 700 }}>High</span>
                          </span>
                        ) : (
                          <span style={{ fontFamily: A.cinzel, fontSize: '0.6rem', color: 'hsl(142 50% 35%)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OK</span>
                        )}
                      </AdminTd>
                    </AdminRow>
                  ))}
                </AdminTable>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={fetchVariance} style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.gold, background: 'none', border: `1px solid ${A.gold}50`, padding: '0.45rem 1rem', cursor: 'pointer' }}>
                    <RefreshCw size={11} strokeWidth={2} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {/* ── ANALYTICS TAB ─────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div>
            {analyticsLoading || !analyticsData ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', border: `2px solid ${A.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              </div>
            ) : (
              <>
                {/* ── 4 summary cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Stock Invested',      value: `NPR ${analyticsData.totalStockCost.toLocaleString()}`,          sub: 'Total cost of current stock',          color: A.navy,              bg: A.papyrus },
                    { label: 'Expected Revenue',    value: `NPR ${analyticsData.totalExpectedRevenue.toLocaleString()}`,    sub: 'If all stock is sold',                 color: 'hsl(142 50% 30%)',  bg: 'hsl(142 50% 96%)' },
                    { label: 'Expected Profit',     value: `NPR ${analyticsData.totalExpectedProfit.toLocaleString()}`,     sub: 'Revenue minus ingredient cost',        color: analyticsData.totalExpectedProfit >= 0 ? 'hsl(142 50% 30%)' : 'hsl(0 60% 42%)', bg: analyticsData.totalExpectedProfit >= 0 ? 'hsl(142 50% 96%)' : 'hsl(0 60% 97%)' },
                    { label: 'Return on Stock',     value: `${analyticsData.roi}%`,                                         sub: 'Profit ÷ investment × 100',            color: analyticsData.roi >= 0 ? 'hsl(43 65% 30%)' : 'hsl(0 60% 42%)', bg: 'hsl(43 80% 96%)' },
                  ].map(({ label, value, sub, color, bg }) => (
                    <div key={label} style={{ background: bg, border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontFamily: A.cinzel, fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.35rem' }}>{value}</div>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.navy, marginBottom: '0.2rem', fontWeight: 600 }}>{label}</div>
                      <div style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* ── Row: Section breakdown bar + Usage pie ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

                  {/* Section breakdown */}
                  <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem' }}>
                    <p style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, marginBottom: '1.25rem', fontWeight: 700 }}>
                      Kitchen vs Bar — Stock Cost / Revenue / Profit
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analyticsData.bySection.filter(s => s.section !== 'general')} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke={A.border} vertical={false} />
                        <XAxis dataKey="section" tick={{ fontFamily: 'Cinzel, serif', fontSize: 11, fill: A.navy }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontFamily: 'Raleway, sans-serif', fontSize: 10, fill: A.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => `NPR ${Number(v).toLocaleString()}`} contentStyle={{ fontFamily: 'Raleway, sans-serif', fontSize: 12, border: `1px solid ${A.border}`, borderRadius: 0 }} />
                        <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }} />
                        <Bar dataKey="stockCost"       name="Invested"  fill="hsl(220 55% 28%)" />
                        <Bar dataKey="expectedRevenue" name="Revenue"   fill={A.gold} />
                        <Bar dataKey="expectedProfit"  name="Profit"    fill="hsl(142 50% 45%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Usage pie */}
                  <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem' }}>
                    <p style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, marginBottom: '1.25rem', fontWeight: 700 }}>
                      Stock Usage Breakdown (All Time)
                    </p>
                    {(() => {
                      const u = analyticsData.usageBreakdown;
                      const pieData = [
                        { name: 'Sold',         value: u.sold,          color: A.gold },
                        { name: 'Staff drink',  value: u.staffConsumed, color: 'hsl(270 50% 55%)' },
                        { name: 'Owner drink',  value: u.ownerConsumed, color: 'hsl(300 40% 55%)' },
                        { name: 'Wasted',       value: u.wastage,       color: 'hsl(0 60% 55%)' },
                        { name: 'Free / gift',  value: u.complimentary, color: 'hsl(43 65% 55%)' },
                      ].filter(d => d.value > 0);
                      const total = pieData.reduce((s, d) => s + d.value, 0);
                      if (total === 0) return <p style={{ fontFamily: A.raleway, color: A.muted, fontSize: '0.82rem', textAlign: 'center', paddingTop: '3rem' }}>No usage logged yet</p>;
                      return (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} units`} contentStyle={{ fontFamily: 'Raleway, sans-serif', fontSize: 12, border: `1px solid ${A.border}`, borderRadius: 0 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* ── 30-day usage trend ── */}
                <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, marginBottom: '1.25rem', fontWeight: 700 }}>
                    Daily Usage — Last 30 Days
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analyticsData.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={A.border} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontFamily: 'Raleway, sans-serif', fontSize: 10, fill: A.muted }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fontFamily: 'Raleway, sans-serif', fontSize: 10, fill: A.muted }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontFamily: 'Raleway, sans-serif', fontSize: 12, border: `1px solid ${A.border}`, borderRadius: 0 }} />
                      <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }} />
                      <Line type="monotone" dataKey="sold"     name="Sold"          stroke={A.gold}             strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="consumed" name="Staff / Owner" stroke="hsl(270 50% 55%)"  strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="wasted"   name="Wasted"        stroke="hsl(0 60% 55%)"   strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="gifted"   name="Free / Gift"   stroke="hsl(43 65% 45%)"  strokeWidth={2} dot={false} strokeDasharray="4 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Top ingredients by stock value ── */}
                <div style={{ background: '#fff', border: `1px solid ${A.border}`, padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.navy, fontWeight: 700, margin: 0 }}>
                      Top 10 Ingredients by Stock Value
                    </p>
                    <span style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted }}>stock × cost price</span>
                  </div>
                  <div>
                    {analyticsData.topIngredientsByValue.map((ing, i) => {
                      const maxVal = analyticsData.topIngredientsByValue[0]?.stockValue || 1;
                      const pct = Math.round((ing.stockValue / maxVal) * 100);
                      return (
                        <div key={ing.name} style={{ display: 'grid', gridTemplateColumns: '1.5rem 1fr 6rem 5rem', gap: '0.75rem', alignItems: 'center', marginBottom: '0.7rem' }}>
                          <span style={{ fontFamily: A.cinzel, fontSize: '0.65rem', color: A.muted, textAlign: 'right' }}>{i + 1}</span>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontFamily: A.raleway, fontSize: '0.8rem', color: A.navy, fontWeight: 600 }}>{ing.name}</span>
                              <span style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted }}>{ing.stock} {ing.unit}</span>
                            </div>
                            <div style={{ height: '0.4rem', background: A.papyrus, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: A.gold, transition: 'width 0.4s' }} />
                            </div>
                          </div>
                          <span style={{ fontFamily: A.raleway, fontSize: '0.72rem', color: A.muted, textAlign: 'right' }}>NPR {ing.costPrice}/unit</span>
                          <span style={{ fontFamily: A.cinzel, fontSize: '0.82rem', fontWeight: 700, color: A.navy, textAlign: 'right' }}>NPR {ing.stockValue.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={fetchAnalytics} style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: A.gold, background: 'none', border: `1px solid ${A.gold}50`, padding: '0.45rem 1rem', cursor: 'pointer' }}>
                    <RefreshCw size={11} strokeWidth={2} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Ingredient Modal ─────────────────────────────────────────────────── */}
      {ingModal && (
        <Modal title={editIng ? 'Edit Ingredient' : 'New Ingredient'} onClose={() => setIngModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><FieldLabel>Name *</FieldLabel><input className="inv-input" style={inputBase} value={ingForm.name} onChange={e => setIngForm({ ...ingForm, name: e.target.value })} placeholder="e.g. Chicken Keema" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <FieldLabel>Unit *</FieldLabel>
                <SelectField value={ingForm.unit} onChange={v => setIngForm({ ...ingForm, unit: v })} options={UNITS} />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <SelectField value={ingForm.category} onChange={v => setIngForm({ ...ingForm, category: v })} options={CATEGORIES} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div><FieldLabel>Current Stock *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="0" value={ingForm.stock} onChange={e => setIngForm({ ...ingForm, stock: e.target.value })} /></div>
              <div><FieldLabel>Cost Price (NPR) *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="0" value={ingForm.costPrice} onChange={e => setIngForm({ ...ingForm, costPrice: e.target.value })} /></div>
              <div><FieldLabel>Low Alert Threshold *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="0" value={ingForm.lowStockThreshold} onChange={e => setIngForm({ ...ingForm, lowStockThreshold: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <NavyBtn onClick={() => setIngModal(false)}>Cancel</NavyBtn>
              <GoldBtn onClick={saveIng} disabled={ingSaving}>{ingSaving ? 'Saving...' : editIng ? 'Save Changes' : 'Create Ingredient'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Restock Modal ────────────────────────────────────────────────────── */}
      {restockModal && (
        <Modal title={`Restock: ${restockModal.name}`} onClose={() => setRestockModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: A.muted }}>Current stock: <strong style={{ color: A.navy }}>{restockModal.stock} {restockModal.unit}</strong></p>
            <div><FieldLabel>Quantity to Add ({restockModal.unit}) *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="0.001" step="any" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="e.g. 5" autoFocus /></div>
            <div><FieldLabel>Note (optional)</FieldLabel><input className="inv-input" style={inputBase} value={restockNote} onChange={e => setRestockNote(e.target.value)} placeholder="Supplier, batch, etc." /></div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <NavyBtn onClick={() => setRestockModal(null)}>Cancel</NavyBtn>
              <GoldBtn onClick={doRestock} disabled={restockSaving}>{restockSaving ? 'Saving...' : 'Add Stock'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Recipe Modal ─────────────────────────────────────────────────────── */}
      {recModal && (
        <Modal title={editRec ? 'Edit Recipe' : 'New Recipe'} onClose={() => setRecModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><FieldLabel>Name *</FieldLabel><input className="inv-input" style={inputBase} value={recForm.name} onChange={e => setRecForm({ ...recForm, name: e.target.value })} placeholder="e.g. Chicken Momo" /></div>
              <div><FieldLabel>Serving Label *</FieldLabel><input className="inv-input" style={inputBase} value={recForm.servingLabel} onChange={e => setRecForm({ ...recForm, servingLabel: e.target.value })} placeholder="plate of 10" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><FieldLabel>Selling Price (NPR) *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="0" value={recForm.sellingPrice} onChange={e => setRecForm({ ...recForm, sellingPrice: e.target.value })} /></div>
              <div><FieldLabel>Section</FieldLabel><SelectField value={recForm.section} onChange={v => setRecForm({ ...recForm, section: v })} options={['kitchen','bar']} /></div>
            </div>

            {/* Ingredient lines */}
            <div>
              <FieldLabel>Ingredients</FieldLabel>
              {recLines.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <select className="inv-input" style={{ ...inputBase }} value={line.ingredient} onChange={e => { const nl = [...recLines]; nl[i].ingredient = e.target.value; setRecLines(nl); }}>
                    <option value="">Select ingredient...</option>
                    {ingredients.map(ing => <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>)}
                  </select>
                  <input className="inv-input" style={inputBase} type="number" min="0" step="any" placeholder="Qty" value={line.qtyPerServing} onChange={e => { const nl = [...recLines]; nl[i].qtyPerServing = e.target.value; setRecLines(nl); }} />
                  <button onClick={() => setRecLines(recLines.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: A.muted, cursor: 'pointer', padding: '0.35rem', display: 'flex' }}><X size={16} /></button>
                </div>
              ))}
              <button onClick={() => setRecLines([...recLines, { ingredient:'', qtyPerServing:'' }])} style={{ fontFamily: A.cinzel, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: A.gold, background: 'none', border: `1px dashed ${A.gold}50`, padding: '0.4rem 0.875rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                + Add Ingredient
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <NavyBtn onClick={() => setRecModal(false)}>Cancel</NavyBtn>
              <GoldBtn onClick={saveRec} disabled={recSaving}>{recSaving ? 'Saving...' : editRec ? 'Save Changes' : 'Create Recipe'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Sell Modal ───────────────────────────────────────────────────────── */}
      {sellModal && (
        <Modal title={`Sell: ${sellModal.name}`} onClose={() => setSellModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontFamily: A.raleway, fontSize: '0.85rem', color: A.muted }}>{sellModal.servingLabel} · NPR {sellModal.sellingPrice} each</p>
            <div><FieldLabel>Number of Servings *</FieldLabel><input className="inv-input" style={inputBase} type="number" min="1" value={sellQty} onChange={e => setSellQty(e.target.value)} autoFocus /></div>
            {sellQty && Number(sellQty) > 0 && (
              <div style={{ background: A.papyrus, border: `1px solid ${A.border}`, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: A.raleway, fontSize: '0.82rem', color: A.muted }}>{sellQty} × NPR {sellModal.sellingPrice}</span>
                <span style={{ fontFamily: A.cinzel, fontWeight: 700, color: A.navy }}>NPR {(Number(sellQty) * sellModal.sellingPrice).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <NavyBtn onClick={() => setSellModal(null)}>Cancel</NavyBtn>
              <GoldBtn onClick={doSell} disabled={sellSaving}>{sellSaving ? 'Processing...' : 'Confirm Sale'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Import Modal ─────────────────────────────────────────────────────── */}
      {importModal && (
        <Modal title="Import from Excel" onClose={() => setImportModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: A.papyrus, border: `1px solid ${A.border}`, padding: '1rem', fontSize: '0.78rem', fontFamily: A.raleway, color: A.muted, lineHeight: 1.7 }}>
              <strong style={{ fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', color: A.navy }}>Expected Format</strong>
              <strong>Sheet 1 — Ingredients:</strong> Name | Unit | Stock | Cost Price | Low Alert | Category<br />
              <strong>Sheet 2 — Recipes:</strong> Dish/Drink Name | Serving Label | Selling Price | Section | Ingredient 1 | Qty 1 | Ingredient 2 | Qty 2 ...
            </div>
            <div>
              <FieldLabel>Excel File (.xlsx) *</FieldLabel>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => setImportFile(e.target.files?.[0] || null)} />
              <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '1.5rem', border: `2px dashed ${A.border}`, background: A.papyrus, cursor: 'pointer', fontFamily: A.cinzel, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: importFile ? A.navy : A.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Upload size={16} strokeWidth={1.8} />
                {importFile ? importFile.name : 'Click to select file'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <NavyBtn onClick={() => setImportModal(false)}>Cancel</NavyBtn>
              <GoldBtn onClick={doImport} disabled={importSaving || !importFile}>{importSaving ? 'Importing...' : 'Import'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Consume Modal ────────────────────────────────────────────────────── */}
      {consumeModal && (
        <Modal title="Record Usage" onClose={() => setConsumeModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <FieldLabel>Usage Type *</FieldLabel>
              <div style={{ position: 'relative' }}>
                <select className="inv-input"
                  style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', border: `1px solid ${A.border}`, outline: 'none', fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy, background: '#fff', appearance: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  value={consumeForm.type}
                  onChange={e => setConsumeForm({ ...consumeForm, type: e.target.value, consumptionReason: '' })}>
                  {CONSUME_TYPES.map(t => <option key={t} value={t}>{CONSUME_TYPE_LABELS[t]}</option>)}
                </select>
                <ChevronDown size={14} color={A.muted} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <FieldLabel>Ingredient *</FieldLabel>
              <div style={{ position: 'relative' }}>
                <select className="inv-input" style={{ ...inputBase, paddingRight: '2rem', appearance: 'none' }}
                  value={consumeForm.ingredientId} onChange={e => setConsumeForm({ ...consumeForm, ingredientId: e.target.value })}>
                  <option value="">Select ingredient...</option>
                  {ingredients.map(ing => (
                    <option key={ing._id} value={ing._id}>{ing.name} — {ing.stock} {ing.unit} in stock</option>
                  ))}
                </select>
                <ChevronDown size={14} color={A.muted} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <FieldLabel>Quantity *</FieldLabel>
                <input className="inv-input" style={inputBase} type="number" min="0.001" step="any"
                  value={consumeForm.qty} onChange={e => setConsumeForm({ ...consumeForm, qty: e.target.value })} placeholder="e.g. 60" />
              </div>
              {(consumeForm.type === 'staff_consumption' || consumeForm.type === 'owner_consumption') && (
                <div>
                  <FieldLabel>Consumed By</FieldLabel>
                  <input className="inv-input" style={inputBase}
                    value={consumeForm.consumedBy} onChange={e => setConsumeForm({ ...consumeForm, consumedBy: e.target.value })} placeholder="Name" />
                </div>
              )}
            </div>
            {consumeForm.type === 'wastage' && (
              <div>
                <FieldLabel>Wastage Reason</FieldLabel>
                <SelectField
                  value={consumeForm.consumptionReason || WASTAGE_REASONS[0]}
                  onChange={v => setConsumeForm({ ...consumeForm, consumptionReason: v })}
                  options={WASTAGE_REASONS}
                />
              </div>
            )}
            {consumeForm.type === 'complimentary' && (
              <div>
                <FieldLabel>Guest ID (optional)</FieldLabel>
                <input className="inv-input" style={inputBase}
                  value={consumeForm.guestId} onChange={e => setConsumeForm({ ...consumeForm, guestId: e.target.value })} placeholder="MongoDB ObjectId" />
              </div>
            )}
            <div>
              <FieldLabel>Note (optional)</FieldLabel>
              <input className="inv-input" style={inputBase}
                value={consumeForm.note} onChange={e => setConsumeForm({ ...consumeForm, note: e.target.value })} placeholder="Any additional details" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <NavyBtn onClick={() => setConsumeModal(false)}>Cancel</NavyBtn>
              <GoldBtn onClick={doConsume} disabled={consumeSaving}>{consumeSaving ? 'Saving...' : 'Save'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Stocktake Modal ──────────────────────────────────────────────────── */}
      {stocktakeModal && (
        <Modal title="Count Stock" onClose={() => setStocktakeModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontFamily: A.raleway, fontSize: '0.82rem', color: A.muted, margin: 0 }}>
              Enter what you actually have on the shelf for each item. Leave blank to skip.
            </p>
            <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {stocktakeLines.map((line, i) => {
                const ing = ingredients.find(x => x._id === line.ingredientId);
                if (!ing) return null;
                return (
                  <div key={line.ingredientId} style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${A.border}` }}>
                    <div>
                      <div style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.navy, fontWeight: 600 }}>{ing.name}</div>
                      <div style={{ fontFamily: A.raleway, fontSize: '0.7rem', color: A.muted }}>System: {ing.stock} {ing.unit}</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="inv-input"
                        style={{ ...inputBase, paddingRight: '2.5rem' }}
                        type="number" min="0" step="any"
                        value={line.actualQty}
                        onChange={e => {
                          const nl = [...stocktakeLines];
                          nl[i].actualQty = e.target.value;
                          setStocktakeLines(nl);
                        }}
                        placeholder="Actual qty"
                      />
                      <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontFamily: A.raleway, fontSize: '0.7rem', color: A.muted, pointerEvents: 'none' }}>{ing.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <NavyBtn onClick={() => setStocktakeModal(false)}>Cancel</NavyBtn>
              <GoldBtn onClick={doStocktake} disabled={stocktakeSaving}>{stocktakeSaving ? 'Saving...' : 'Submit Count'}</GoldBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirms ──────────────────────────────────────────────────── */}
      {deleteIngConfirm && (
        <DeleteConfirm onCancel={() => setDeleteIngConfirm(null)} onConfirm={() => deleteIng(deleteIngConfirm)} />
      )}
      {deleteRecConfirm && (
        <DeleteConfirm onCancel={() => setDeleteRecConfirm(null)} onConfirm={() => deleteRec(deleteRecConfirm)} />
      )}
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18%/0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '36rem', background: '#fff', boxShadow: '0 30px 80px hsl(220 55% 8%/0.4)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ background: A.navy, padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }}>
          <h3 style={{ fontFamily: A.cinzel, fontSize: '1rem', color: 'rgba(245,236,215,0.92)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,236,215,0.4)', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <select className="inv-input" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', border: `1px solid ${A.border}`, outline: 'none', fontFamily: A.raleway, fontSize: '0.85rem', color: A.navy, background: '#fff', appearance: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} color={A.muted} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 18%/0.7)', backdropFilter: 'blur(6px)' }} onClick={onCancel} />
      <div style={{ position: 'relative', background: '#fff', padding: '2rem', maxWidth: '22rem', width: '100%', border: `1px solid ${A.border}`, textAlign: 'center' }}>
        <Trash2 size={32} color="hsl(0 60% 52%)" strokeWidth={1.5} style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h3 style={{ fontFamily: A.cinzel, fontSize: '0.9rem', color: A.navy, marginBottom: '0.5rem' }}>Delete?</h3>
        <p style={{ fontFamily: A.raleway, fontSize: '0.82rem', color: A.muted, marginBottom: '1.5rem' }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <NavyBtn onClick={onCancel}>Cancel</NavyBtn>
          <GoldBtn onClick={onConfirm}>Delete</GoldBtn>
        </div>
      </div>
    </div>
  );
}
