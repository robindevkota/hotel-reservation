import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';
import { IGuest } from '../models/Guest';

export function signAccessToken(user: IUser): string {
  const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'] };
  return jwt.sign(
    { id: user._id, role: user.role, type: 'staff' },
    process.env.JWT_SECRET!,
    opts
  );
}

export function signRefreshToken(user: IUser): string {
  const opts: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'] };
  return jwt.sign(
    { id: user._id, type: 'staff' },
    process.env.JWT_REFRESH_SECRET!,
    opts
  );
}

export function signGuestToken(guest: IGuest): string {
  return jwt.sign(
    { id: guest._id, role: 'guest', type: 'guest', roomId: guest.room },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export function verifyRefreshToken(token: string): { id: string; type: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string; type: string };
}
