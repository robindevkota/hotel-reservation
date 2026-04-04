import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import User, { IUser, UserRole } from '../models/User';
import Guest, { IGuest } from '../models/Guest';

export interface AuthRequest extends Request {
  user?: IUser;
  guest?: IGuest;
  userRole?: UserRole | 'guest';
}

export function protect(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    req.cookies?.accessToken;

  if (!token) throw new AppError('Not authenticated', 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
      type: 'staff' | 'guest';
    };

    // Store decoded info on request for role middleware
    (req as any)._decoded = decoded;
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

export function loadStaffUser(req: AuthRequest, _res: Response, next: NextFunction): void {
  const decoded = (req as any)._decoded;
  if (!decoded || decoded.type !== 'staff') throw new AppError('Not authorized', 403);

  User.findById(decoded.id)
    .select('-password')
    .then((user) => {
      if (!user || !user.isActive) throw new AppError('User not found or deactivated', 401);
      req.user = user;
      req.userRole = user.role;
      next();
    })
    .catch(next);
}

export function loadGuestUser(req: AuthRequest, _res: Response, next: NextFunction): void {
  const decoded = (req as any)._decoded;
  if (!decoded || decoded.type !== 'guest') throw new AppError('Not authorized', 403);

  Guest.findById(decoded.id).then((guest) => {
    if (!guest || !guest.isActive) throw new AppError('Guest session not found or expired', 401);
    req.guest = guest;
    req.userRole = 'guest';
    next();
  }).catch(next);
}

// Require staff authentication
export const requireStaff = [protect, loadStaffUser];

// Require guest authentication (QR-based)
export const requireGuest = [protect, loadGuestUser];

// Require either staff or guest
export function requireStaffOrGuest(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    req.cookies?.accessToken;

  if (!token) throw new AppError('Not authenticated', 401);

  let decoded: { id: string; role: string; type: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as typeof decoded;
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  if (decoded.type === 'staff') {
    (req as any)._decoded = decoded;
    loadStaffUser(req, res, next);
  } else if (decoded.type === 'guest') {
    (req as any)._decoded = decoded;
    loadGuestUser(req, res, next);
  } else {
    throw new AppError('Not authorized', 403);
  }
}
