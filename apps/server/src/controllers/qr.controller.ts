import { Request, Response } from 'express';
import Room from '../models/Room';
import Guest from '../models/Guest';
import { AppError } from '../middleware/errorHandler';
import { signGuestToken } from '../utils/jwt';
import { generateQRToken, generateQRDataUrl } from '../utils/generateQR';

export async function verifyQR(req: Request, res: Response): Promise<void> {
  const { roomToken } = req.params;

  const room = await Room.findOne({ qrToken: roomToken });
  if (!room) throw new AppError('Invalid QR code', 404);

  // Find active guest for this room
  const guest = await Guest.findOne({ room: room._id, isActive: true });
  if (!guest) throw new AppError('No active guest for this room', 404);

  // Check session expiry
  if (guest.qrSessionExpiry < new Date()) {
    throw new AppError('QR session expired. Please contact the front desk.', 401);
  }

  // Issue short-lived guest JWT
  const token = signGuestToken(guest);

  res.json({ success: true, token, guestId: guest._id, roomId: room._id, roomName: room.name });
}

export async function refreshQR(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.roomId);
  if (!room) throw new AppError('Room not found', 404);

  room.qrToken = generateQRToken();
  room.qrCodeUrl = await generateQRDataUrl(room.qrToken, process.env.CLIENT_URL || 'http://localhost:3000');
  await room.save();

  res.json({ success: true, qrToken: room.qrToken, qrCodeUrl: room.qrCodeUrl });
}
