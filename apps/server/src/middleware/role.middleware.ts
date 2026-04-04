import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './errorHandler';
import { UserRole } from '../models/User';

export function requireRole(...roles: (UserRole | 'guest')[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}

export const adminOnly = requireRole('admin');
export const adminOrStaff = requireRole('admin', 'staff');
export const kitchenOrAbove = requireRole('admin', 'staff', 'kitchen', 'waiter');
export const waiterOrAbove = requireRole('admin', 'staff', 'waiter');
