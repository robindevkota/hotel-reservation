import { Request, Response } from 'express';
import Settings from '../models/Settings';
import { getUsdToNprRateFull, setUsdToNprRate } from '../services/exchangeRate.service';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Exchange Rate ─────────────────────────────────────────────────────────────

export async function getExchangeRate(req: Request, res: Response): Promise<void> {
  const data = await getUsdToNprRateFull();
  res.json({ success: true, ...data });
}

export async function updateExchangeRate(req: AuthRequest, res: Response): Promise<void> {
  const { rate } = req.body;
  if (!rate || isNaN(Number(rate)) || Number(rate) < 1) {
    throw new AppError('rate must be a positive number', 400);
  }
  const updatedBy = req.user?.name || req.user?.email || 'admin';
  const newRate = await setUsdToNprRate(Number(rate), updatedBy);
  res.json({ success: true, rate: newRate, updatedBy });
}

// ── Discount Settings ─────────────────────────────────────────────────────────

async function getOrCreateSettings(): Promise<InstanceType<typeof Settings>> {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
}

export async function getDiscountSettings(req: Request, res: Response): Promise<void> {
  const s = await getOrCreateSettings();
  res.json({
    success: true,
    discountEnabled: s.discountEnabled,
    discountAppliesTo: s.discountAppliesTo,
    maxDiscountPercentage: s.maxDiscountPercentage,
    maxDiscountCash: s.maxDiscountCash,
  });
}

export async function updateDiscountSettings(req: AuthRequest, res: Response): Promise<void> {
  const { discountEnabled, discountAppliesTo, maxDiscountPercentage, maxDiscountCash } = req.body;
  const s = await getOrCreateSettings();

  if (typeof discountEnabled === 'boolean') s.discountEnabled = discountEnabled;
  if (discountAppliesTo && typeof discountAppliesTo === 'object') {
    if (typeof discountAppliesTo.room === 'boolean') s.discountAppliesTo.room = discountAppliesTo.room;
    if (typeof discountAppliesTo.food === 'boolean') s.discountAppliesTo.food = discountAppliesTo.food;
    if (typeof discountAppliesTo.spa  === 'boolean') s.discountAppliesTo.spa  = discountAppliesTo.spa;
  }
  if (maxDiscountPercentage !== undefined) {
    const pct = Number(maxDiscountPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) throw new AppError('maxDiscountPercentage must be 0–100', 400);
    s.maxDiscountPercentage = pct;
  }
  if (maxDiscountCash !== undefined) {
    const cash = Number(maxDiscountCash);
    if (isNaN(cash) || cash < 0) throw new AppError('maxDiscountCash must be ≥ 0', 400);
    s.maxDiscountCash = cash;
  }
  s.updatedBy = req.user?.name || req.user?.email || 'superadmin';
  await s.save();

  res.json({
    success: true,
    discountEnabled: s.discountEnabled,
    discountAppliesTo: s.discountAppliesTo,
    maxDiscountPercentage: s.maxDiscountPercentage,
    maxDiscountCash: s.maxDiscountCash,
  });
}
