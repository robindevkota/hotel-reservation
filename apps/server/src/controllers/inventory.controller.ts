import { Request, Response } from 'express';
import { body } from 'express-validator';
import Ingredient from '../models/Ingredient';
import Recipe from '../models/Recipe';
import StockLog from '../models/StockLog';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getInventoryStats,
  executeSell,
  executeConsume,
  executeStocktake,
  getVarianceReport,
  getInventoryAnalytics,
  parseExcelImport,
} from '../services/inventory.service';

// ── Ingredient CRUD ──────────────────────────────────────────────────────────

export const ingredientValidation = [
  body('name').trim().notEmpty(),
  body('unit').isIn(['kg','g','litre','ml','piece','packet','bottle']),
  body('stock').isFloat({ min: 0 }),
  body('costPrice').isFloat({ min: 0 }),
  body('lowStockThreshold').isFloat({ min: 0 }),
  body('category').optional().isIn(['kitchen','bar','general']),
];

export async function listIngredients(req: AuthRequest, res: Response): Promise<void> {
  const { category } = req.query;
  const filter: any = { isActive: true };
  if (category) filter.category = category;
  const ingredients = await Ingredient.find(filter).sort('name');
  res.json({ success: true, ingredients });
}

export async function createIngredient(req: AuthRequest, res: Response): Promise<void> {
  const ingredient = await Ingredient.create(req.body);
  res.status(201).json({ success: true, ingredient });
}

export async function updateIngredient(req: AuthRequest, res: Response): Promise<void> {
  const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!ingredient) throw new AppError('Ingredient not found', 404);
  res.json({ success: true, ingredient });
}

export async function deleteIngredient(req: AuthRequest, res: Response): Promise<void> {
  const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!ingredient) throw new AppError('Ingredient not found', 404);
  res.json({ success: true });
}

export async function restockIngredient(req: AuthRequest, res: Response): Promise<void> {
  const { qty, note } = req.body;
  if (!qty || Number(qty) <= 0) throw new AppError('qty must be a positive number', 400);

  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) throw new AppError('Ingredient not found', 404);

  const delta = Number(qty);
  ingredient.stock = parseFloat((ingredient.stock + delta).toFixed(4));
  await ingredient.save();

  await StockLog.create({
    type: 'restock',
    performedBy: req.user?._id,
    lines: [{ ingredient: ingredient._id, ingredientName: ingredient.name, unit: ingredient.unit, delta }],
    note: note || `Restocked ${delta} ${ingredient.unit} of ${ingredient.name}`,
  });

  res.json({ success: true, ingredient });
}

// ── Recipe CRUD ──────────────────────────────────────────────────────────────

export const recipeValidation = [
  body('name').trim().notEmpty(),
  body('servingLabel').trim().notEmpty(),
  body('sellingPrice').isFloat({ min: 0 }),
  body('section').isIn(['kitchen','bar']),
  body('ingredients').isArray({ min: 1 }),
  body('ingredients.*.ingredient').isMongoId(),
  body('ingredients.*.qtyPerServing').isFloat({ min: 0 }),
];

export async function listRecipes(_req: Request, res: Response): Promise<void> {
  const recipes = await Recipe.find({ isActive: true })
    .populate('ingredients.ingredient', 'name unit stock costPrice lowStockThreshold')
    .sort('name');
  res.json({ success: true, recipes });
}

export async function createRecipe(req: AuthRequest, res: Response): Promise<void> {
  const recipe = await Recipe.create(req.body);
  const populated = await recipe.populate('ingredients.ingredient', 'name unit stock costPrice lowStockThreshold');
  res.status(201).json({ success: true, recipe: populated });
}

export async function updateRecipe(req: AuthRequest, res: Response): Promise<void> {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('ingredients.ingredient', 'name unit stock costPrice lowStockThreshold');
  if (!recipe) throw new AppError('Recipe not found', 404);
  res.json({ success: true, recipe });
}

export async function deleteRecipe(req: AuthRequest, res: Response): Promise<void> {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!recipe) throw new AppError('Recipe not found', 404);
  res.json({ success: true });
}

// ── Sell ─────────────────────────────────────────────────────────────────────

export async function sell(req: AuthRequest, res: Response): Promise<void> {
  const { recipeId, servings } = req.body;
  if (!recipeId || !servings || Number(servings) < 1) {
    throw new AppError('recipeId and servings (≥1) are required', 400);
  }
  await executeSell(recipeId, Number(servings), req.user?._id?.toString());
  res.json({ success: true, message: `Sold ${servings} serving(s)` });
}

// ── Consume (staff / owner / wastage / complimentary) ────────────────────────

export const consumeValidation = [
  body('type').isIn(['staff_consumption','owner_consumption','wastage','complimentary']),
  body('ingredientId').isMongoId(),
  body('qty').isFloat({ min: 0.001 }),
  body('consumedBy').optional().trim(),
  body('consumptionReason').optional().isIn(['spillage','breakage','expired','other']),
  body('guestId').optional().isMongoId(),
];

export async function consume(req: AuthRequest, res: Response): Promise<void> {
  const { type, ingredientId, qty, consumedBy, consumptionReason, guestId, note } = req.body;
  await executeConsume({
    type, ingredientId, qty: Number(qty),
    consumedBy, consumptionReason, guestId, note,
    userId: req.user?._id?.toString(),
  });
  res.json({ success: true, message: `${type.replace('_', ' ')} logged` });
}

// ── Stocktake ────────────────────────────────────────────────────────────────

export async function stocktake(req: AuthRequest, res: Response): Promise<void> {
  const { lines } = req.body;
  if (!Array.isArray(lines) || !lines.length) throw new AppError('lines array is required', 400);
  const result = await executeStocktake(lines, req.user?._id?.toString());
  res.json({ success: true, ...result });
}

// ── Variance report ──────────────────────────────────────────────────────────

export async function varianceReport(req: AuthRequest, res: Response): Promise<void> {
  const since = req.query.since ? new Date(req.query.since as string) : undefined;
  const data = await getVarianceReport(since);
  res.json({ success: true, ...data });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function stats(_req: Request, res: Response): Promise<void> {
  const data = await getInventoryStats();
  res.json({ success: true, ...data });
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function getLogs(req: AuthRequest, res: Response): Promise<void> {
  const { type, page = 1, limit = 50 } = req.query;
  const filter: any = {};
  if (type) filter.type = type;
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    StockLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('performedBy', 'name')
      .populate('recipe', 'name'),
    StockLog.countDocuments(filter),
  ]);
  res.json({ success: true, logs, total, page: Number(page) });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function analytics(_req: Request, res: Response): Promise<void> {
  const data = await getInventoryAnalytics();
  res.json({ success: true, ...data });
}

// ── Excel Import ─────────────────────────────────────────────────────────────

export async function importExcel(req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<void> {
  if (!req.file) throw new AppError('Excel file is required', 400);
  const result = await parseExcelImport(req.file.buffer, req.user?._id?.toString());
  res.json({ success: true, ...result });
}
