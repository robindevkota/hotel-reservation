import { Request, Response } from 'express';
import { body } from 'express-validator';
import Room from '../models/Room';
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

export async function regenerateQR(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found', 404);

  room.qrToken = generateQRToken();
  room.qrCodeUrl = await generateQRDataUrl(room.qrToken, process.env.CLIENT_URL || 'http://localhost:3000');
  await room.save();

  res.json({ success: true, qrToken: room.qrToken, qrCodeUrl: room.qrCodeUrl });
}
