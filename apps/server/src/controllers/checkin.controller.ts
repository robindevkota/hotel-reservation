import { Request, Response } from 'express';
import Reservation from '../models/Reservation';
import Guest from '../models/Guest';
import Bill from '../models/Bill';
import Room from '../models/Room';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { generateQRToken, generateQRDataUrl } from '../utils/generateQR';

export async function checkIn(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.reservationId).populate('room');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'confirmed') throw new AppError('Reservation must be confirmed before check-in', 400);

  const room = await Room.findById(reservation.room);
  if (!room) throw new AppError('Room not found', 404);

  // Create guest session token (24h)
  const qrSessionToken = uuidv4();
  const qrSessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
  });

  // Create Bill
  const bill = await Bill.create({
    guest: guest._id,
    reservation: reservation._id,
    lineItems: [{
      type: 'room',
      description: `Room charge: ${room.name} (${reservation.totalNights} nights)`,
      amount: reservation.roomCharges,
      date: new Date(),
    }],
  });
  (bill as any).recalculate();
  await bill.save();

  guest.bill = bill._id as any;
  await guest.save();

  // Update reservation status
  reservation.status = 'checked_in';
  await reservation.save();

  // Refresh room QR token for this guest
  room.qrToken = generateQRToken();
  room.qrCodeUrl = await generateQRDataUrl(room.qrToken, process.env.CLIENT_URL || 'http://localhost:3000');
  await room.save();

  res.json({ success: true, guest, bill, qrToken: room.qrToken, qrCodeUrl: room.qrCodeUrl });
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

  // Update reservation
  await Reservation.findByIdAndUpdate(guest.reservation, { status: 'checked_out' });

  res.json({ success: true, bill });
}
