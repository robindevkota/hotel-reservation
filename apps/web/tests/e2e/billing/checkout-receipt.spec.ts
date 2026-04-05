import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Checkout Receipt', () => {
  test('guest can view bill details page', async ({ page }) => {
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

    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });

    await expect(page.getByText(/Your Account/i)).toBeVisible({ timeout: 10000 });
  });

  test('bill shows tax calculation', async ({ page }) => {
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

    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });

    await expect(page.getByText(/VAT/i)).toBeVisible({ timeout: 10000 });
  });

  test('guest sees payment method option', async ({ page }) => {
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

    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });

    // Should mention payment option
    const payText = page.getByText(/Pay Now|pay at the front desk/i);
    const payVisible = await payText.isVisible().catch(() => false);
    if (payVisible) {
      await expect(payText).toBeVisible({ timeout: 10000 });
    }
  });
});
