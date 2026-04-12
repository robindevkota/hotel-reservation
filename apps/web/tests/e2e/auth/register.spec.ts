import { test, expect } from '@playwright/test';
import { loginAsAdmin, gotoRegisterPage } from '../../helpers/auth.helper';

// Register page is super_admin-only — requires admin auth before navigating
test.describe('Staff Registration', () => {
  test('should register a new admin member and show success', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);

    const uniqueEmail = `admin${Date.now()}@royalsuites.com`;
    await page.fill('input[placeholder="Admin full name"]', 'New Admin Member');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'AdminPass123!');
    const select = page.locator('select');
    await select.selectOption('front_desk');
    await page.getByRole('button', { name: /Create Admin/i }).click();

    await expect(page.getByText(/Admin created/i)).toBeVisible({ timeout: 8000 });
  });

  test('should register with spa department', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);

    const uniqueEmail = `spa${Date.now()}@royalsuites.com`;
    await page.fill('input[placeholder="Admin full name"]', 'Spa Admin');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'SpaPass123!');
    await page.locator('select').selectOption('spa');
    await page.getByRole('button', { name: /Create Admin/i }).click();

    await expect(page.getByText(/Admin created/i)).toBeVisible({ timeout: 8000 });
  });

  test('should register with food department', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);

    const uniqueEmail = `food${Date.now()}@royalsuites.com`;
    await page.fill('input[placeholder="Admin full name"]', 'Food Admin');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'FoodPass123!');
    await page.locator('select').selectOption('food');
    await page.getByRole('button', { name: /Create Admin/i }).click();

    await expect(page.getByText(/Admin created/i)).toBeVisible({ timeout: 8000 });
  });
});
