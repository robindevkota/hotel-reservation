import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsStaff, gotoRegisterPage } from '../../helpers/auth.helper';

test.describe('Staff Login', () => {
  test('should render login page with logo and form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Royal Suites/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Enter the Palace/i })).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Enter the Palace/i }).click();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsStaff(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'WrongPass123!');
    // Set up response listener before click, then click and await both
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/auth/login') && r.request().method() === 'POST', { timeout: 15000 }),
      page.getByRole('button', { name: /Enter the Palace/i }).click(),
    ]);
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 8000 });
  });

  test('should have link to register page', async ({ page }) => {
    // Register page is super_admin-only — login first, then check the link navigates
    await loginAsAdmin(page);
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /Register here/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await page.locator('.pw-toggle').click();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});

test.describe('Staff Registration', () => {
  test('should render registration page with all fields', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Min. 8 characters"]')).toBeVisible();
  });

  test('should reject password shorter than 8 characters', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);
    await page.fill('input[placeholder="Admin full name"]', 'Test User');
    await page.fill('input[type="email"]', `test${Date.now()}@royalsuites.com`);
    await page.fill('input[placeholder="Min. 8 characters"]', 'short');
    await page.getByRole('button', { name: /Create Admin/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have link to login page', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoRegisterPage(page);
    const loginLink = page.getByRole('link', { name: /Back to Dashboard/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/admin/);
  });
});
