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

  // Carry nationality from reservation guestType
  const nationality = reservation.guestType === 'nepali' ? 'nepali' : 'foreign';

  // Create Guest
  const guest = await Guest.create({
    reservation: reservation._id,
    room: reservation.room,
    name: reservation.guest.name,
    email: reservation.guest.email,
    phone: reservation.guest.phone,
    nationality,
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

  if (reservation.cancellationPolicy === 'flexible') {
    const adjustedRoomCharge = nightsStayed * room.pricePerNight;
    const roomItem = bill.lineItems.find((li: any) => li.type === 'room');
    if (roomItem) {
      (roomItem as any).amount = adjustedRoomCharge;
      (roomItem as any).description = `Room charge: ${room.name} (${nightsStayed} of ${reservation.totalNights} nights — early departure)`;
    }
  }

  reservation.totalNights = nightsStayed;
  reservation.checkOutDate = new Date();
  await reservation.save();

  bill.status = 'pending_payment';
  (bill as any).recalculate();
  await bill.save();

  guest.isActive = false;
  guest.checkOutTime = new Date();
  await guest.save();

  await Room.findByIdAndUpdate(guest.room, { isAvailable: true });

  res.json({ success: true, bill, nightsStayed, policy: reservation.cancellationPolicy });
}

// Early arrival: guest arrives before their booked checkInDate.
export async function earlyArrival(req: Request, res: Response): Promise<void> {
  const { actualCheckInDate } = req.body;
  if (!actualCheckInDate) throw new AppError('actualCheckInDate is required', 400);

  const guest = await Guest.findById(req.params.guestId).populate('bill');
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.isActive) throw new AppError('Guest already checked out', 400);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Bill already processed', 400);

  const reservation = await Reservation.findById(guest.reservation).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);

  const actual = new Date(actualCheckInDate);
  actual.setHours(0, 0, 0, 0);
  const booked = new Date(reservation.checkInDate);
  booked.setHours(0, 0, 0, 0);

  if (actual >= booked) throw new AppError('actualCheckInDate must be before the booked check-in date', 400);

  const extraNights = Math.round((booked.getTime() - actual.getTime()) / (1000 * 60 * 60 * 24));
  const room = reservation.room as any;
  const extraCharge = extraNights * room.pricePerNight;

  bill.lineItems.push({
    type: 'room',
    description: `Early arrival: ${room.name} (${extraNights} extra night${extraNights > 1 ? 's' : ''} — arrived ${actual.toLocaleDateString()})`,
    amount: extraCharge,
    date: new Date(),
  } as any);

  reservation.checkInDate = actual;
  reservation.totalNights = reservation.totalNights + extraNights;
  await reservation.save();

  (bill as any).recalculate();
  await bill.save();

  res.json({ success: true, bill, extraNights, extraCharge, policy: reservation.cancellationPolicy });
}

// Stay extension: add extra nights to a currently checked-in guest's stay.
export async function extendStay(req: Request, res: Response): Promise<void> {
  const { extraNights } = req.body;
  if (!Number.isInteger(extraNights) || extraNights < 1) {
    throw new AppError('extraNights must be a positive integer', 400);
  }

  const guest = await Guest.findById(req.params.guestId);
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.isActive) throw new AppError('Guest already checked out', 400);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Bill already processed', 400);

  const reservation = await Reservation.findById(guest.reservation).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);

  const room = reservation.room as any;
  const currentCheckOut = new Date(reservation.checkOutDate);
  const newCheckOut = new Date(currentCheckOut);
  newCheckOut.setDate(newCheckOut.getDate() + extraNights);

  // Check no other confirmed/checked_in reservation blocks the extended dates
  const conflict = await Reservation.findOne({
    room: room._id,
    _id: { $ne: reservation._id },
    status: { $in: ['confirmed', 'checked_in'] },
    checkInDate: { $lt: newCheckOut },
    checkOutDate: { $gt: currentCheckOut },
  });
  if (conflict) {
    throw new AppError(
      `Room is already booked from ${new Date(conflict.checkInDate).toLocaleDateString()} — cannot extend stay`,
      409
    );
  }

  const extraCharge = extraNights * room.pricePerNight;

  bill.lineItems.push({
    type: 'room',
    description: `Stay extension: ${room.name} (${extraNights} extra night${extraNights > 1 ? 's' : ''})`,
    amount: extraCharge,
    date: new Date(),
  } as any);

  reservation.checkOutDate = newCheckOut;
  reservation.totalNights = reservation.totalNights + extraNights;
  await reservation.save();

  // Extend QR session expiry to new checkout day end
  const newExpiry = new Date(newCheckOut);
  newExpiry.setHours(23, 59, 59, 999);
  guest.qrSessionExpiry = newExpiry;
  await guest.save();

  (bill as any).recalculate();
  await bill.save();

  res.json({ success: true, bill, extraNights, extraCharge, newCheckOut });
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const guest = await Guest.findById(req.params.guestId).populate('bill');
  if (!guest) throw new AppError('Guest not found', 404);
  if (!guest.isActive) throw new AppError('Guest already checked out', 400);

  const bill = await Bill.findById(guest.bill);
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status !== 'open') throw new AppError('Bill already processed', 400);

  bill.status = 'pending_payment';
  (bill as any).recalculate();
  await bill.save();

  guest.isActive = false;
  guest.checkOutTime = new Date();
  await guest.save();

  await Reservation.findByIdAndUpdate(guest.reservation, { status: 'checked_out' });
  await Room.findByIdAndUpdate(guest.room, { isAvailable: true });

  res.json({ success: true, bill });
}
