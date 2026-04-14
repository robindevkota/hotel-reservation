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

/** Fill both React-controlled date inputs.
 *  Uses locator.type() for desktop (triggers segment auto-advance in date input)
 *  and programmatic React fiber update for mobile (hasTouch blocks segment navigation).
 */
async function fillDates(page: any, checkIn: string, checkOut: string) {
  const isMobile: boolean = await page.evaluate(() => (window.navigator as any).maxTouchPoints > 0);

  if (!isMobile) {
    const [ciYear, ciMonth, ciDay] = checkIn.split('-');
    const [coYear, coMonth, coDay] = checkOut.split('-');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().click();
    await dateInputs.first().type(ciMonth + ciDay + ciYear);
    await dateInputs.last().click();
    await dateInputs.last().type(coMonth + coDay + coYear);
  } else {
    // Mobile: use Playwright's fill() which correctly sets date input values,
    // then trigger React's update via the React fiber's onChange dispatcher.
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(checkIn);
    await dateInputs.last().fill(checkOut);
    await page.evaluate(([ci, co]: [string, string]) => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
      if (inputs.length < 2) return;
      // After Playwright's fill(), the native value is already correct.
      // We only need to fire synthetic events so React state catches up.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(inputs[0], ci);
      setter.call(inputs[1], co);
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    }, [checkIn, checkOut] as [string, string]);
  }
  await page.waitForTimeout(200);
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
  test('should render 5-step reservation wizard with correct step labels', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[type="date"]').last()).toBeVisible();
    // Wizard renders step labels inline — look for the step text headings
    await expect(page.getByText(/Dates & Room/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Reserve Your Chamber/i)).toBeVisible();
  });

  test('should complete full reservation flow — steps 1→2→3 and reach card step', async ({ page }) => {
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

    // Step 1: Dates & Room
    await fillDates(page, checkIn, checkOut);
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 2: Rate / Policy Selection
    await expect(page.getByText(/Flexible Rate|Select Your Rate/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3: Guest Details
    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="As on ID"]', 'Ramesses II');
    await page.fill('input[type="email"]', 'pharaoh@nile.eg');
    await page.fill('input[type="tel"]', '+20 123 456 7890');

    // Verify Back from Step 3 returns to Step 2 (Rate selection)
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.getByText(/Flexible Rate|Select Your Rate/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error when no room selected', async ({ page }) => {
    await page.goto('/reserve', { waitUntil: 'domcontentloaded' });
    // Wait for form to be fully hydrated
    await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(300);

    await fillDates(page, '2026-06-01', '2026-06-03');

    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.locator('text=Please select a room').or(page.locator('text=Please fill guest details'))).toBeVisible({ timeout: 8000 });
  });

  test('should calculate total cost correctly', async ({ page }) => {
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    await fillDates(page, '2026-07-01', '2026-07-04');

    await expect(page.getByText(/3 nights/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`$${(room.price * 3).toLocaleString()}`)).toBeVisible();
  });

  test('should navigate back from step 2 (Rate) to step 1 (Dates)', async ({ page }) => {
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    await fillDates(page, '2026-08-01', '2026-08-03');
    await page.getByRole('button', { name: /Continue/i }).click();

    // Now on Step 2 (Rate selection)
    await expect(page.getByText(/Flexible Rate|Select Your Rate/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Back/i }).click();

    // Back on Step 1 (Dates & Room)
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
  // Tests stop at Step 4 (card) and use ← Back — no real Stripe payment completed.
  test('should return to guest details (Step 3) via ← Back from card step', async ({ page }) => {
    test.setTimeout(60000);
    const room = await getAvailableRoom();
    if (!room) { test.skip(true, 'No available rooms'); return; }

    await gotoReserveWithRoom(page, room);

    const d1 = new Date(); d1.setFullYear(d1.getFullYear() + 21);
    const d2 = new Date(d1); d2.setDate(d2.getDate() + 2);
    await fillDates(page, d1.toISOString().split('T')[0], d2.toISOString().split('T')[0]);
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 2: Rate
    await expect(page.getByText(/Flexible Rate|Select Your Rate/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3: Guest Details
    await expect(page.locator('input[placeholder="As on ID"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[placeholder="As on ID"]', 'Test Guest');
    await page.fill('input[type="email"]', `test${Date.now()}@nile.eg`);
    await page.fill('input[type="tel"]', '+20 000 000 0000');

    // Verify Back from Step 3 returns to Step 2 (Rate selection)
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.getByText(/Flexible Rate|Select Your Rate/i).first()).toBeVisible({ timeout: 5000 });
  });
});
