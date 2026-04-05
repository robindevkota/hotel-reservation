import { test, expect } from '@playwright/test';
import { loginAsStaff } from '../../helpers/auth.helper';

test.describe('Admin Profile Page', () => {
  test('should render profile page with user info', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Royal Admin')).toBeVisible();
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('should show change password form', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');
    await expect(page.getByText('Change Password')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Enter current password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Min. 8 characters"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Repeat new password"]')).toBeVisible();
  });

  test('should show error when new passwords do not match', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');

    await page.fill('input[placeholder="Enter current password"]', 'RoyalAdmin@123');
    await page.fill('input[placeholder="Min. 8 characters"]', 'NewPass@123');
    await page.fill('input[placeholder="Repeat new password"]', 'DifferentPass@123');

    await expect(page.getByText('Passwords do not match')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for wrong current password', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');

    await page.fill('input[placeholder="Enter current password"]', 'WrongPassword@123');
    await page.fill('input[placeholder="Min. 8 characters"]', 'NewPass@123');
    await page.fill('input[placeholder="Repeat new password"]', 'NewPass@123');

    await page.getByRole('button', { name: /Update Password/i }).click();
    await expect(page.getByText(/Current password is incorrect/i)).toBeVisible({ timeout: 6000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');

    const currentInput = page.locator('input[placeholder="Enter current password"]');
    await expect(currentInput).toHaveAttribute('type', 'password');

    // Click the eye icon next to current password field
    await currentInput.fill('testpass');
    const toggleBtns = page.locator('button[type="button"]');
    await toggleBtns.first().click();
    await expect(page.locator('input[placeholder="Enter current password"]')).toHaveAttribute('type', 'text');
  });

  test('should show password strength bar', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/profile');

    await page.fill('input[placeholder="Min. 8 characters"]', 'weak');
    await expect(page.getByText('Weak')).toBeVisible({ timeout: 3000 });

    await page.fill('input[placeholder="Min. 8 characters"]', 'StrongPass@123!');
    await expect(page.getByText('Strong')).toBeVisible({ timeout: 3000 });
  });

  test('profile link is visible in sidebar', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('link', { name: /Profile/i })).toBeVisible({ timeout: 10000 });
  });
});
