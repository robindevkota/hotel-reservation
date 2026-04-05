import mongoose from 'mongoose';
import Ingredient, { IIngredient } from '../models/Ingredient';
import Recipe, { IRecipe } from '../models/Recipe';
import StockLog from '../models/StockLog';
import { AppError } from '../middleware/errorHandler';

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
