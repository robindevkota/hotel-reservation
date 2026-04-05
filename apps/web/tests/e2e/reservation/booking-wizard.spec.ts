import { test, expect } from '@playwright/test';

test.describe('Reservation Booking Wizard', () => {
  test('should render 3-step reservation wizard', async ({ page }) => {
    await page.goto('/reserve');
    await expect(page.getByText(/Dates & Room/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Guest Details/i)).toBeVisible();
    await expect(page.getByText(/Confirmation/i)).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('should complete full reservation flow', async ({ page }) => {
    await page.goto('/reserve');

    // Step 1: Select dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(checkIn);
    await dateInputs.last().fill(checkOut);

    // Wait for rooms to load, then select first room
    await page.waitForTimeout(2000);
    const roomCards = page.locator('.room-sel');
    const roomCount = await roomCards.count();
    if (roomCount > 0) {
      await roomCards.first().click();
    }

    // Continue to step 2
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 2: Fill guest details
    await page.fill('input[placeholder="As on ID"]', 'Ramesses II');
    await page.fill('input[type="email"]', 'pharaoh@nile.eg');
    await page.fill('input[type="tel"]', '+20 123 456 7890');

    // Submit reservation
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    // Step 3: Confirmation
    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('pharaoh@nile.eg')).toBeVisible();
  });

  test('should show error when no room selected', async ({ page }) => {
    await page.goto('/reserve');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-06-01');
    await dateInputs.last().fill('2026-06-03');

    await page.getByRole('button', { name: /Continue/i }).click();
    // Should show error toast about selecting a room
    await expect(page.locator('text=Please select a room').or(page.locator('text=Please fill guest details'))).toBeVisible({ timeout: 5000 });
  });

  test('should calculate total cost correctly', async ({ page }) => {
    await page.goto('/reserve');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-07-01');
    await dateInputs.last().fill('2026-07-04');

    // Wait for rooms to load
    await page.waitForTimeout(3000);
    const roomCards = page.locator('.room-sel');
    const roomCount = await roomCards.count();
    if (roomCount === 0) {
      test.skip(true, 'No rooms available');
      return;
    }
    await roomCards.first().click();
    await page.waitForTimeout(1000);
    // Should show 3 nights calculation
    await expect(page.getByText(/3 nights/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back from step 2 to step 1', async ({ page }) => {
    await page.goto('/reserve');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-08-01');
    await dateInputs.last().fill('2026-08-03');

    await page.waitForTimeout(2000);
    const roomCards = page.locator('.room-sel');
    const roomCount = await roomCards.count();
    if (roomCount === 0) {
      test.skip(true, 'No rooms available');
      return;
    }
    await roomCards.first().click();
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should be on step 2 now
    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 5000 });

    // Go back
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Availability Check', () => {
  test('should not allow past dates', async ({ page }) => {
    await page.goto('/reserve');
    const checkInInput = page.locator('input[type="date"]').first();
    const minDate = await checkInInput.getAttribute('min');
    const today = new Date().toISOString().split('T')[0];
    expect(minDate).toBe(today);
  });

  test('should show loading state while fetching rooms', async ({ page }) => {
    await page.goto('/reserve');
    await expect(page.getByText('Loading available rooms')).toBeVisible({ timeout: 5000 });
  });
});

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
    await page.fill('input[type="email"]', `test${Date.now()}@nile.eg`);
    await page.fill('input[type="tel"]', '+20 000 000 0000');
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Return Home/i }).click();
    await expect(page).toHaveURL('/');
  });
});
