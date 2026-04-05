import { test, expect } from '@playwright/test';
import { registerStaff } from '../../helpers/auth.helper';

test.describe('Staff Registration', () => {
  test('should register a new staff member and redirect to dashboard', async ({ page }) => {
    const uniqueEmail = `staff${Date.now()}@royalsuites.com`;
    await page.goto('/register');
    await page.fill('input[placeholder="Your full name"]', 'New Staff Member');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'NewStaff123!');
    const select = page.locator('select');
    await select.selectOption('staff');
    await page.fill('input[placeholder="Optional for first registration"]', 'royal-invite-2024');
    await page.getByRole('button', { name: /Create Account/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should register with kitchen role', async ({ page }) => {
    const uniqueEmail = `kitchen${Date.now()}@royalsuites.com`;
    await page.goto('/register');
    await page.fill('input[placeholder="Your full name"]', 'Kitchen Staff');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'Kitchen123!');
    const select = page.locator('select');
    await select.selectOption('kitchen');
    await page.fill('input[placeholder="Optional for first registration"]', 'royal-invite-2024');
    await page.getByRole('button', { name: /Create Account/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should register with waiter role', async ({ page }) => {
    const uniqueEmail = `waiter${Date.now()}@royalsuites.com`;
    await page.goto('/register');
    await page.fill('input[placeholder="Your full name"]', 'Waiter Staff');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'WaiterPass123!');
    const select = page.locator('select');
    await select.selectOption('waiter');
    await page.fill('input[placeholder="Optional for first registration"]', 'royal-invite-2024');
    await page.getByRole('button', { name: /Create Account/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});
