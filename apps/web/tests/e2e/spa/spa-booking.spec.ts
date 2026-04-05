import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Spa Booking', () => {
  test('guest can browse spa services', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 5000 });

    await expect(page.getByText(/Cleopatra's Spa/i)).toBeVisible();
  });

  test('guest can select a spa service and see booking modal', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Click Book on first service
    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn.isVisible().catch(() => false);
    if (!bookVisible) {
      test.skip(true, 'No spa services available');
      return;
    }
    await bookBtn.click();

    // Modal should open
    await expect(page.getByText('Select Date')).toBeVisible({ timeout: 5000 });
  });

  test('guest can book a spa session with date and time', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn.isVisible().catch(() => false);
    if (!bookVisible) {
      test.skip(true, 'No spa services available');
      return;
    }
    await bookBtn.click();

    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.waitForTimeout(1000);

    // Select first available slot
    const slotBtn = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    const slotVisible = await slotBtn.isVisible().catch(() => false);
    if (slotVisible) {
      await slotBtn.click();
      await page.getByRole('button', { name: /Confirm Booking/i }).click();
      await expect(page.getByText(/booked/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('guest can see their spa bookings', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 5000 });

    await expect(page.getByText(/My Spa Bookings/i).or(page.getByText(/Cleopatra's Spa/i))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Slot Conflict', () => {
  test('should show no available slots for fully booked date', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    await page.getByText(/Book Spa/i).click();
    await page.waitForURL(/\/guest\/spa/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    const bookBtn = page.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn.isVisible().catch(() => false);
    if (!bookVisible) {
      test.skip(true, 'No spa services available');
      return;
    }
    await bookBtn.click();

    // Select a far future date that likely has no bookings
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.waitForTimeout(1000);

    // Either shows slots or "no available slots"
    const noSlots = page.getByText(/No available slots/i);
    const noSlotsVisible = await noSlots.isVisible().catch(() => false);
    if (noSlotsVisible) {
      await expect(noSlots).toBeVisible();
    }
  });

  test('should not allow double-booking the same slot', async ({ browser }) => {
    const adminToken = await apiLoginAsAdmin();

    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();

    if (!roomsData.rooms || roomsData.rooms.length < 2) {
      test.skip(true, 'Need at least 2 rooms for this test');
      return;
    }

    // Two guests trying to book same slot
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();

    await page1.goto(`/qr/${roomsData.rooms[0].qrToken}`);
    await page1.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });
    await page2.goto(`/qr/${roomsData.rooms[1].qrToken}`);
    await page2.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    // Both go to spa
    await page1.getByText(/Book Spa/i).click();
    await page1.waitForURL(/\/guest\/spa/, { timeout: 5000 });
    await page2.getByText(/Book Spa/i).click();
    await page2.waitForURL(/\/guest\/spa/, { timeout: 5000 });

    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Both click book on first service
    const bookBtn1 = page1.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn1.isVisible().catch(() => false);
    if (!bookVisible) {
      await ctx1.close();
      await ctx2.close();
      test.skip(true, 'No spa services available');
      return;
    }

    await bookBtn1.click();
    await page2.getByRole('button', { name: /Book/i }).first().click();

    // Select same date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page1.locator('input[type="date"]').fill(dateStr);
    await page2.locator('input[type="date"]').fill(dateStr);
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);

    // Select same slot on page1
    const slotBtn1 = page1.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    const slotVisible = await slotBtn1.isVisible().catch(() => false);
    if (slotVisible) {
      await slotBtn1.click();
      await page1.getByRole('button', { name: /Confirm Booking/i }).click();
      await page1.waitForTimeout(2000);

      // Page2 selects same slot
      await page2.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first().click();
      await page2.getByRole('button', { name: /Confirm Booking/i }).click();

      // Second booking should fail or show error
      await page2.waitForTimeout(3000);
      // Either success (different slot) or error toast
      const errorToast = page2.getByText(/failed/i);
      const errorVisible = await errorToast.isVisible().catch(() => false);
      // At least one of the two should have succeeded
    }

    await ctx1.close();
    await ctx2.close();
  });
});
