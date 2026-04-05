import { Request, Response } from 'express';
import { body } from 'express-validator';
import MenuItem from '../models/MenuItem';
import { AppError } from '../middleware/errorHandler';

export const menuItemValidation = [
  body('name').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('category').isIn(['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'desserts']),
  body('price').isFloat({ min: 0 }),
  body('preparationTime').optional().isInt({ min: 1 }),
  body('isVeg').optional().isBoolean(),
];

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const { category, all } = req.query;
  const filter: Record<string, unknown> = {};
  // Public guest view only shows available items; admin passes ?all=true
  if (!all) filter.isAvailable = true;
  if (category && category !== 'all') filter.category = category;

  const items = await MenuItem.find(filter).sort('category name');
  res.json({ success: true, items });
}

export async function getMenuItem(req: Request, res: Response): Promise<void> {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  res.json({ success: true, item });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const item = await MenuItem.create(req.body);
  res.status(201).json({ success: true, item });
}

export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw new AppError('Menu item not found', 404);
  res.json({ success: true, item });
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  res.json({ success: true });
}
