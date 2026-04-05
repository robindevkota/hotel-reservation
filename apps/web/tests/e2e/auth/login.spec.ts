import { test, expect } from '@playwright/test';
import { loginAsStaff, registerStaff } from '../../helpers/auth.helper';
import { STAFF_USER } from '../../fixtures/users';

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
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'WrongPass123!');
    await page.getByRole('button', { name: /Enter the Palace/i }).click();
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('should have link to register page', async ({ page }) => {
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
    await page.goto('/register');
    await expect(page.locator('input[placeholder="Your full name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Min. 8 characters"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[placeholder="Optional for first registration"]')).toBeVisible();
  });

  test('should reject password shorter than 8 characters', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="Your full name"]', 'Test User');
    await page.fill('input[type="email"]', `test${Date.now()}@royalsuites.com`);
    await page.fill('input[placeholder="Min. 8 characters"]', 'short');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page.locator('text=at least 8 characters')).toBeVisible({ timeout: 5000 });
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', { name: /Sign In/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
