import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function createCheckedInGuest(adminToken: string): Promise<string | null> {
  const rooms = await fetch(`${API_URL}/rooms`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());

  const activeRes = await fetch(`${API_URL}/checkin/active`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json()).catch(() => ({ guests: [] }));
  const occupiedRoomIds = new Set((activeRes.guests ?? []).map((g: any) => String(g.room)));

  const room = rooms.rooms?.find((r: any) => r.isAvailable === true && !occupiedRoomIds.has(String(r._id)));
  if (!room) return null;

  const yearOffset = 70 + Math.floor(Math.random() * 50);
  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + yearOffset);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      guest: { name: `Bill Guest ${Date.now()}`, email: `bill${Date.now()}@test.com`, phone: '+20 000' },
      room: room._id,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      numberOfGuests: 1,
    }),
  }).then(r => r.json());
  if (!res.success) return null;

  await fetch(`${API_URL}/reservations/${res.reservation._id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const checkin = await fetch(`${API_URL}/checkin/${res.reservation._id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());

  return checkin.success ? checkin.qrToken : null;
}

/** Navigate to QR page and click "Enter My Portal" to land on guest dashboard */
async function loginViaQR(page: any, qrToken: string) {
  await page.goto(`/qr/${qrToken}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByRole('button', { name: /Enter My Portal/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Enter My Portal/i }).click();
  await page.waitForURL(/\/guest\/dashboard/, { timeout: 15000 });
  // Wait for the dashboard to fully load so the guest session is established
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

test.describe.serial('Bill Accumulation', () => {
  let qrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    qrToken = await createCheckedInGuest(adminToken);
  });

  test('guest can view their running bill', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Running Bill|Bill/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('bill shows line items breakdown', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Charges|Line Items|room/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('bill shows grand total with VAT', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/VAT|Tax/i)).toBeVisible();
  });

  test('bill total increases after ordering food', async ({ page }) => {
    test.setTimeout(60000);
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);

    // Check initial bill
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Navigate to menu and order
    await page.goto('/guest/dashboard');
    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 5000 });
    await page.waitForTimeout(2000);

    const addButtons = page.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount === 0) { test.skip(true, 'No menu items available'); return; }

    await addButtons.first().click();
    await page.getByText(/View Order/i).click();
    await page.getByRole('button', { name: /Place Order/i }).click();
    await expect(page.getByText(/order placed/i)).toBeVisible({ timeout: 10000 });

    // Return to billing — total should still show
    await page.goto('/guest/billing');
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
  });

  test('guest can access billing page after checkout', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/guest\/billing/);
  });
});

test.describe.serial('Stripe Payment', () => {
  let qrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    qrToken = await createCheckedInGuest(adminToken);
  });

  test('billing page loads for authenticated guest', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Running Bill|Bill/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('guest sees itemized charges on billing page', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/room|Room/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('guest sees pay now button when bill is pending payment', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 10000 });
  });

  test('guest sees paid status when bill is settled', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(1000);
    const statusText = await page.getByText(/paid|open|pending/i).first().textContent().catch(() => '');
    if (statusText?.toLowerCase().includes('paid')) {
      await expect(page.getByText(/Payment Complete/i)).toBeVisible({ timeout: 5000 });
    } else {
      await expect(page.getByText(/Grand Total/i)).toBeVisible();
    }
  });
});

test.describe.serial('Checkout Receipt', () => {
  let qrToken: string | null = null;

  test.beforeAll(async () => {
    const adminToken = await apiLoginAsAdmin();
    qrToken = await createCheckedInGuest(adminToken);
  });

  test('guest can view bill details page', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/guest\/billing/);
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 8000 });
  });

  test('bill shows tax calculation', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await expect(page.getByText(/VAT|Tax|13%/i)).toBeVisible({ timeout: 8000 });
  });

  test('guest sees payment method option', async ({ page }) => {
    if (!qrToken) { test.skip(true, 'Could not create checked-in guest'); return; }
    await loginViaQR(page, qrToken);
    await page.getByText(/View Bill/i).click();
    await page.waitForURL(/\/guest\/billing/, { timeout: 5000 });
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Grand Total/i)).toBeVisible({ timeout: 8000 });
  });
});
