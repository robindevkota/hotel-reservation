import { Request, Response } from 'express';
import { body } from 'express-validator';
import Reservation from '../models/Reservation';
import Room from '../models/Room';
import { AppError } from '../middleware/errorHandler';
import { sendReservationConfirmation } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const reservationValidation = [
  body('guest.name').trim().notEmpty(),
  body('guest.email').isEmail().normalizeEmail(),
  body('guest.phone').trim().notEmpty(),
  body('room').isMongoId(),
  body('checkInDate').isISO8601(),
  body('checkOutDate').isISO8601(),
  body('numberOfGuests').isInt({ min: 1 }),
];

export async function createReservation(req: Request, res: Response): Promise<void> {
  const { guest, room: roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = req.body;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkOut <= checkIn) throw new AppError('Check-out must be after check-in', 400);

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);
  if (!room.isAvailable) throw new AppError('Room is not available', 400);

  // Check for conflicting reservations
  const conflict = await Reservation.findOne({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
    ],
  });
  if (conflict) throw new AppError('Room is already booked for these dates', 409);

  const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const roomCharges = totalNights * room.pricePerNight;

  const reservation = await Reservation.create({
    guest,
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests,
    specialRequests,
    totalNights,
    roomCharges,
  });

  // Send confirmation email (non-blocking)
  sendReservationConfirmation(
    guest.email, guest.name, String(reservation._id),
    checkIn, checkOut, room.name
  ).catch(console.error);

  res.status(201).json({ success: true, reservation });
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(filter).populate('room', 'name roomNumber type').sort('-createdAt').skip(skip).limit(Number(limit)),
    Reservation.countDocuments(filter),
  ]);
  res.json({ success: true, reservations, total, page: Number(page) });
}

export async function getReservation(req: AuthRequest, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id).populate('room', 'name roomNumber type images');
  if (!reservation) throw new AppError('Reservation not found', 404);
  res.json({ success: true, reservation });
}

export async function confirmReservation(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'pending') throw new AppError('Can only confirm pending reservations', 400);

  reservation.status = 'confirmed';
  await reservation.save();
  res.json({ success: true, reservation });
}

export async function cancelReservation(req: AuthRequest, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (['checked_in', 'checked_out'].includes(reservation.status)) {
    throw new AppError('Cannot cancel a checked-in or completed reservation', 400);
  }

  reservation.status = 'cancelled';
  await reservation.save();
  res.json({ success: true, reservation });
}
