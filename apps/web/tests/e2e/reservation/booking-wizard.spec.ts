import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getAvailableRoom(): Promise<{ id: string; name: string; price: number } | null> {
  try {
    const res = await fetch(`${API_URL}/rooms`);
    const data = await res.json();
    const r = data.rooms?.[0];
    return r ? { id: r._id, name: r.name, price: r.pricePerNight } : null;
  } catch { return null; }
}

/** Go to /reserve with a pre-selected room and wait for the date inputs to be interactive */
async function gotoReserveWithRoom(page: any, room: { id: string; name: string; price: number }) {
  await page.goto(
    `/reserve?room=${room.id}&roomName=${encodeURIComponent(room.name)}&price=${room.price}`,
    { waitUntil: 'domcontentloaded' }
  );
  // Wait for the form to be fully hydrated — button enabled means React is ready
  await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(300); // small settle for React state from URL params
}

test.describe('Reservation Booking Wizard', () => {
  test('should render 3-step reservation wizard', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[type="date"]').last()).toBeVisible();
    await expect(page.locator('.step-label')).toHaveCount(3);
    await expect(page.getByText(/Reserve Your Chamber/i)).toBeVisible();
  });

  test('should complete full reservation flow', async ({ page }) => {
    test.setTimeout(60000);
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    const checkInDate = new Date();
    checkInDate.setFullYear(checkInDate.getFullYear() + 20);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);
    const checkIn = checkInDate.toISOString().split('T')[0];
    const checkOut = checkOutDate.toISOString().split('T')[0];

    await gotoReserveWithRoom(page, room);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(checkIn);
    await dateInputs.last().fill(checkOut);

    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="As on ID"]', 'Ramesses II');
    await page.fill('input[type="email"]', 'pharaoh@nile.eg');
    await page.fill('input[type="tel"]', '+20 123 456 7890');

    await expect(page.getByRole('button', { name: /Confirm Reservation/i })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('pharaoh@nile.eg')).toBeVisible();
  });

  test('should show error when no room selected', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    // Wait for form to be fully hydrated
    await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(300);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-06-01');
    await dateInputs.last().fill('2026-06-03');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.locator('text=Please select a room').or(page.locator('text=Please fill guest details'))).toBeVisible({ timeout: 8000 });
  });

  test('should calculate total cost correctly', async ({ page }) => {
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-07-01');
    await dateInputs.last().fill('2026-07-04');
    await page.waitForTimeout(500);

    await expect(page.getByText(/3 nights/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`$${(room.price * 3).toLocaleString()}`)).toBeVisible();
  });

  test('should navigate back from step 2 to step 1', async ({ page }) => {
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    await page.locator('input[type="date"]').first().fill('2026-08-01');
    await page.locator('input[type="date"]').last().fill('2026-08-03');
    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Availability Check', () => {
  test('should not allow past dates', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 20000 });
    const minDate = await page.locator('input[type="date"]').first().getAttribute('min');
    const today = new Date().toISOString().split('T')[0];
    expect(minDate).toBe(today);
  });

  test('should show loading state while fetching rooms', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading available rooms')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Reservation Cancellation', () => {
  test('should return home after confirmation', async ({ page }) => {
    test.setTimeout(60000);
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    const d1 = new Date(); d1.setFullYear(d1.getFullYear() + 21);
    const d2 = new Date(d1); d2.setDate(d2.getDate() + 2);
    await page.locator('input[type="date"]').first().fill(d1.toISOString().split('T')[0]);
    await page.locator('input[type="date"]').last().fill(d2.toISOString().split('T')[0]);
    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="As on ID"]', 'Test Guest');
    await page.fill('input[type="email"]', `test${Date.now()}@nile.eg`);
    await page.fill('input[type="tel"]', '+20 000 000 0000');

    await expect(page.getByRole('button', { name: /Confirm Reservation/i })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: /Confirm Reservation/i }).click();

    await expect(page.getByText('Reservation Confirmed')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Return Home/i }).click();
    await expect(page).toHaveURL('/');
  });
});
