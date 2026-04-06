import { Request, Response } from 'express';
import { body } from 'express-validator';
import User from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('department').optional().isIn(['spa', 'food', 'front_desk']).withMessage('Invalid department'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, password, department } = req.body;

  // Only super_admin can create new admin accounts
  if (!req.user || req.userRole !== 'super_admin') {
    throw new AppError('Only super admin can create accounts', 403);
  }

  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already registered', 409);

  const user = await User.create({
    name,
    email,
    password,
    role: 'admin',
    department: department ?? null,
  });

  res.status(201).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  res.json({
    success: true,
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('No refresh token', 401);

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new AppError('User not found', 401);

  const accessToken = signAccessToken(user);
  const newRefresh = signRefreshToken(user);

  res.cookie('refreshToken', newRefresh, COOKIE_OPTS);
  res.json({ success: true, accessToken });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('refreshToken');
  res.json({ success: true });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  res.json({ success: true, user: req.user });
}

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

export async function listAdmins(_req: AuthRequest, res: Response): Promise<void> {
  const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
  res.json({ success: true, admins });
}

export async function toggleAdmin(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await User.findOne({ _id: id, role: 'admin' });
  if (!user) throw new AppError('Admin not found', 404);
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, isActive: user.isActive } });
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.id).select('+password');
  if (!user) throw new AppError('User not found', 404);

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  user.password = newPassword;
  await user.save(); // triggers bcrypt pre-save hook

  res.json({ success: true, message: 'Password updated successfully' });
}
