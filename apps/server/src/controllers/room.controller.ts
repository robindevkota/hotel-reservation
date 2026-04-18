import { Request, Response } from 'express';
import { body } from 'express-validator';
import Room from '../models/Room';
import Reservation from '../models/Reservation';
import Guest from '../models/Guest';
import { AppError } from '../middleware/errorHandler';
import { generateQRToken } from '../utils/generateQR';
import cloudinary from '../config/cloudinary';

export const roomValidation = [
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty().isSlug(),
  body('type').trim().notEmpty(),
  body('pricePerNight').isFloat({ min: 0 }),
  body('capacity').isInt({ min: 1 }),
  body('description').trim().notEmpty(),
  body('floorNumber').isInt({ min: 1 }),
  body('roomNumber').trim().notEmpty(),
  body('areaSqm').optional().isFloat({ min: 0 }),
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

  // Correct isAvailable if an active guest exists but room wasn't marked occupied (seed bug)
  if (room.isAvailable) {
    const activeGuest = await Guest.findOne({ room: room._id, isActive: true });
    if (activeGuest) {
      room.isAvailable = false;
      await room.save();
    }
  }

  res.json({ success: true, room });
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const token = generateQRToken();
  const room = await Room.create({ ...req.body, qrToken: token });
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

export async function uploadRoomImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new AppError('No file provided', 400);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'rooms' },
      (err, data) => err ? reject(err) : resolve(data as { secure_url: string })
    ).end(req.file!.buffer);
  });

  res.json({ success: true, url: result.secure_url });
}

export async function deleteRoomImage(req: Request, res: Response): Promise<void> {
  const { imageUrl } = req.body;
  if (!imageUrl) throw new AppError('imageUrl is required', 400);

  // Only delete from Cloudinary if it's a Cloudinary URL
  if (imageUrl.includes('cloudinary.com')) {
    const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (matches?.[1]) {
      await cloudinary.uploader.destroy(matches[1]);
    }
  }

  // Remove from room's images array
  const { roomId } = req.body;
  if (roomId) {
    await Room.findByIdAndUpdate(roomId, { $pull: { images: imageUrl } });
  }

  res.json({ success: true });
}

export async function regenerateQR(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);

  // Block regeneration while a guest is checked in — their QR would stop working
  const activeGuest = await Guest.findOne({ room: room._id, isActive: true });
  if (activeGuest) throw new AppError('Cannot regenerate QR while a guest is checked in to this room', 400);

  room.qrToken = generateQRToken();
  await room.save();

  res.json({ success: true, qrToken: room.qrToken });
}
