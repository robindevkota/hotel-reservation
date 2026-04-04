import Bill, { IBill, LineItemType } from '../models/Bill';
import mongoose from 'mongoose';
import { emitBillUpdated } from './socket.service';

export async function addLineItem(
  billId: mongoose.Types.ObjectId,
  guestId: string,
  type: LineItemType,
  description: string,
  amount: number,
  referenceId?: mongoose.Types.ObjectId
): Promise<IBill> {
  const bill = await Bill.findById(billId);
  if (!bill) throw new Error('Bill not found');

  bill.lineItems.push({ type, description, amount, referenceId, date: new Date() });
  (bill as any).recalculate();
  await bill.save();

  emitBillUpdated(guestId, bill.grandTotal);
  return bill;
}

export async function getBillWithDetails(billId: string): Promise<IBill | null> {
  return Bill.findById(billId)
    .populate('guest', 'name email phone')
    .populate('reservation', 'checkInDate checkOutDate');
}
