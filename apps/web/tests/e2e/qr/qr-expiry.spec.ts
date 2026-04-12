import { test, expect } from '@playwright/test';

test.describe('QR Expired Token', () => {
  test('should show graceful error for expired token', async ({ page }) => {
    await page.goto('/qr/expired-token-xyz');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Invalid or expired/i).or(page.getByText(/front desk/i))).toBeVisible({ timeout: 5000 });
  });

  test('should display pharaoh emblem on error page', async ({ page }) => {
    await page.goto('/qr/expired-token-xyz');
    await expect(page.getByText(/ROYAL SUITES/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Guest Portal/i)).toBeVisible();
  });

  test('should suggest contacting front desk', async ({ page }) => {
    await page.goto('/qr/expired-token-xyz');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
    // Page shows "Visit the front desk or call reception for assistance"
    await expect(page.getByText(/front desk/i)).toBeVisible({ timeout: 5000 });
  });
});
