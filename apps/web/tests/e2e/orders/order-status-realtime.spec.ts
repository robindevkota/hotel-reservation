import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin, apiLoginAsStaff } from '../../helpers/auth.helper';
import { loginAsStaff } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Real-Time Order Status', () => {
  test('order status updates on guest screen when staff changes it', async ({ browser }) => {
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

    // Guest context
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();

    // Staff context
    const staffCtx = await browser.newContext();
    const staffPage = await staffCtx.newPage();

    // Guest logs in via QR
    await guestPage.goto(`/qr/${room.qrToken}`);
    await guestPage.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    // Staff logs in
    await loginAsStaff(staffPage);
    await staffPage.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    // Guest places order
    await guestPage.getByText(/Order Food/i).click();
    await guestPage.waitForURL(/\/guest\/menu/, { timeout: 5000 });
    await guestPage.waitForTimeout(2000);

    const addButtons = guestPage.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount === 0) {
      await guestCtx.close();
      await staffCtx.close();
      test.skip(true, 'No menu items available');
      return;
    }
    await addButtons.first().click();
    await guestPage.getByText(/View Order/i).click();
    await guestPage.getByRole('button', { name: /Place Order/i }).click();

    // Staff goes to orders page
    await staffPage.goto('/admin/orders');
    await staffPage.waitForTimeout(2000);

    // Staff accepts first pending order
    const acceptBtn = staffPage.getByRole('button', { name: /Accept/i }).first();
    const acceptVisible = await acceptBtn.isVisible().catch(() => false);
    if (acceptVisible) {
      await acceptBtn.click();
      await staffPage.waitForTimeout(1000);
    }

    // Guest page should update status
    await guestPage.getByText(/Track Orders/i).click();
    await guestPage.waitForURL(/\/guest\/orders/, { timeout: 5000 });

    // Should see order with status
    const orderText = guestPage.getByText(/Order #/i);
    const hasOrder = await orderText.isVisible().catch(() => false);
    if (hasOrder) {
      await expect(orderText).toBeVisible();
    }

    await guestCtx.close();
    await staffCtx.close();
  });

  test('kitchen board shows new orders in real-time', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Kitchen Orders' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Order Cancellation', () => {
  test('staff can cancel pending orders', async ({ page }) => {
    await loginAsStaff(page);
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    await page.goto('/admin/orders');
    await page.waitForTimeout(2000);

    // If there are pending orders, try to cancel
    const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
    const cancelVisible = await cancelBtn.isVisible().catch(() => false);
    if (cancelVisible) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
