import { test, expect } from '@playwright/test';

test.describe('Reservation Cancellation', () => {
  test('should return home after confirmation', async ({ page }) => {
    await page.goto('/reserve');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-09-01');
    await dateInputs.last().fill('2026-09-03');

    await page.waitForTimeout(2000);
    const roomCards = page.locator('.room-sel');
    const roomCount = await roomCards.count();
    if (roomCount > 0) {
      await roomCards.first().click();
    }
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.fill('input[placeholder="As on ID"]', 'Test Guest');
    const uniqueEmail = `cancel${Date.now()}@nile.eg`;
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="tel"]', '+20 000 000 0000');
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Return Home/i }).click();
    await expect(page).toHaveURL('/');
  });
});
