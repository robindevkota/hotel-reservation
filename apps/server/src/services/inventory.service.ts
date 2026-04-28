import mongoose from 'mongoose';
import Ingredient, { IIngredient } from '../models/Ingredient';
import Recipe, { IRecipe } from '../models/Recipe';
import MenuItem from '../models/MenuItem';
import StockLog from '../models/StockLog';
import { AppError } from '../middleware/errorHandler';
import { emitNotification } from './socket.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ServingsResult {
  servingsPossible: number;
  limitingIngredient: string | null;
  status: 'ok' | 'low' | 'out';
  revenueNPR: number;
  cogsNPR: number;
  profitNPR: number;
}

export interface RecipeStats extends ServingsResult {
  recipeId: string;
  name: string;
  servingLabel: string;
  sellingPrice: number;
  section: string;
}

export interface InventoryStats {
  totalIngredients: number;
  lowStockCount: number;
  outOfStockCount: number;
  recipeStats: RecipeStats[];
  stockLevels: {
    _id: string;
    name: string;
    unit: string;
    stock: number;
    threshold: number;
    category: string;
    status: 'ok' | 'low' | 'out';
    pct: number;
  }[];
}

// ── Core: compute servings for one recipe given a Map of stock ───────────────

export function computeServings(
  recipe: IRecipe & { ingredients: { ingredient: IIngredient; qtyPerServing: number }[] },
  ingredientMap: Map<string, IIngredient>
): ServingsResult {
  if (!recipe.ingredients.length) {
    return { servingsPossible: 0, limitingIngredient: null, status: 'out', revenueNPR: 0, cogsNPR: 0, profitNPR: 0 };
  }

  let minServings = Infinity;
  let limitingIngredient: string | null = null;
  let totalCogs = 0;

  for (const line of recipe.ingredients) {
    const ing = ingredientMap.get(String(line.ingredient._id ?? line.ingredient));
    if (!ing) continue;
    const possible = line.qtyPerServing > 0 ? Math.floor(ing.stock / line.qtyPerServing) : Infinity;
    if (possible < minServings) {
      minServings = possible;
      limitingIngredient = ing.name;
    }
    totalCogs += line.qtyPerServing * ing.costPrice;
  }

  const servingsPossible = minServings === Infinity ? 0 : minServings;
  const revenueNPR = servingsPossible * recipe.sellingPrice;
  const cogsNPR = parseFloat((servingsPossible * totalCogs).toFixed(2));
  const profitNPR = parseFloat((revenueNPR - cogsNPR).toFixed(2));

  let status: 'ok' | 'low' | 'out' = 'ok';
  if (servingsPossible === 0) status = 'out';
  else if (servingsPossible <= 5) status = 'low';

  return { servingsPossible, limitingIngredient, status, revenueNPR, cogsNPR, profitNPR };
}

// ── Get full inventory stats ─────────────────────────────────────────────────

