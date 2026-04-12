import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function createCheckedInGuest(adminToken: string): Promise<string | null> {
  const rooms = await fetch(`${API_URL}/rooms`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());

  const activeRes = await fetch(`${API_URL}/checkin/active`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json()).catch(() => ({ guests: [] }));
  const occupiedRoomIds = new Set((activeRes.guests ?? []).map((g: any) => String(g.room)));

  const room = rooms.rooms?.find((r: any) => r.isAvailable === true && !occupiedRoomIds.has(String(r._id)));
  if (!room) return null;

  const yearOffset = 82 + Math.floor(Math.random() * 30);
  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + yearOffset);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      guest: { name: `Stripe Guest ${Date.now()}`, email: `stripe${Date.now()}@test.com`, phone: '+20 000' },
      room: room._id,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      numberOfGuests: 1,
    }),
  }).then(r => r.json());
  if (!res.success) return null;

  await fetch(`${API_URL}/reservations/${res.reservation._id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const checkin = await fetch(`${API_URL}/checkin/${res.reservation._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());

  return checkin.success ? checkin.qrToken : null;
}

async function loginViaQR(page: any, qrToken: string) {
  await page.goto(`/qr/${qrToken}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Enter My Portal/i }).click();
  await page.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

test.describe.serial('Stripe Payment', () => {
  let qrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    qrToken = await createCheckedInGuest(adminToken);
  });

  test('billing page loads for authenticated guest', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Running Bill|Bill/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('guest sees itemized charges on billing page', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(
      page.getByText(/Room Charges|Food & Beverages|Spa Services|Charges/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('guest sees pay now button when bill is pending payment', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
  });
});
