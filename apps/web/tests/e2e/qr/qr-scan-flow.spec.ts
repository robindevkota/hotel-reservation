import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('QR Scan Flow', () => {
  test('should auto-login guest via valid QR token and redirect to dashboard', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    // Get an active room's QR token
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

    // Should show loading then success
    await expect(page.getByText(/Verifying your session/i)).toBeVisible({ timeout: 5000 });

    // Should redirect to guest dashboard
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/guest\/dashboard/);
  });

  test('should show welcome message after successful QR verification', async ({ page }) => {
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

    // Wait for redirect
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    // Should see welcome content
    await expect(page.getByText(/Your Royal Stay/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('QR Expired Token', () => {
  test('should show graceful error for expired/invalid QR token', async ({ page }) => {
    await page.goto('/qr/expired-token-xyz');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/contact the front desk/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error for empty token', async ({ page }) => {
    await page.goto('/qr/');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error for malformed token', async ({ page }) => {
    await page.goto('/qr/!!!invalid!!!');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('QR Invalid Token', () => {
  test('should not allow access with random UUID token', async ({ page }) => {
    await page.goto('/qr/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should not allow access with previously used token after checkout', async ({ page }) => {
    await page.goto('/qr/checked-out-room-token');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });
});
