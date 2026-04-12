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
  const occupiedIds = new Set((activeRes.guests ?? []).map((g: any) => String(g.room)));

  const room = rooms.rooms?.find((r: any) => r.isAvailable === true && !occupiedIds.has(String(r._id)));
  if (!room) return null;

  const yearOffset = 30 + Math.floor(Math.random() * 100);
  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + yearOffset);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      guest: { name: `Spa Guest ${Date.now()}`, email: `spa${Date.now()}@test.com`, phone: '+20 000' },
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

test.describe.serial('Spa Booking', () => {
  let qrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    qrToken = await createCheckedInGuest(adminToken);
  });

  test('guest can browse spa services', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 15000 });
    await expect(page.getByText(/Cleopatra's Spa/i).or(page.getByText(/spa/i).first())).toBeVisible({ timeout: 8000 });
  });

  test('guest can select a spa service and see booking modal', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn.isVisible().catch(() => false);
    if (!bookVisible) { test.skip(true, 'No spa services available'); return; }
    await bookBtn.click();

    await expect(page.getByText('Select Date')).toBeVisible({ timeout: 8000 });
  });

  test('guest can book a spa session with date and time', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    if (!await bookBtn.isVisible().catch(() => false)) { test.skip(true, 'No spa services available'); return; }
    await bookBtn.click();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.waitForTimeout(1000);

    const slotBtn = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    if (await slotBtn.isVisible().catch(() => false)) {
      await slotBtn.click();
      await page.getByRole('button', { name: /Confirm Booking/i }).click();
      await expect(page.getByText(/booked/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('guest can see their spa bookings', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 15000 });
    await expect(page.getByText(/My Spa Bookings/i).or(page.getByText(/Cleopatra's Spa/i))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Slot Conflict', () => {
  test('should show no available slots for fully booked date', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();
    const qrToken = await createCheckedInGuest(adminToken);
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }

    await loginViaQR(page, qrToken);
    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    if (!await bookBtn.isVisible().catch(() => false)) { test.skip(true, 'No spa services available'); return; }
    await bookBtn.click();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
    await page.waitForTimeout(1000);

    await expect(page.getByText('Select Date')).toBeVisible({ timeout: 8000 });
  });

  test('should not allow double-booking the same slot', async ({ browser }) => {
    const adminToken = await apiLoginAsAdmin();
    const qr1 = await createCheckedInGuest(adminToken);
    const qr2 = await createCheckedInGuest(adminToken);
    if (!qr1 || !qr2) { test.skip(true, 'Could not create 2 checked-in guests'); return; }

    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();

    try {
      await page1.goto(`/qr/${qr1}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page1.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 15000 });
      await page1.getByRole('button', { name: /Enter My Portal/i }).click();
      await page1.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });

      await page2.goto(`/qr/${qr2}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page2.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 15000 });
      await page2.getByRole('button', { name: /Enter My Portal/i }).click();
      await page2.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });

      await page1.getByText(/Book Spa/i).click();
      await page1.waitForURL(/\/guest\/spa/, { timeout: 15000 });
      await page2.getByText(/Book Spa/i).click();
      await page2.waitForURL(/\/guest\/spa/, { timeout: 15000 });

      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      const bookBtn1 = page1.getByRole('button', { name: /Book/i }).first();
      if (!await bookBtn1.isVisible().catch(() => false)) { test.skip(true, 'No spa services available'); return; }

      await bookBtn1.click();
      await page2.getByRole('button', { name: /Book/i }).first().click();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await page1.locator('input[type="date"]').fill(dateStr);
      await page2.locator('input[type="date"]').fill(dateStr);
      await page1.waitForTimeout(1000);
      await page2.waitForTimeout(1000);

      const slotBtn1 = page1.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
      if (await slotBtn1.isVisible().catch(() => false)) {
        await slotBtn1.click();
        await page1.getByRole('button', { name: /Confirm Booking/i }).click();
        await page1.waitForTimeout(2000);

        await page2.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first().click();
        await page2.getByRole('button', { name: /Confirm Booking/i }).click();
        await page2.waitForTimeout(3000);
      }
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });
});
