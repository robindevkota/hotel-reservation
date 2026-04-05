import { Page } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function simulateQRScan(page: Page, token: string) {
  await page.goto(`/qr/${token}`);
}

export async function getActiveRoomQRToken(roomNumber: string, token: string): Promise<string> {
  const res = await fetch(`${API_URL}/rooms`);
  const data = await res.json();
  const room = data.rooms?.find((r: any) => r.roomNumber === roomNumber);
  return room?.qrToken || token;
}

export async function apiGetQRTokenForRoom(roomId: string, adminToken: string): Promise<string> {
  const res = await fetch(`${API_URL}/rooms/${roomId}/qr`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();
  return data.qrToken;
}
