import { Request, Response } from 'express';
import Room from '../models/Room';
import Guest from '../models/Guest';
import { AppError } from '../middleware/errorHandler';
import { signGuestToken } from '../utils/jwt';
import { generateQRToken, generateQRDataUrl } from '../utils/generateQR';

export async function verifyQR(req: Request, res: Response): Promise<void> {
  const { roomToken } = req.params;
  console.log(`[QR] verifyQR called — roomToken: "${roomToken}"`);

  const room = await Room.findOne({ qrToken: roomToken });
  console.log(`[QR] Room lookup result:`, room ? `found _id=${room._id} name="${room.name}"` : 'NOT FOUND');
  if (!room) throw new AppError('Invalid QR code', 404);

  // Find active guest for this room
  const guest = await Guest.findOne({ room: room._id, isActive: true });
  console.log(`[QR] Guest lookup (room=${room._id}, isActive=true):`, guest ? `found _id=${guest._id} name="${guest.name}" expiry=${guest.qrSessionExpiry}` : 'NOT FOUND');

  // Debug: show ALL guests for this room regardless of isActive
  const allGuests = await Guest.find({ room: room._id }).select('name isActive qrSessionExpiry').lean();
  console.log(`[QR] All guests for room ${room._id}:`, JSON.stringify(allGuests));

  if (!guest) throw new AppError('No active session for this room. Please contact the front desk.', 404);

  // Check session expiry
  const now = new Date();
  console.log(`[QR] Session expiry check — expiry: ${guest.qrSessionExpiry}, now: ${now}, expired: ${guest.qrSessionExpiry < now}`);
  if (guest.qrSessionExpiry < now) {
    throw new AppError('QR session expired. Please contact the front desk.', 401);
  }

  // Issue short-lived guest JWT
  const token = signGuestToken(guest);

  res.json({
    success: true,
    token,
    guestId: guest._id,
    roomId: room._id,
    roomName: room.name,
    roomNumber: room.roomNumber,
    roomType: room.type,
    floorNumber: room.floorNumber,
    guestName: guest.name,
  });
}

export async function refreshQR(req: Request, res: Response): Promise<void> {
  const room = await Room.findById(req.params.roomId);
  if (!room) throw new AppError('Room not found', 404);

  room.qrToken = generateQRToken();
  room.qrCodeUrl = await generateQRDataUrl(room.qrToken, process.env.CLIENT_URL || 'http://localhost:3000');
  await room.save();

  res.json({ success: true, qrToken: room.qrToken, qrCodeUrl: room.qrCodeUrl });
}
