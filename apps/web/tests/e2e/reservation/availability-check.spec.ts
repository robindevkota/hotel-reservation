import { test, expect } from '@playwright/test';

test.describe('Availability Check', () => {
  test('should not allow past dates for check-in', async ({ page }) => {
    await page.goto('/reserve');
    const checkInInput = page.locator('input[type="date"]').first();
    const minDate = await checkInInput.getAttribute('min');
    const today = new Date().toISOString().split('T')[0];
    expect(minDate).toBe(today);
  });

  test('should show loading state while fetching rooms', async ({ page }) => {
    await page.goto('/reserve');
    await expect(page.getByText(/Loading available rooms/i)).toBeVisible({ timeout: 5000 });
  });

  test('should prevent checkout date before checkin date', async ({ page }) => {
    await page.goto('/reserve');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-08-01');
    const minCheckout = await dateInputs.last().getAttribute('min');
    expect(minCheckout).toBe('2026-08-01');
  });
});
