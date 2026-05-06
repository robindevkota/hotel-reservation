import { test, expect } from '@playwright/test';

const MOBILE_VP = { width: 412, height: 915 };

test.describe('Mobile layout — public pages', () => {
  test.use({ viewport: MOBILE_VP });

  test('amenities — no horizontal overflow and sections stack', async ({ page }) => {
    await page.goto('/amenities');
    await expect(page.locator('h1')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VP.width);

    // Spa image should be within viewport width
    const spaImg = page.locator('img[alt="Cleopatra\'s Spa"]');
    await expect(spaImg).toBeVisible();
    const box = await spaImg.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(MOBILE_VP.width);
  });

  test('contact — no horizontal overflow and form fields stack', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VP.width);

    const nameInput = page.getByPlaceholder('Your name');
    const emailInput = page.getByPlaceholder('your@email.com');
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    // Both fields should be full-width (stacked, not side-by-side)
    const nameBox = await nameInput.boundingBox();
    const emailBox = await emailInput.boundingBox();
    // Stacked: same x position and email below name
    expect(Math.abs(nameBox!.x - emailBox!.x)).toBeLessThan(5);
    expect(emailBox!.y).toBeGreaterThan(nameBox!.y + nameBox!.height);
  });

  test('room detail — no horizontal overflow and booking card visible', async ({ page }) => {
    await page.goto('/rooms');
    const firstRoomLink = page.locator('a[href*="/rooms/"]').first();
    await expect(firstRoomLink).toBeVisible({ timeout: 10000 });
    await Promise.all([
      page.waitForURL(/\/rooms\/.+/),
      firstRoomLink.click(),
    ]);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VP.width);

    // Booking card CTA should be visible (stacked in single column)
    const cta = page.locator('a:has-text("Reserve This Room")').or(
      page.locator('div:has-text("Currently Unavailable")').first()
    );
    await expect(cta).toBeVisible({ timeout: 8000 });
  });
});
