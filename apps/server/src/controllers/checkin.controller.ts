import { Request, Response } from 'express';
import Reservation from '../models/Reservation';
import Guest from '../models/Guest';
import Bill from '../models/Bill';
import Room from '../models/Room';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export async function checkIn(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.reservationId);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'confirmed') throw new AppError('Reservation must be confirmed before check-in', 400);

  const room = await Room.findById(reservation.room);
  if (!room) throw new AppError('Room not found', 404);

  // Create guest session token — valid until end of checkout day
  const qrSessionToken = uuidv4();
  const checkoutEnd = new Date(reservation.checkOutDate);
  checkoutEnd.setHours(23, 59, 59, 999);
  const qrSessionExpiry = checkoutEnd;

  // linkedToGuestId links this new guest doc back to the primary guest (second-room walk-in)
  const { linkedToGuestId } = req.body;

  // Create Guest
  const guest = await Guest.create({
    reservation: reservation._id,
    room: reservation.room,
    name: reservation.guest.name,
    email: reservation.guest.email,
    phone: reservation.guest.phone,
    qrSessionToken,
    qrSessionExpiry,
    isActive: true,
    ...(linkedToGuestId ? { linkedToGuestId } : {}),
  });

  // Non-refundable guests pre-paid the room at booking — record that so
  // recalculate() excludes it from the in-stay grandTotal.
  const isNonRefundable = reservation.cancellationPolicy === 'non_refundable' && reservation.paidUpfront;
  const bill = await Bill.create({
    guest: guest._id,
    reservation: reservation._id,
    lineItems: [{
      type: 'room',
      description: `Room charge: ${room.name} (${reservation.totalNights} nights)${isNonRefundable ? ' — pre-paid at booking' : ''}`,
      amount: reservation.roomCharges,
      date: new Date(),
    }],
    prepaidAmount: isNonRefundable ? reservation.roomCharges : 0,
    ...(isNonRefundable ? { prepaidAt: new Date() } : {}),
  });
  (bill as any).recalculate();
  await bill.save();

  guest.bill = bill._id as any;
  await guest.save();

  // Update reservation status + mark room occupied
  reservation.status = 'checked_in';
  await reservation.save();
  room.isAvailable = false;
  await room.save();

  res.json({ success: true, guest, bill, qrToken: room.qrToken });
}

export async function listActiveGuests(req: Request, res: Response): Promise<void> {
  const guests = await Guest.find({ isActive: true }).lean();
  res.json({ success: true, guests });
}

// Early checkout: guest departs before their booked checkout date.
// nightsStayed must be >= 1 and < reservation.totalNights.
// Flexible policy: room line item is trimmed to actual nights stayed.
// Non-refundable: hotel keeps the full pre-paid amount — no bill adjustment.
export async function earlyCheckout(req: Request, res: Response): Promise<void> {
  const { nightsStayed } = req.body;
  if (!Number.isInteger(nightsStayed) || nightsStayed < 1) {
    throw new AppError('nightsStayed must be a positive integer', 400);
  }

  const guest = await Guest.findById(req.params.guestId).populate('bill');
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.isActive) throw new AppError('Guest already checked out', 400);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Bill already processed', 400);

  const reservation = await Reservation.findById(guest.reservation).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);

  if (nightsStayed >= reservation.totalNights) {
    throw new AppError(`nightsStayed must be less than booked nights (${reservation.totalNights})`, 400);
  }

  const room = reservation.room as any;

  // Flexible: adjust the room line item down to actual nights stayed.
  // Non-refundable: guest pre-paid in full — no bill change, just proceed to checkout.
  if (reservation.cancellationPolicy === 'flexible') {
    const adjustedRoomCharge = nightsStayed * room.pricePerNight;
    const roomItem = bill.lineItems.find((li: any) => li.type === 'room');
    if (roomItem) {
      (roomItem as any).amount = adjustedRoomCharge;
      (roomItem as any).description = `Room charge: ${room.name} (${nightsStayed} of ${reservation.totalNights} nights — early departure)`;
    }
  }

  // Update reservation to reflect actual stay
  reservation.totalNights = nightsStayed;
  reservation.checkOutDate = new Date();
  await reservation.save();

  // Finalise bill
  bill.status = 'pending_payment';
  (bill as any).recalculate();
  await bill.save();

  // Mark guest inactive
  guest.isActive = false;
  guest.checkOutTime = new Date();
  await guest.save();

  await Room.findByIdAndUpdate(guest.room, { isAvailable: true });

  res.json({ success: true, bill, nightsStayed, policy: reservation.cancellationPolicy });
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId).populate('bill');
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.isActive) throw new AppError('Guest already checked out', 400);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Bill already processed', 400);

  // Lock bill
  bill.status = 'pending_payment';
  (bill as any).recalculate();
  await bill.save();

  // Mark guest inactive
  guest.isActive = false;
  guest.checkOutTime = new Date();
  await guest.save();

  // Update reservation + mark room available again
  await Reservation.findByIdAndUpdate(guest.reservation, { status: 'checked_out' });
  await Room.findByIdAndUpdate(guest.room, { isAvailable: true });

  res.json({ success: true, bill });
}
