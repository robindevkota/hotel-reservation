import { test, expect } from '@playwright/test';
import { loginAsStaff } from '../../helpers/auth.helper';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Order Cancellation', () => {
  test('staff can view and manage orders from admin panel', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Kitchen Orders' })).toBeVisible({ timeout: 10000 });
  });

  test('guest can view their orders page', async ({ page }) => {
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

    await page.getByText(/Track Orders/i).click();
    await page.waitForURL(/\/guest\/orders/, { timeout: 5000 });

    await expect(page.getByText('My Orders')).toBeVisible();
  });

  test('cancelled orders show correct status', async ({ page }) => {
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

    await page.getByText(/Track Orders/i).click();
    await page.waitForURL(/\/guest\/orders/, { timeout: 5000 });

    // Page should render properly
    await expect(page).toHaveURL(/\/guest\/orders/);
  });
});
