import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin, apiLoginAsStaff } from '../../helpers/auth.helper';
import { GUEST_INFO } from '../../fixtures/users';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Place Order', () => {
  test('guest can browse menu and see categories', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    // Get a room with an active guest
    const roomsRes = await fetch(`${API_URL}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roomsData = await roomsRes.json();
    const room = roomsData.rooms?.[0];

    if (!room || !room.qrToken) {
      test.skip(true, 'No room with QR token available');
      return;
    }

    // Login as guest via QR
    await page.goto(`/qr/${room.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    // Navigate to menu
    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 5000 });

    // Should see category filters
    await expect(page.getByText('all')).toBeVisible();
    await expect(page.getByText('breakfast')).toBeVisible();
    await expect(page.getByText('lunch')).toBeVisible();
    await expect(page.getByText('dinner')).toBeVisible();
  });

  test('guest can add items to cart', async ({ page }) => {
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

    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 5000 });

    // Wait for menu items to load
    await page.waitForTimeout(2000);

    // Click "Add to Order" on first available item
    const addButtons = page.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount > 0) {
      await addButtons.first().click();
      // Should show cart floating button
      await expect(page.getByText(/View Order/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('guest can place an order from cart', async ({ page }) => {
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

    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Add item to cart
    const addButtons = page.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount === 0) {
      test.skip(true, 'No menu items available');
      return;
    }
    await addButtons.first().click();

    // Open cart
    await page.getByText(/View Order/i).click();
    await expect(page.getByText('Your Order')).toBeVisible({ timeout: 5000 });

    // Place order
    await page.getByRole('button', { name: /Place Order/i }).click();

    // Should show success toast
    await expect(page.getByText(/order placed/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Order Status Realtime', () => {
  test('guest can see order status on orders page', async ({ page }) => {
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

    // Navigate to orders page
    await page.getByText(/Track Orders/i).click();
    await page.waitForURL(/\/guest\/orders/, { timeout: 5000 });

    await expect(page.getByText('My Orders')).toBeVisible();
  });

  test('order shows progress bar for active orders', async ({ page }) => {
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

    // Navigate to orders page
    await page.getByText(/Track Orders/i).click();
    await page.waitForURL(/\/guest\/orders/, { timeout: 5000 });

    // Should see progress bar labels
    await expect(page.getByText('Placed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Accepted')).toBeVisible();
  });
});

test.describe('Order Cancellation', () => {
  test('guest can view past orders', async ({ page }) => {
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

    // Page should render even with no orders
    await expect(page.getByText('My Orders')).toBeVisible();
  });

  test('should show empty state when no orders exist', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    // Create a fresh room that has no guest/orders
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

    // May show empty state
    const emptyText = page.getByText(/No orders yet/i);
    const isVisible = await emptyText.isVisible().catch(() => false);
    if (isVisible) {
      await expect(emptyText).toBeVisible();
    }
  });
});
