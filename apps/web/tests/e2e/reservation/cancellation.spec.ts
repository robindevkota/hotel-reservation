import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

test.describe('Reservation Cancellation', () => {
  test('should return home after confirmation', async ({ page }) => {
    test.setTimeout(60000);

    // Get a room to pre-select
    const roomsData = await fetch(`${API_URL}/rooms`).then(r => r.json()).catch(() => ({ rooms: [] }));
    const room = roomsData.rooms?.[0];
    if (!room) { test.skip(true, 'No rooms available'); return; }

    await page.goto(
      `/reserve?room=${room._id}&roomName=${encodeURIComponent(room.name)}&price=${room.pricePerNight}`,
      { waitUntil: 'domcontentloaded' }
    );
    await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(300);

    const d1 = new Date(); d1.setFullYear(d1.getFullYear() + 22);
    const d2 = new Date(d1); d2.setDate(d2.getDate() + 2);
    await page.locator('input[type="date"]').first().fill(d1.toISOString().split('T')[0]);
    await page.locator('input[type="date"]').last().fill(d2.toISOString().split('T')[0]);
    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="As on ID"]', 'Test Guest');
    await page.fill('input[type="email"]', `cancel${Date.now()}@nile.eg`);
    await page.fill('input[type="tel"]', '+20 000 000 0000');

    await expect(page.getByRole('button', { name: /Confirm Reservation/i })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Return Home/i }).click();
    await expect(page).toHaveURL('/');
  });
});
