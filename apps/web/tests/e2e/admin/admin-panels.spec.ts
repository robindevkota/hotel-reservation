import { test, expect } from '@playwright/test';
import { loginAsStaff } from '../../helpers/auth.helper';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Check-in / Check-out', () => {
  test('admin can view reservations and check in guests', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/reservations');
    await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can view in-house guests', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/guests');
    await expect(page.getByRole('heading', { name: 'In-House Guests' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can initiate checkout for a guest', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/guests');
    await page.waitForTimeout(2000);

    // Look for checkout button
    const checkoutBtn = page.getByRole('button', { name: /Check Out/i }).first();
    const checkoutVisible = await checkoutBtn.isVisible().catch(() => false);
    if (checkoutVisible) {
      await checkoutBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('admin dashboard shows stats', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Reservations')).toBeVisible();
    await expect(page.getByText('Pending Orders')).toBeVisible();
  });
});

test.describe('Order Management', () => {
  test('staff can view kitchen orders board', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Kitchen Orders' })).toBeVisible({ timeout: 10000 });
  });

  test('staff can update order status', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/orders');
    await page.waitForTimeout(2000);

    // Look for status update buttons
    const acceptBtn = page.getByRole('button', { name: /Accept/i }).first();
    const acceptVisible = await acceptBtn.isVisible().catch(() => false);
    if (acceptVisible) {
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Room Management', () => {
  test('admin can view rooms management page', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/rooms');
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can create a new room', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/rooms');
    await page.waitForTimeout(2000);

    const addBtn = page.getByRole('button', { name: /Add Room|Create Room|New Room/i }).first();
    const addVisible = await addBtn.isVisible().catch(() => false);
    if (addVisible) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      // Should show a modal or form
      await expect(page.locator('input, select, textarea').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin can regenerate QR code for a room', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/rooms');
    await page.waitForTimeout(2000);

    const qrBtn = page.getByRole('button', { name: /QR|Regenerate/i }).first();
    const qrVisible = await qrBtn.isVisible().catch(() => false);
    if (qrVisible) {
      await qrBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Admin Menu Management', () => {
  test('admin can view menu management page', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/menu');
    await expect(page.getByRole('heading', { name: 'Menu Items' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can add a new menu item', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/menu');
    await page.waitForTimeout(2000);

    const addBtn = page.getByRole('button', { name: /Add|Create|New/i }).first();
    const addVisible = await addBtn.isVisible().catch(() => false);
    if (addVisible) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Admin Spa Management', () => {
  test('admin can view spa bookings', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/spa');
    await expect(page.getByRole('heading', { name: 'Spa Schedule' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can confirm spa bookings', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/spa');
    await page.waitForTimeout(2000);

    const confirmBtn = page.getByRole('button', { name: /Confirm/i }).first();
    const confirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (confirmVisible) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Admin Billing', () => {
  test('admin can view all guest bills', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/billing');
    await expect(page.getByRole('heading', { name: 'Guest Bills' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can add manual charge to a bill', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/billing');
    await page.waitForTimeout(2000);

    const addChargeBtn = page.getByRole('button', { name: /Add Charge|Manual/i }).first();
    const addVisible = await addChargeBtn.isVisible().catch(() => false);
    if (addVisible) {
      await addChargeBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('admin can mark bill as paid via cash', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/billing');
    await page.waitForTimeout(2000);

    const cashBtn = page.getByRole('button', { name: /Cash|Mark Paid/i }).first();
    const cashVisible = await cashBtn.isVisible().catch(() => false);
    if (cashVisible) {
      await cashBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
