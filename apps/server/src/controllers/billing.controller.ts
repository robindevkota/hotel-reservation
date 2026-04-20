import { Request, Response } from 'express';
import { body } from 'express-validator';
import Bill from '../models/Bill';
import Guest from '../models/Guest';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { addLineItem } from '../services/billing.service';

export const manualChargeValidation = [
  body('description').trim().notEmpty(),
  body('amount').isFloat({ min: 0 }),
];

export async function getMyBill(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const bill = await Bill.findById(guest.bill).populate('guest', 'name email');
  if (!bill) throw new AppError('Bill not found', 404);
  res.json({ success: true, bill });
}

export async function getGuestBill(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) throw new AppError('Guest not found', 404);

  const bill = await Bill.findById(guest.bill)
    .populate('guest', 'name email phone')
    .populate('reservation', 'checkInDate checkOutDate');
  if (!bill) throw new AppError('Bill not found', 404);
  res.json({ success: true, bill });
}

export async function getBillByReservation(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findOne({ reservation: req.params.reservationId });
  if (!guest) throw new AppError('No active guest for this reservation', 404);

  const bill = await Bill.findById(guest.bill)
    .populate('guest', 'name email phone')
    .populate('reservation', 'checkInDate checkOutDate');
  if (!bill) throw new AppError('Bill not found', 404);
  res.json({ success: true, bill, guestId: guest._id });
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
