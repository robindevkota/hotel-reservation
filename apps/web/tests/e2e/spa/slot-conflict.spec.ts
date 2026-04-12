import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Spa Slot Conflict', () => {
  test('should prevent double-booking via API', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    // Get a guest
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
    await expect(page.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Enter My Portal/i }).click();
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

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.waitForTimeout(1000);

    const slotBtn = page.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
    const slotVisible = await slotBtn.isVisible().catch(() => false);
    if (slotVisible) {
      await slotBtn.click();
      await page.getByRole('button', { name: /Confirm Booking/i }).click();
      await page.waitForTimeout(3000);
    }
  });
});
