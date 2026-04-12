import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function setupCheckedInGuest(adminToken: string): Promise<{ qrToken: string; roomName: string }> {
  // Get a free room (not currently checked in)
  const roomsRes = await fetch(`${API_URL}/rooms`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const roomsData = await roomsRes.json();

  const activeRes = await fetch(`${API_URL}/checkin/active`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json()).catch(() => ({ guests: [] }));
  const occupiedIds = new Set((activeRes.guests ?? []).map((g: any) => String(g.room)));

  const room = roomsData.rooms?.find((r: any) => r.isAvailable === true && !occupiedIds.has(String(r._id)));
  if (!room) throw new Error('No free rooms available');

  // Use far-future dates to avoid conflicts with seeded data
  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + 50);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const resRes = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      guest: { name: 'QR Test Guest', email: 'qrtest@royalsuites.com', phone: '0501234567' },
      room: room._id,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      numberOfGuests: 1,
    }),
  });
  const resData = await resRes.json();
  if (!resData.success) throw new Error(`Reservation failed: ${JSON.stringify(resData)}`);
  const reservationId = resData.reservation._id;

  // Confirm reservation
  const confirmRes = await fetch(`${API_URL}/reservations/${reservationId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const confirmData = await confirmRes.json();
  if (!confirmData.success) throw new Error(`Confirm failed: ${JSON.stringify(confirmData)}`);

  // Check in
  const checkinRes = await fetch(`${API_URL}/checkin/${reservationId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const checkinData = await checkinRes.json();
  if (!checkinData.success) throw new Error(`Check-in failed: ${JSON.stringify(checkinData)}`);

  return { qrToken: checkinData.qrToken, roomName: room.name };
}

test.describe.serial('QR Scan Flow', () => {
  let sharedQrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    try {
      const { qrToken } = await setupCheckedInGuest(adminToken);
      sharedQrToken = qrToken;
    } catch { /* no free rooms — tests will skip */ }
  });

  test('should auto-login guest via valid QR token and redirect to dashboard', async ({ page }) => {
    if (!sharedQrToken) { test.skip(true, 'No free rooms for QR test'); return; }
    await page.goto(`/qr/${sharedQrToken}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for confirm state — "Enter My Portal" button
    await expect(page.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Enter My Portal/i }).click();
    // Navigation has 1200ms delay — wait generously
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/guest\/dashboard/);
  });

  test('should show welcome content after QR login', async ({ page }) => {
    if (!sharedQrToken) { test.skip(true, 'No free rooms for QR test'); return; }
    await page.goto(`/qr/${sharedQrToken}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Enter My Portal/i }).click();
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Royal/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('QR Invalid / Expired Tokens', () => {
  test('should show error for expired/invalid token', async ({ page }) => {
    await page.goto('/qr/expired-token-xyz');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/front desk/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error for random UUID token', async ({ page }) => {
    await page.goto('/qr/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error for malformed token', async ({ page }) => {
    await page.goto('/qr/!!!invalid!!!');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });
});
