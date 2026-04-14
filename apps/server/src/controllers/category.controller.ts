import { Request, Response } from 'express';
import { body } from 'express-validator';
import RoomCategory from '../models/RoomCategory';
import { AppError } from '../middleware/errorHandler';

export const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('slug').trim().notEmpty().isSlug().withMessage('Slug must be a valid slug'),
];

export async function listCategories(req: Request, res: Response): Promise<void> {
  const categories = await RoomCategory.find().sort({ name: 1 });
  res.json({ success: true, categories });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const category = await RoomCategory.create(req.body);
  res.status(201).json({ success: true, category });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const category = await RoomCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, category });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const category = await RoomCategory.findByIdAndDelete(req.params.id);
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, message: 'Category deleted' });
}
