import { Request, Response } from 'express';
import { body } from 'express-validator';
import Room from '../models/Room';
import Reservation from '../models/Reservation';
import { AppError } from '../middleware/errorHandler';
import { generateQRToken, generateQRDataUrl } from '../utils/generateQR';

export const roomValidation = [
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().isSlug(),
  body('type').isIn(['standard', 'deluxe', 'suite', 'royal']),
  body('pricePerNight').isFloat({ min: 0 }),
  body('capacity').isInt({ min: 1 }),
  body('description').trim().notEmpty(),
  body('floorNumber').isInt({ min: 1 }),
  body('roomNumber').trim().notEmpty(),
];

export async function listRooms(req: Request, res: Response): Promise<void> {
  const { type, minPrice, maxPrice, available } = req.query;
  const filter: Record<string, unknown> = {};

  if (type) filter.type = type;
  if (available === 'true') filter.isAvailable = true;
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) (filter.pricePerNight as Record<string,number>).$gte = Number(minPrice);
    if (maxPrice) (filter.pricePerNight as Record<string,number>).$lte = Number(maxPrice);
  }

  const rooms = await Room.find(filter).select('-qrToken');
  res.json({ success: true, rooms });
}

export async function getRoomBySlug(req: Request, res: Response): Promise<void> {
  const room = await Room.findOne({ slug: req.params.slug }).select('-qrToken');
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, room });
}

export async function getRoomById(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, room });
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const token = generateQRToken();
  const qrDataUrl = await generateQRDataUrl(token, process.env.CLIENT_URL || 'http://localhost:3000');

  const room = await Room.create({ ...req.body, qrToken: token, qrCodeUrl: qrDataUrl });
  res.status(201).json({ success: true, room });
}

export async function updateRoom(req: Request, res: Response): Promise<void> {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, room });
}

export async function deleteRoom(req: Request, res: Response): Promise<void> {
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, message: 'Room deleted' });
}

// Returns all rooms with their availability status for a date range
// Also includes today's reservation/occupancy info for admin calendar
export async function getRoomAvailability(req: Request, res: Response): Promise<void> {
  const { checkIn, checkOut } = req.query;

  const allRooms = await Room.find().select('-qrToken').lean();

  if (!checkIn || !checkOut) {
    // No dates — return all rooms with today's status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeReservations = await Reservation.find({
      status: { $in: ['confirmed', 'checked_in'] },
      checkInDate: { $lt: tomorrow },
      checkOutDate: { $gt: today },
    }).populate('room', 'name roomNumber').lean();

    const reservedRoomIds = new Set(activeReservations.map(r => String(r.room)));

    const rooms = allRooms.map(room => {
      const res = activeReservations.find(r => String(r.room) === String(room._id));
      return {
        ...room,
        availabilityStatus: res
          ? (res.status === 'checked_in' ? 'occupied' : 'reserved')
          : 'available',
        currentReservation: res ? {
          _id: res._id,
          guestName: res.guest?.name,
          checkInDate: res.checkInDate,
          checkOutDate: res.checkOutDate,
          status: res.status,
        } : null,
      };
    });

    res.json({ success: true, rooms });
    return;
  }

  const checkInDate = new Date(checkIn as string);
  // For single-day queries (same date passed for both), extend checkOut by 1 day
  const checkOutDate = new Date(checkOut as string);
  if (checkOutDate <= checkInDate) {
    checkOutDate.setDate(checkOutDate.getDate() + 1);
  }

  // Find rooms that have conflicting reservations for these dates
  const conflictingReservations = await Reservation.find({
    status: { $in: ['confirmed', 'checked_in'] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  }).lean();

  const reservationByRoom = new Map(conflictingReservations.map(r => [String(r.room), r]));

  const rooms = allRooms.map(room => {
    const res = reservationByRoom.get(String(room._id));
    return {
      ...room,
      availabilityStatus: res ? (res.status === 'checked_in' ? 'occupied' : 'reserved') : 'available',
      isAvailableForDates: !res,
      currentReservation: res ? {
        guestName: res.guest.name,
        checkInDate: res.checkInDate,
        checkOutDate: res.checkOutDate,
        status: res.status,
      } : null,
    };
  });

  res.json({ success: true, rooms, checkIn: checkInDate, checkOut: checkOutDate });
}

// Admin calendar: returns all reservations for a date range grouped by room
export async function getRoomCalendar(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date();
  const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [rooms, reservations] = await Promise.all([
    Room.find().select('name roomNumber type floorNumber pricePerNight').lean(),
    Reservation.find({
      status: { $in: ['pending', 'confirmed', 'checked_in'] },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start },
    }).select('room guest checkInDate checkOutDate status numberOfGuests').lean(),
  ]);

  res.json({ success: true, rooms, reservations, startDate: start, endDate: end });
}

export async function regenerateQR(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);

  room.qrToken = generateQRToken();
  room.qrCodeUrl = await generateQRDataUrl(room.qrToken, process.env.CLIENT_URL || 'http://localhost:3000');
  await room.save();

  res.json({ success: true, qrToken: room.qrToken, qrCodeUrl: room.qrCodeUrl });
}
