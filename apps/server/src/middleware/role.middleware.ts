import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './errorHandler';
import { UserRole, Department } from '../models/User';

export function requireRole(...roles: (UserRole | 'guest')[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}

// Only super_admin can access
export const requireSuperAdmin = requireRole('super_admin');

// Any authenticated admin (super_admin or scoped admin)
export const requireAdmin = requireRole('super_admin', 'admin');

// super_admin can access all departments; scoped admin must match
export function requireDepartment(...departments: Department[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (req.userRole === 'super_admin') return next();
    if (!req.userDepartment || !departments.includes(req.userDepartment)) {
      throw new AppError('Insufficient permissions for this department', 403);
    }
    next();
  };
}
