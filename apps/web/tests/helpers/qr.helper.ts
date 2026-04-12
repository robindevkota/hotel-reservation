import { Page } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function simulateQRScan(page: Page, token: string) {
  await page.goto(`/qr/${token}`);
}

/**
 * GET /rooms excludes qrToken (.select('-qrToken')).
 * Use GET /rooms/:id/qr (admin-only) to get the real qrToken for a room by number.
 * Also triggers the self-heal: sets isAvailable=false if an active guest exists.
 */
export async function getActiveRoomQRToken(roomNumber: string, adminToken: string): Promise<string> {
  const listRes = await fetch(`${API_URL}/rooms`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listData = await listRes.json();
  const room = listData.rooms?.find((r: any) => r.roomNumber === roomNumber);
  if (!room) throw new Error(`Room ${roomNumber} not found`);
  return apiGetQRTokenForRoom(room._id, adminToken);
}

/**
 * Fetch the room's current qrToken via GET /rooms/:id/qr.
 * This endpoint also self-heals isAvailable and generates qrCodeUrl if missing.
 */
export async function apiGetQRTokenForRoom(roomId: string, adminToken: string): Promise<string> {
  const res = await fetch(`${API_URL}/rooms/${roomId}/qr`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();
  // getRoomById returns { success, room } — qrToken is on room object
  return data.room?.qrToken ?? data.qrToken;
}
