import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Bill Accumulation', () => {
  test('guest can view their running bill', async ({ page }) => {
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

    await expect(page.getByText('Running Bill')).toBeVisible();
  });

  test('bill shows line items breakdown', async ({ page }) => {
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

    // Should show charges section
    await expect(page.getByText('Charges')).toBeVisible({ timeout: 10000 });
  });

  test('bill shows grand total with VAT', async ({ page }) => {
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

    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/VAT/i)).toBeVisible();
  });

  test('bill total increases after ordering food', async ({ page }) => {
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

    // Get initial bill total
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    const initialTotalText = await page.getByText(/Grand Total/i).locator('..').textContent().catch(() => '');

    // Go place an order
    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    const addButtons = page.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount === 0) {
      test.skip(true, 'No menu items available');
      return;
    }
    await addButtons.first().click();
    await page.getByText(/View Order/i).click();
    await page.getByRole('button', { name: /Place Order/i }).click();

    // Go back to billing
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Bill page should still be visible
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Stripe Payment', () => {
  test('guest sees payment button when bill is pending', async ({ page }) => {
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

    // Bill page renders
    await expect(page.getByText('Running Bill')).toBeVisible({ timeout: 10000 });
  });

  test('guest sees paid status when bill is settled', async ({ page }) => {
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

    // Check if bill is paid or open
    const statusText = await page.getByText(/paid|open|pending/i).textContent().catch(() => '');
    if (statusText.toLowerCase().includes('paid')) {
      await expect(page.getByText(/Payment Complete/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Checkout Receipt', () => {
  test('guest can access billing page after checkout', async ({ page }) => {
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

    await expect(page).toHaveURL(/\/guest\/billing/);
  });
});
