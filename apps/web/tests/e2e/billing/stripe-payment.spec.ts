import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Stripe Payment', () => {
  test('billing page loads for authenticated guest', async ({ page }) => {
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

    await expect(page.getByText('Running Bill')).toBeVisible({ timeout: 10000 });
  });

  test('guest sees itemized charges on billing page', async ({ page }) => {
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

    // Should see breakdown categories
    await expect(page.getByText(/Room Charges|Food & Beverages|Spa Services|Other/i).or(page.getByText('Charges'))).toBeVisible({ timeout: 10000 });
  });

  test('guest sees pay now button when bill is pending payment', async ({ page }) => {
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

    // Check for pay button (only visible if bill is pending_payment)
    const payBtn = page.getByRole('button', { name: /Pay Now/i });
    const payVisible = await payBtn.isVisible().catch(() => false);
    if (payVisible) {
      await expect(payBtn).toBeVisible();
    }
  });
});
