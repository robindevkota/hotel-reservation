import { Response } from 'express';
import WalkInCustomer from '../models/WalkInCustomer';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

export async function createWalkInCustomer(req: AuthRequest, res: Response): Promise<void> {
  const { name, phone, type, notes } = req.body;

  if (!name?.trim()) throw new AppError('name is required', 400);
  if (!['dine_in', 'spa'].includes(type)) throw new AppError('type must be dine_in or spa', 400);

  const customer = await WalkInCustomer.create({
    name: name.trim(),
    phone: phone?.trim() || undefined,
    type,
    notes: notes?.trim() || '',
    createdBy: req.user!._id,
  });

  res.status(201).json({ success: true, customer });
}

export async function listWalkInCustomers(req: AuthRequest, res: Response): Promise<void> {
  const isSuperAdmin = req.userRole === 'super_admin';
  const dept = req.userDepartment;

  // Scope by department — super_admin sees all
  const typeFilter: string[] = [];
  if (isSuperAdmin) {
    typeFilter.push('dine_in', 'spa');
  } else if (dept === 'food') {
    typeFilter.push('dine_in');
  } else if (dept === 'spa') {
    typeFilter.push('spa');
  } else {
    // Other dept admins see nothing (front_desk etc.)
    res.json({ success: true, customers: [] });
    return;
  }

  // Optional filters from query
  const { type, date } = req.query;

  const filter: Record<string, unknown> = { type: { $in: typeFilter } };
  if (type && typeFilter.includes(type as string)) filter.type = type;

  if (date) {
    const start = new Date(date as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date as string);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }

  const customers = await WalkInCustomer.find(filter)
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({ success: true, customers });
}

export async function getWalkInCustomer(req: AuthRequest, res: Response): Promise<void> {
  const customer = await WalkInCustomer.findById(req.params.id).populate('createdBy', 'name');
  if (!customer) throw new AppError('Walk-in customer not found', 404);
  res.json({ success: true, customer });
}