export async function getInventoryStats(): Promise<InventoryStats> {
  const [ingredients, recipes] = await Promise.all([
    Ingredient.find({ isActive: true }).lean(),
    Recipe.find({ isActive: true }).populate('ingredients.ingredient').lean(),
  ]);

  const ingredientMap = new Map<string, IIngredient>(
    ingredients.map(i => [String(i._id), i as unknown as IIngredient])
  );

  const lowStockCount = ingredients.filter(i => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
  const outOfStockCount = ingredients.filter(i => i.stock === 0).length;

  const recipeStats: RecipeStats[] = (recipes as any[]).map(recipe => {
    const result = computeServings(recipe, ingredientMap);
    return {
      recipeId: String(recipe._id),
      name: recipe.name,
      servingLabel: recipe.servingLabel,
      sellingPrice: recipe.sellingPrice,
      section: recipe.section,
      ...result,
    };
  });

  const stockLevels = ingredients.map(i => {
    let status: 'ok' | 'low' | 'out' = 'ok';
    if (i.stock === 0) status = 'out';
    else if (i.stock <= i.lowStockThreshold) status = 'low';
    const maxBar = i.lowStockThreshold * 3 || 1;
    const pct = Math.min(100, Math.round((i.stock / maxBar) * 100));
    return {
      _id: String(i._id),
      name: i.name,
      unit: i.unit,
      stock: i.stock,
      threshold: i.lowStockThreshold,
      category: i.category,
      status,
      pct,
    };
  });

  return {
    totalIngredients: ingredients.length,
    lowStockCount,
    outOfStockCount,
    recipeStats,
    stockLevels,
  };
}

// ── Execute a sale (atomic, never go below zero) ─────────────────────────────

export async function executeSell(
  recipeId: string,
  servings: number,
  userId?: string
): Promise<void> {
  const recipe = await Recipe.findById(recipeId).populate('ingredients.ingredient');
  if (!recipe) throw new AppError('Recipe not found', 404);
  if (!recipe.isActive) throw new AppError('Recipe is not active', 400);

  const ingredientMap = new Map<string, IIngredient>();
  for (const line of recipe.ingredients as any[]) {
    ingredientMap.set(String(line.ingredient._id), line.ingredient);
  }

  // Check stock is sufficient
  for (const line of recipe.ingredients as any[]) {
    const ing = ingredientMap.get(String(line.ingredient._id));
    if (!ing) throw new AppError(`Ingredient not found`, 404);
    const possible = line.qtyPerServing > 0 ? Math.floor(ing.stock / line.qtyPerServing) : Infinity;
    if (servings > possible) {
      throw new AppError(
        `Not enough stock for "${ing.name}". Can make ${possible} serving(s), requested ${servings}.`,
        400
      );
    }
  }

  // Deduct atomically
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const logLines = [];
    for (const line of recipe.ingredients as any[]) {
      const ing = line.ingredient;
      const delta = line.qtyPerServing * servings;
      const newStock = Math.max(0, ing.stock - delta);
      await Ingredient.findByIdAndUpdate(ing._id, { stock: newStock }, { session });
      logLines.push({
        ingredient: ing._id,
        ingredientName: ing.name,
        unit: ing.unit,
        delta: -delta,
      });
    }

    await StockLog.create([{
      type: 'sale',
      performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      recipe: recipe._id,
      recipeName: recipe.name,
      servingsConsumed: servings,
      lines: logLines,
      note: `Sold ${servings} × ${recipe.name} (${recipe.servingLabel})`,
    }], { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ── Execute a consumption (staff / owner / wastage / complimentary) ──────────

export async function executeConsume(opts: {
  type: 'staff_consumption' | 'owner_consumption' | 'wastage' | 'complimentary';
  ingredientId: string;
  qty: number;
  consumedBy?: string;
  consumptionReason?: string;
  guestId?: string;
  note?: string;
  userId?: string;
}): Promise<void> {
  const { type, ingredientId, qty, consumedBy, consumptionReason, guestId, note, userId } = opts;

  const ingredient = await Ingredient.findById(ingredientId);
  if (!ingredient) throw new AppError('Ingredient not found', 404);
  if (!ingredient.isActive) throw new AppError('Ingredient is inactive', 400);
  if (qty <= 0) throw new AppError('qty must be positive', 400);
  if (qty > ingredient.stock) {
    throw new AppError(
      `Not enough stock. Available: ${ingredient.stock} ${ingredient.unit}, requested: ${qty}`,
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newStock = parseFloat((ingredient.stock - qty).toFixed(4));
    await Ingredient.findByIdAndUpdate(ingredient._id, { stock: newStock }, { session });

    await StockLog.create([{
      type,
      performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      lines: [{ ingredient: ingredient._id, ingredientName: ingredient.name, unit: ingredient.unit, delta: -qty }],
      consumedBy: consumedBy || undefined,
      consumptionReason: consumptionReason || undefined,
      guestId: guestId ? new mongoose.Types.ObjectId(guestId) : undefined,
      note: note || `${type.replace('_', ' ')}: ${qty} ${ingredient.unit} of ${ingredient.name}${consumedBy ? ` by ${consumedBy}` : ''}`,
    }], { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ── Execute a recipe-level consumption (whole dish / drink consumed by staff/owner) ─

export async function executeConsumeDish(opts: {
  type: 'staff_consumption' | 'owner_consumption' | 'wastage' | 'complimentary';
  recipeId: string;
  servings: number;
  consumedBy?: string;
  consumptionReason?: string;
  note?: string;
  userId?: string;
}): Promise<void> {
  const { type, recipeId, servings, consumedBy, consumptionReason, note, userId } = opts;

  if (servings <= 0) throw new AppError('servings must be positive', 400);

  const recipe = await Recipe.findById(recipeId).populate('ingredients.ingredient');
  if (!recipe) throw new AppError('Recipe not found', 404);
  if (!recipe.isActive) throw new AppError('Recipe is not active', 400);

  // Check stock sufficiency first
  for (const line of recipe.ingredients as any[]) {
    const ing = line.ingredient as IIngredient & { _id: mongoose.Types.ObjectId };
    const needed = parseFloat((line.qtyPerServing * servings).toFixed(4));
    if (needed > ing.stock) {
      throw new AppError(
        `Not enough "${ing.name}". Have ${ing.stock} ${ing.unit}, need ${needed} ${ing.unit}.`,
        400
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const logLines: { ingredient: mongoose.Types.ObjectId; ingredientName: string; unit: string; delta: number }[] = [];

    for (const line of recipe.ingredients as any[]) {
      const ing = line.ingredient as IIngredient & { _id: mongoose.Types.ObjectId };
      const delta = parseFloat((line.qtyPerServing * servings).toFixed(4));
      const newStock = parseFloat((ing.stock - delta).toFixed(4));
      await Ingredient.findByIdAndUpdate(ing._id, { stock: newStock }, { session });
      logLines.push({ ingredient: ing._id, ingredientName: ing.name, unit: ing.unit, delta: -delta });
    }

    await StockLog.create([{
      type,
      performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      recipe: recipe._id,
      recipeName: recipe.name,
      servingsConsumed: servings,
      lines: logLines,
      consumedBy: consumedBy || undefined,
      consumptionReason: consumptionReason || undefined,
      note: note || `${type.replace('_', ' ')}: ${servings} × ${recipe.name}${consumedBy ? ` by ${consumedBy}` : ''}`,
    }], { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ── Execute a stocktake (physical count → reconcile variance) ────────────────

export async function executeStocktake(
  lines: { ingredientId: string; actualQty: number }[],
  userId?: string
): Promise<{ totalVariance: number; lines: { name: string; expected: number; actual: number; variance: number; unit: string }[] }> {
  if (!lines.length) throw new AppError('At least one ingredient count required', 400);

  const results: { name: string; expected: number; actual: number; variance: number; unit: string }[] = [];
  let totalVariance = 0;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const line of lines) {
      const ingredient = await Ingredient.findById(line.ingredientId).session(session);
      if (!ingredient) throw new AppError(`Ingredient ${line.ingredientId} not found`, 404);
      if (line.actualQty < 0) throw new AppError(`Actual qty cannot be negative for ${ingredient.name}`, 400);

      const expected = ingredient.stock;
      const actual = parseFloat(line.actualQty.toFixed(4));
      const variance = parseFloat((actual - expected).toFixed(4)); // positive = surplus, negative = deficit

      await Ingredient.findByIdAndUpdate(ingredient._id, { stock: actual }, { session });

      await StockLog.create([{
        type: 'stocktake',
        performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        lines: [{ ingredient: ingredient._id, ingredientName: ingredient.name, unit: ingredient.unit, delta: variance }],
        variance,
        note: `Stocktake: ${ingredient.name} — expected ${expected}, actual ${actual}, variance ${variance > 0 ? '+' : ''}${variance} ${ingredient.unit}`,
      }], { session });

      results.push({ name: ingredient.name, expected, actual, variance, unit: ingredient.unit });
      totalVariance += variance;
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  return { totalVariance: parseFloat(totalVariance.toFixed(4)), lines: results };
}

// ── Variance report ───────────────────────────────────────────────────────────

export async function getVarianceReport(since?: Date, until?: Date): Promise<{
  ingredients: {
    id: string; name: string; unit: string; category: string;
    restocked: number; sold: number; consumed: number; wastage: number;
    stocktakeVariance: number; expectedStock: number; currentStock: number;
    shrinkage: number; shrinkagePct: number; alert: boolean;
  }[];
  summary: { totalRestocked: number; totalSold: number; totalConsumed: number; totalWastage: number; totalShrinkage: number };
}> {
  const dateFilter: any = {};
  if (since) dateFilter.createdAt = { $gte: since };
  if (until) dateFilter.createdAt = { ...(dateFilter.createdAt ?? {}), $lte: until };

  // When until is in the past, fetch post-window logs to reconstruct stock-at-period-end
  const afterUntilFilter: any = until ? { createdAt: { $gt: until } } : null;

  const [ingredients, logs, afterLogs] = await Promise.all([
    Ingredient.find({ isActive: true }).lean(),
    StockLog.find(dateFilter).lean(),
    afterUntilFilter ? StockLog.find(afterUntilFilter).lean() : Promise.resolve([] as any[]),
  ]);

  // Build per-ingredient net change AFTER the until window (to reconstruct period-end stock)
  const afterNetMap = new Map<string, number>();
  if (afterLogs.length) {
    for (const log of afterLogs) {
      for (const line of log.lines) {
        const id = String(line.ingredient);
        const prev = afterNetMap.get(id) ?? 0;
        if (log.type === 'restock' || log.type === 'import' || log.type === 'petty_cash_purchase') {
          afterNetMap.set(id, prev + line.delta);
        } else {
          // sales, consumption, wastage, stocktake — delta is negative for outflows
          afterNetMap.set(id, prev + line.delta);
        }
      }
    }
  }

  const report = ingredients.map(ing => {
    const id = String(ing._id);
    let restocked = 0, sold = 0, consumed = 0, wastage = 0, stocktakeVariance = 0;

    for (const log of logs) {
      for (const line of log.lines) {
        if (String(line.ingredient) !== id) continue;
        if (log.type === 'restock' || log.type === 'import' || log.type === 'petty_cash_purchase') restocked += line.delta;
        else if (log.type === 'sale') sold += Math.abs(line.delta);
        else if (log.type === 'staff_consumption' || log.type === 'owner_consumption' || log.type === 'complimentary') consumed += Math.abs(line.delta);
        else if (log.type === 'wastage') wastage += Math.abs(line.delta);
        else if (log.type === 'stocktake') stocktakeVariance += line.delta;
      }
    }

    // When until is specified, reconstruct what stock was at period end:
    // stockAtPeriodEnd = currentStock - netAfterUntil
    // (if things were added after the window, subtract them; if removed, add them back)
    const afterNet = afterNetMap.get(id) ?? 0;
    const stockAtPeriodEnd = until
      ? Math.max(0, ing.stock - afterNet)
      : ing.stock;

    const accounted = sold + consumed + wastage;
    const netIn = restocked + Math.max(0, stocktakeVariance);
    const shrinkage = parseFloat(Math.max(0, netIn - accounted - stockAtPeriodEnd).toFixed(4));
    const shrinkagePct = netIn > 0 ? parseFloat(((shrinkage / netIn) * 100).toFixed(1)) : 0;

    return {
      id, name: ing.name, unit: ing.unit, category: ing.category,
      restocked: parseFloat(restocked.toFixed(4)),
      sold: parseFloat(sold.toFixed(4)),
      consumed: parseFloat(consumed.toFixed(4)),
      wastage: parseFloat(wastage.toFixed(4)),
      stocktakeVariance: parseFloat(stocktakeVariance.toFixed(4)),
      expectedStock: ing.stock,
      currentStock: ing.stock,
      shrinkage,
      shrinkagePct,
      alert: shrinkagePct > 5,
    };
  });

  const summary = {
    totalRestocked: parseFloat(report.reduce((s, r) => s + r.restocked, 0).toFixed(4)),
    totalSold: parseFloat(report.reduce((s, r) => s + r.sold, 0).toFixed(4)),
    totalConsumed: parseFloat(report.reduce((s, r) => s + r.consumed, 0).toFixed(4)),
    totalWastage: parseFloat(report.reduce((s, r) => s + r.wastage, 0).toFixed(4)),
    totalShrinkage: parseFloat(report.reduce((s, r) => s + r.shrinkage, 0).toFixed(4)),
  };

  return { ingredients: report, summary };
}

// ── Inventory analytics ───────────────────────────────────────────────────────

export async function getInventoryAnalytics(): Promise<{
  // Stock investment summary
  totalStockCost: number;          // what you paid for everything currently in stock
  totalExpectedRevenue: number;    // if you sell every possible serving
  totalExpectedProfit: number;     // revenue − cost
  roi: number;                     // profit / cost × 100

  // By section
  bySection: {
    section: string;
    stockCost: number;
    expectedRevenue: number;
    expectedProfit: number;
    servings: number;
  }[];

  // Top ingredients by stock value (cost × stock)
  topIngredientsByValue: {
    name: string; unit: string; stock: number; costPrice: number; stockValue: number; category: string;
  }[];

  // Usage breakdown from logs (all time)
  usageBreakdown: {
    sold: number; staffConsumed: number; ownerConsumed: number;
    wastage: number; complimentary: number;
  };

  // Petty cash operational expenses (all time)
  operationalExpenses: {
    totalCash: number;
    count: number;
    byCategory: { category: string; totalCash: number; count: number }[];
    recent: { date: string; itemName: string; cashAmount: number; purchasedBy: string; vendor?: string; expenseCategory?: string }[];
  };

  // Sold vs consumed trend — last 30 days, grouped by day
  trend: { date: string; sold: number; consumed: number; wasted: number }[];
}> {
  const [ingredients, recipes, logs] = await Promise.all([
    Ingredient.find({ isActive: true }).lean(),
    Recipe.find({ isActive: true }).populate('ingredients.ingredient').lean(),
    StockLog.find({}).lean(),
  ]);

  const ingredientMap = new Map(ingredients.map(i => [String(i._id), i]));

  // ── Stock investment: cost × current stock per ingredient ──────────────────
  const totalStockCost = parseFloat(
    ingredients.reduce((sum, i) => sum + i.stock * i.costPrice, 0).toFixed(2)
  );

  // ── Expected revenue/profit from current stock ────────────────────────────
  const sectionMap: Record<string, { stockCost: number; expectedRevenue: number; expectedProfit: number; servings: number }> = {};

  let totalExpectedRevenue = 0;
  let totalExpectedProfit = 0;

  for (const recipe of recipes as any[]) {
    const result = computeServings(recipe, ingredientMap as any);
    const section = recipe.section || 'other';
    if (!sectionMap[section]) sectionMap[section] = { stockCost: 0, expectedRevenue: 0, expectedProfit: 0, servings: 0 };
    sectionMap[section].expectedRevenue  += result.revenueNPR;
    sectionMap[section].expectedProfit   += result.profitNPR;
    sectionMap[section].servings         += result.servingsPossible;
    totalExpectedRevenue += result.revenueNPR;
    totalExpectedProfit  += result.profitNPR;
  }

  // Distribute stock cost by section proportionally via ingredient category
  for (const ing of ingredients) {
    const cat = ing.category === 'kitchen' ? 'kitchen' : ing.category === 'bar' ? 'bar' : 'general';
    if (!sectionMap[cat]) sectionMap[cat] = { stockCost: 0, expectedRevenue: 0, expectedProfit: 0, servings: 0 };
    sectionMap[cat].stockCost += parseFloat((ing.stock * ing.costPrice).toFixed(2));
  }

  const bySection = Object.entries(sectionMap).map(([section, v]) => ({ section, ...v }));

  const roi = totalStockCost > 0
    ? parseFloat(((totalExpectedProfit / totalStockCost) * 100).toFixed(1))
    : 0;

  // ── Top ingredients by stock value ────────────────────────────────────────
  const topIngredientsByValue = ingredients
    .map(i => ({ name: i.name, unit: i.unit, stock: i.stock, costPrice: i.costPrice, stockValue: parseFloat((i.stock * i.costPrice).toFixed(2)), category: i.category }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 10);

  // ── Usage breakdown from all logs ─────────────────────────────────────────
  const usageBreakdown = { sold: 0, staffConsumed: 0, ownerConsumed: 0, wastage: 0, complimentary: 0 };
  for (const log of logs) {
    const qty = log.lines.reduce((s, l) => s + Math.abs(l.delta), 0);
    if (log.type === 'sale')              usageBreakdown.sold           += qty;
    if (log.type === 'staff_consumption') usageBreakdown.staffConsumed  += qty;
    if (log.type === 'owner_consumption') usageBreakdown.ownerConsumed  += qty;
    if (log.type === 'wastage')           usageBreakdown.wastage        += qty;
    if (log.type === 'complimentary')     usageBreakdown.complimentary  += qty;
  }
  usageBreakdown.sold           = parseFloat(usageBreakdown.sold.toFixed(2));
  usageBreakdown.staffConsumed  = parseFloat(usageBreakdown.staffConsumed.toFixed(2));
  usageBreakdown.ownerConsumed  = parseFloat(usageBreakdown.ownerConsumed.toFixed(2));
  usageBreakdown.wastage        = parseFloat(usageBreakdown.wastage.toFixed(2));
  usageBreakdown.complimentary  = parseFloat(usageBreakdown.complimentary.toFixed(2));

  // ── Daily trend — last 30 days ────────────────────────────────────────────
  const since30 = new Date(); since30.setDate(since30.getDate() - 29);
  const trendMap: Record<string, { sold: number; consumed: number; wasted: number; gifted: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30); d.setDate(since30.getDate() + i);
    trendMap[d.toISOString().split('T')[0]] = { sold: 0, consumed: 0, wasted: 0, gifted: 0 };
  }
  for (const log of logs) {
    const day = new Date(log.createdAt).toISOString().split('T')[0];
    if (!trendMap[day]) continue;
    const qty = log.lines.reduce((s, l) => s + Math.abs(l.delta), 0);
    if (log.type === 'sale') trendMap[day].sold += qty;
    else if (log.type === 'staff_consumption' || log.type === 'owner_consumption') trendMap[day].consumed += qty;
    else if (log.type === 'wastage') trendMap[day].wasted += qty;
    else if (log.type === 'complimentary') trendMap[day].gifted += qty;
  }
  const trend = Object.entries(trendMap).map(([date, v]) => ({
    date: date.slice(5), // MM-DD
    sold:     parseFloat(v.sold.toFixed(2)),
    consumed: parseFloat(v.consumed.toFixed(2)),
    wasted:   parseFloat(v.wasted.toFixed(2)),
    gifted:   parseFloat(v.gifted.toFixed(2)),
  }));

  // ── Petty cash operational expenses ──────────────────────────────────────
  const pettyCashLogs = logs.filter(l => l.type === 'petty_cash_purchase');
  const pettyCashTotal = parseFloat(pettyCashLogs.reduce((s, l) => s + ((l as any).cashAmount || 0), 0).toFixed(2));

  // Group by ingredient category
  const pettyCatMap: Record<string, { totalCash: number; count: number }> = {};
  for (const log of pettyCashLogs) {
    let cat: string;
    if ((log as any).expenseCategory) {
      cat = (log as any).expenseCategory;
    } else {
      const ingId = log.lines[0]?.ingredient ? String(log.lines[0].ingredient) : '';
      cat = ingredientMap.get(ingId)?.category ?? 'general';
    }
    if (!pettyCatMap[cat]) pettyCatMap[cat] = { totalCash: 0, count: 0 };
    pettyCatMap[cat].totalCash = parseFloat((pettyCatMap[cat].totalCash + ((log as any).cashAmount || 0)).toFixed(2));
    pettyCatMap[cat].count++;
  }
  const byCategoryPetty = Object.entries(pettyCatMap).map(([category, v]) => ({ category, ...v }));

  const recentPetty = pettyCashLogs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map(l => ({
      date: new Date(l.createdAt).toISOString().split('T')[0],
      itemName: (l as any).itemName || l.lines[0]?.ingredientName || '',
      cashAmount: (l as any).cashAmount || 0,
      purchasedBy: (l as any).purchasedBy || '',
      vendor: (l as any).vendor,
      expenseCategory: (l as any).expenseCategory || (l.lines[0]?.ingredient ? 'ingredient' : 'general'),
    }));

  const operationalExpenses = {
    totalCash: pettyCashTotal,
    count: pettyCashLogs.length,
    byCategory: byCategoryPetty,
    recent: recentPetty,
  };

  return {
    totalStockCost,
    totalExpectedRevenue: parseFloat(totalExpectedRevenue.toFixed(2)),
    totalExpectedProfit: parseFloat(totalExpectedProfit.toFixed(2)),
    roi,
    bySection,
    topIngredientsByValue,
    usageBreakdown,
    operationalExpenses,
    trend,
  };
}

// ── Petty cash purchase (restock item paid from front-desk cash) ─────────────
// Supports two modes:
//   ingredient mode: ingredientId provided → deducts stock, logs with ingredient line
//   custom mode:     itemName + expenseCategory provided → no stock change, expense-only log

export async function executePettyCashPurchase(opts: {
  ingredientId?: string;
  itemName?: string;
  expenseCategory?: string;
  qty: number;
  cashAmount: number;
  purchasedBy: string;
  vendor?: string;
  userId?: string;
  approvedBy?: string;
  note?: string;
}): Promise<void> {
  const { ingredientId, itemName, expenseCategory, qty, cashAmount, purchasedBy, vendor, userId, approvedBy, note } = opts;

  if (!ingredientId && !itemName) throw new AppError('Provide either ingredientId or itemName', 400);
  if (qty <= 0) throw new AppError('qty must be positive', 400);
  if (cashAmount <= 0) throw new AppError('cashAmount must be positive', 400);

  if (ingredientId) {
    // Ingredient mode — restock the ingredient
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) throw new AppError('Ingredient not found', 404);
    if (!ingredient.isActive) throw new AppError('Ingredient is inactive', 400);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const newStock = parseFloat((ingredient.stock + qty).toFixed(4));
      await Ingredient.findByIdAndUpdate(ingredient._id, { stock: newStock }, { session });

      await StockLog.create([{
        type: 'petty_cash_purchase',
        performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        approvedBy: approvedBy ? new mongoose.Types.ObjectId(approvedBy) : undefined,
        lines: [{ ingredient: ingredient._id, ingredientName: ingredient.name, unit: ingredient.unit, delta: qty }],
        cashAmount,
        purchasedBy,
        vendor: vendor || undefined,
        note: note || `Petty cash: ${qty} ${ingredient.unit} of ${ingredient.name} — NPR ${cashAmount}${vendor ? ` from ${vendor}` : ''} by ${purchasedBy}`,
      }], { session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    // Custom item mode — expense-only, no stock change
    await StockLog.create({
      type: 'petty_cash_purchase',
      performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      approvedBy: approvedBy ? new mongoose.Types.ObjectId(approvedBy) : undefined,
      lines: [],
      cashAmount,
      purchasedBy,
      vendor: vendor || undefined,
      itemName,
      expenseCategory: expenseCategory || 'general',
      note: note || `Petty cash: ${itemName} — NPR ${cashAmount}${vendor ? ` from ${vendor}` : ''} by ${purchasedBy}`,
    });
  }
}

// ── Excel import ─────────────────────────────────────────────────────────────

export async function parseExcelImport(
  buffer: Buffer,
  userId?: string
): Promise<{ ingredientsCount: number; recipesCount: number; errors: string[] }> {
  // Dynamic import so xlsx is optional at compile time
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const errors: string[] = [];
  let ingredientsCount = 0;
  let recipesCount = 0;

  // ── Sheet 1: Ingredients ──────────────────────────────────────────────────
  const ingSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (ingSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(ingSheet, { defval: '' });
    for (const row of rows) {
      try {
        const name = String(row['Name'] || row['name'] || '').trim();
        const unit = String(row['Unit'] || row['unit'] || '').trim().toLowerCase();
        const stock = Number(row['Stock'] || row['stock'] || 0);
        const costPrice = Number(row['Cost Price'] || row['costPrice'] || row['cost_price'] || 0);
        const lowAlert = Number(row['Low Alert'] || row['lowAlert'] || row['low_alert'] || 0);
        const category = String(row['Category'] || row['category'] || 'general').trim().toLowerCase();

        if (!name || !unit) { errors.push(`Row skipped (missing name or unit): ${JSON.stringify(row)}`); continue; }

        await Ingredient.findOneAndUpdate(
          { name },
          { name, unit, stock, costPrice, lowStockThreshold: lowAlert, category: ['kitchen','bar','general'].includes(category) ? category : 'general', isActive: true },
          { upsert: true, new: true }
        );
        ingredientsCount++;
      } catch (e: any) {
        errors.push(`Ingredient error: ${e.message}`);
      }
    }
  }

  // ── Sheet 2: Recipes ──────────────────────────────────────────────────────
  const recSheet = workbook.Sheets[workbook.SheetNames[1]];
  if (recSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(recSheet, { defval: '' });
    for (const row of rows) {
      try {
        const name = String(row['Dish/Drink Name'] || row['Name'] || row['name'] || '').trim();
        const servingLabel = String(row['Serving Label'] || row['servingLabel'] || '').trim();
        const sellingPrice = Number(row['Selling Price'] || row['sellingPrice'] || 0);
        const section = String(row['Section'] || row['section'] || 'kitchen').trim().toLowerCase();

        if (!name) { errors.push(`Recipe row skipped (no name): ${JSON.stringify(row)}`); continue; }

        // Parse dynamic ingredient columns: Ingredient 1 / Qty 1 / Ingredient 2 / Qty 2 ...
        const ingredientLines: { ingredient: mongoose.Types.ObjectId; qtyPerServing: number }[] = [];
        let i = 1;
        while (row[`Ingredient ${i}`] || row[`ingredient_${i}`]) {
          const ingName = String(row[`Ingredient ${i}`] || row[`ingredient_${i}`] || '').trim();
          const qty = Number(row[`Qty ${i}`] || row[`qty_${i}`] || 0);
          if (ingName && qty > 0) {
            const ing = await Ingredient.findOne({ name: ingName });
            if (ing) {
              ingredientLines.push({ ingredient: ing._id as mongoose.Types.ObjectId, qtyPerServing: qty });
            } else {
              errors.push(`Recipe "${name}": ingredient "${ingName}" not found — skipped`);
            }
          }
          i++;
        }

        await Recipe.findOneAndUpdate(
          { name },
          { name, servingLabel, sellingPrice, section: ['kitchen','bar'].includes(section) ? section : 'kitchen', ingredients: ingredientLines, isActive: true },
          { upsert: true, new: true }
        );
        recipesCount++;
      } catch (e: any) {
        errors.push(`Recipe error: ${e.message}`);
      }
    }
  }

  // Write import log
  await StockLog.create({
    type: 'import',
    performedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    lines: [],
    note: `Excel import: ${ingredientsCount} ingredients, ${recipesCount} recipes`,
  });

  return { ingredientsCount, recipesCount, errors };
}

// ── Auto-deduct ingredients when an order is placed ──────────────────────────
// Called from order controller after Order.create(). Best-effort: never throws.
// For each order line: load MenuItem → find its linked Recipe → deduct
// qty × qtyPerServing for every ingredient in that recipe.

export async function deductForOrder(
  items: { menuItem: mongoose.Types.ObjectId | string; quantity: number }[]
): Promise<void> {
  for (const line of items) {
    const menuItem = await MenuItem.findById(line.menuItem).lean();
    if (!menuItem?.recipe) continue;

    const recipe = await Recipe.findById(menuItem.recipe)
      .populate('ingredients.ingredient')
      .lean();
    if (!recipe || !recipe.isActive) continue;

    const logLines: { ingredient: mongoose.Types.ObjectId; ingredientName: string; unit: string; delta: number }[] = [];

    for (const ing of recipe.ingredients as any[]) {
      const ingredient = ing.ingredient as IIngredient & { _id: mongoose.Types.ObjectId };
      if (!ingredient?._id) continue;

      const deduct = parseFloat((ing.qtyPerServing * line.quantity).toFixed(4));
      if (deduct <= 0) continue;

      // Atomic decrement — floors at 0 via two-step: decrement then clamp
      await Ingredient.findByIdAndUpdate(ingredient._id, { $inc: { stock: -deduct } });
      await Ingredient.findByIdAndUpdate(
        { _id: ingredient._id, stock: { $lt: 0 } },
        { $set: { stock: 0 } }
      );

      logLines.push({
        ingredient: ingredient._id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        delta: -deduct,
      });
    }

    if (logLines.length) {
      await StockLog.create({
        type: 'sale',
        recipe: recipe._id,
        recipeName: recipe.name,
        servingsConsumed: line.quantity,
        lines: logLines,
        note: `Order deduction: ${line.quantity} × ${recipe.name}`,
      });

      // Warn admin room about any ingredient that hit low/out after deduction
      for (const ing of recipe.ingredients as any[]) {
        const updated = await Ingredient.findById(ing.ingredient._id).lean();
        if (!updated) continue;
        if (updated.stock === 0) {
          emitNotification('admin', `⚠️ OUT OF STOCK: ${updated.name} — please restock`);
        } else if (updated.stock <= updated.lowStockThreshold) {
          emitNotification('admin', `⚠️ Low stock: ${updated.name} — ${updated.stock} ${updated.unit} remaining`);
        }
      }
    }
  }
}
