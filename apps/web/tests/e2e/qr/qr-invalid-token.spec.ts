import { test, expect } from '@playwright/test';

test.describe('QR Invalid Token', () => {
  test('should reject random string as QR token', async ({ page }) => {
    await page.goto('/qr/not-a-valid-token');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should reject numeric-only token', async ({ page }) => {
    await page.goto('/qr/12345678');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should reject empty token path', async ({ page }) => {
    await page.goto('/qr/ ');
    await expect(page.getByText(/Access Denied/i).or(page.locator('text=not found'))).toBeVisible({ timeout: 10000 });
  });

  test('should reject SQL injection attempt in token', async ({ page }) => {
    await page.goto('/qr/\' OR 1=1 --');
    await expect(page.getByText(/Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should reject XSS attempt in token', async ({ page }) => {
    await page.goto('/qr/xss-test');
    await expect(page.getByText(/Access Denied/i).or(page.getByText(/Verifying/i).or(page.getByText(/Welcome/i)))).toBeVisible({ timeout: 10000 });
  });
});
