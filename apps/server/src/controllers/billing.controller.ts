import { Request, Response } from 'express';
import { body } from 'express-validator';
import Bill from '../models/Bill';
import Guest from '../models/Guest';
import Settings from '../models/Settings';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { addLineItem } from '../services/billing.service';
import { getUsdToNprRate } from '../services/exchangeRate.service';

export const manualChargeValidation = [
  body('description').trim().notEmpty(),
  body('amount').isFloat({ min: 0 }),
];

export async function getMyBill(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const bill = await Bill.findById(guest.bill).populate('guest', 'name email nationality');
  if (!bill) throw new AppError('Bill not found', 404);

  const guestDoc = await Guest.findById(guest._id).select('nationality');
  const isNepali = guestDoc?.nationality === 'nepali';
  const exchangeRate = isNepali ? await getUsdToNprRate() : 1;

  res.json({ success: true, bill, isNepali, exchangeRate });
}

export async function getGuestBill(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId).select('bill nationality');
  if (!guest) throw new AppError('Guest not found', 404);

  const bill = await Bill.findById(guest.bill)
    .populate('guest', 'name email phone nationality')
    .populate('reservation', 'checkInDate checkOutDate');
  if (!bill) throw new AppError('Bill not found', 404);

  const isNepali = guest.nationality === 'nepali';
  const exchangeRate = isNepali ? await getUsdToNprRate() : 1;

  res.json({ success: true, bill, isNepali, exchangeRate });
}

export async function getBillByReservation(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findOne({ reservation: req.params.reservationId }).select('_id bill nationality');
  if (!guest) throw new AppError('No active guest for this reservation', 404);

  const bill = await Bill.findById(guest.bill)
    .populate('guest', 'name email phone nationality')
    .populate('reservation', 'checkInDate checkOutDate');
  if (!bill) throw new AppError('Bill not found', 404);

  const isNepali = guest.nationality === 'nepali';
  const exchangeRate = isNepali ? await getUsdToNprRate() : 1;

  res.json({ success: true, bill, guestId: guest._id, isNepali, exchangeRate });
}

export async function toggleVat(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.bill) throw new AppError('No bill for this guest', 404);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'paid') throw new AppError('Cannot modify a paid bill', 400);

  bill.vatEnabled = req.body.vatEnabled;
  bill.recalculate();
  await bill.save();

  res.json({ success: true, bill });
}

export async function addManualCharge(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.bill) throw new AppError('No bill for this guest', 404);

  const { description, amount } = req.body;
  const bill = await addLineItem(
    guest.bill as any,
    String(guest._id),
    'other',
    description,
    amount
  );

  res.json({ success: true, bill });
}

// Apply a discount to the bill as a negative line item.
// discountType: 'cash' | 'percentage'
// value: NPR amount (for nepali guests) or USD amount / percentage number
// Requires discountEnabled in Settings.
export async function applyDiscount(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId).select('bill nationality');
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.bill) throw new AppError('No bill for this guest', 404);

  const settings = await Settings.findOne();
  if (!settings?.discountEnabled) throw new AppError('Discounts are not enabled by management', 403);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Cannot modify a bill that is not open', 400);

  const { discountType, value } = req.body;
  if (!discountType || !['cash', 'percentage'].includes(discountType)) {
    throw new AppError('discountType must be "cash" or "percentage"', 400);
  }
  if (!value || isNaN(Number(value)) || Number(value) <= 0) {
    throw new AppError('value must be a positive number', 400);
  }

  const isNepali = guest.nationality === 'nepali';
  const exchangeRate = isNepali ? await getUsdToNprRate() : 1;
  const { discountAppliesTo } = settings;

  // Calculate the base amount the discount applies to (in USD)
  let baseUsd = 0;
  if (discountAppliesTo.room) baseUsd += bill.roomCharges;
  if (discountAppliesTo.food) baseUsd += bill.foodCharges;
  if (discountAppliesTo.spa)  baseUsd += bill.spaCharges;

  let discountUsd: number;
  let description: string;

  if (discountType === 'percentage') {
    const pct = Number(value);
    const maxPct = settings.maxDiscountPercentage ?? 0;
    if (pct > 100) throw new AppError('Percentage cannot exceed 100', 400);
    if (pct > maxPct) throw new AppError(`Percentage discount cannot exceed ${maxPct}% (set by management)`, 400);
    discountUsd = parseFloat((baseUsd * pct / 100).toFixed(2));
    description = `Discount (${pct}% on ${[discountAppliesTo.room && 'room', discountAppliesTo.food && 'food', discountAppliesTo.spa && 'spa'].filter(Boolean).join(', ')})`;
  } else {
    // cash: frontend sends in NPR for nepali guests, USD for foreign
    const rawValue = Number(value);
    const valueInUsd = isNepali
      ? parseFloat((rawValue / exchangeRate).toFixed(2))
      : parseFloat(rawValue.toFixed(2));
    const maxCashUsd = settings.maxDiscountCash ?? 0;
    if (valueInUsd > maxCashUsd) {
      const maxDisplay = isNepali
        ? `Rs. ${(maxCashUsd * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : `$${maxCashUsd.toFixed(2)}`;
      throw new AppError(`Cash discount cannot exceed ${maxDisplay} (set by management)`, 400);
    }
    if (valueInUsd > baseUsd) throw new AppError('Discount exceeds applicable charges', 400);
    discountUsd = valueInUsd;
    description = isNepali
      ? `Discount (Rs. ${rawValue.toLocaleString()})`
      : `Discount ($${valueInUsd.toFixed(2)})`;
  }

  // Post as negative other line item
  bill.lineItems.push({
    type: 'other',
    description,
    amount: -discountUsd,
    date: new Date(),
  } as any);

  (bill as any).recalculate();
  await bill.save();

  res.json({ success: true, bill, discountUsd });
}
