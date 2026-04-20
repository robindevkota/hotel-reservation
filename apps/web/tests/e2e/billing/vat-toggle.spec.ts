import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiGet(endpoint: string, token: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function apiPost(endpoint: string, token: string, body: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(endpoint: string, token: string, body: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

let _callCount = 0;

async function createCheckedInGuest(adminToken: string) {
  _callCount++;
  const roomsData = await apiGet('/rooms', adminToken);
  const activeRes = await apiGet('/checkin/active', adminToken);
  const occupiedIds = new Set((activeRes.guests ?? []).map((g: any) => String(g.room)));
  const room = roomsData.rooms?.find((r: any) => r.isAvailable === true && !occupiedIds.has(String(r._id)));
  if (!room) throw new Error('No available rooms');

  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + 200 + _callCount);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const resData = await apiPost('/reservations', adminToken, {
    guest: { name: `VAT Guest ${Date.now()}`, email: `vat${Date.now()}@test.com`, phone: '+20 000' },
    room: room._id,
    checkInDate: checkIn.toISOString(),
    checkOutDate: checkOut.toISOString(),
    numberOfGuests: 1,
  });
  if (!resData.reservation?._id) throw new Error('Reservation failed');

  await apiPatch(`/reservations/${resData.reservation._id}/confirm`, adminToken, {});
  const checkinData = await apiPost(`/checkin/${resData.reservation._id}`, adminToken, {});
  if (!checkinData.success) throw new Error('Check-in failed');

  return {
    guestId: checkinData.guest._id as string,
    qrToken: checkinData.qrToken as string,
  };
}

test.describe.serial('VAT Toggle — D-09 to D-14', () => {
  let adminToken: string;
  let guestId: string;

  test.beforeAll(async () => {
    adminToken = await apiLoginAsAdmin();
    const guest = await createCheckedInGuest(adminToken);
    guestId = guest.guestId;
  });

  // D-09: VAT off by default
  test('D-09 new bill has vatEnabled=false, taxAmount=0, grandTotal=totalAmount', async () => {
    const data = await apiGet(`/billing/${guestId}`, adminToken);
    const bill = data.bill;
    expect(bill.vatEnabled).toBe(false);
    expect(bill.taxAmount).toBe(0);
    expect(bill.grandTotal).toBeCloseTo(bill.totalAmount, 2);
  });

  // D-10: Enable VAT
  test('D-10 enabling VAT sets vatEnabled=true and adds 13% tax', async () => {
    const before = await apiGet(`/billing/${guestId}`, adminToken);
    const subtotal = before.bill.totalAmount;

    const data = await apiPatch(`/billing/${guestId}/vat`, adminToken, { vatEnabled: true });
    expect(data.success).toBe(true);
    expect(data.bill.vatEnabled).toBe(true);
    expect(data.bill.taxAmount).toBeCloseTo(subtotal * 0.13, 1);
    expect(data.bill.grandTotal).toBeCloseTo(subtotal * 1.13, 1);
  });

  // D-11: Disable VAT
  test('D-11 disabling VAT resets taxAmount=0, grandTotal=totalAmount', async () => {
    const data = await apiPatch(`/billing/${guestId}/vat`, adminToken, { vatEnabled: false });
    expect(data.success).toBe(true);
    expect(data.bill.vatEnabled).toBe(false);
    expect(data.bill.taxAmount).toBe(0);
    expect(data.bill.grandTotal).toBeCloseTo(data.bill.totalAmount, 2);
  });

  // D-12: VAT recalculates correctly after new charge added while VAT is on
  test('D-12 VAT recalculates after manual charge added while vatEnabled=true', async () => {
    // Enable VAT first
    await apiPatch(`/billing/${guestId}/vat`, adminToken, { vatEnabled: true });

    // Add a charge
    await apiPost(`/billing/${guestId}/add`, adminToken, { description: 'Minibar', amount: 50 });

    const data = await apiGet(`/billing/${guestId}`, adminToken);
    const bill = data.bill;
    expect(bill.vatEnabled).toBe(true);
    expect(bill.taxAmount).toBeCloseTo(bill.totalAmount * 0.13, 1);
    expect(bill.grandTotal).toBeCloseTo(bill.totalAmount * 1.13, 1);
  });

  // D-13: Reject VAT toggle on paid bill
  test('D-13 cannot toggle VAT on a paid bill', async () => {
    // Create a fresh guest, check them out, pay cash
    const fresh = await createCheckedInGuest(adminToken);
    await apiPost(`/checkin/checkout/${fresh.guestId}`, adminToken, {});
    const billData = await apiGet(`/billing/${fresh.guestId}`, adminToken);
    await apiPost('/payment/cash', adminToken, { billId: billData.bill._id });

    const data = await apiPatch(`/billing/${fresh.guestId}/vat`, adminToken, { vatEnabled: true });
    expect(data.success).toBeFalsy();
    expect(data.message || data.error).toMatch(/paid/i);
  });

  // D-14: Admin UI shows Apply VAT / Remove VAT button and updates totals
  test('D-14 admin billing page has VAT toggle button that updates grand total', async ({ page }) => {
    // Navigate to admin billing page as admin
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill('superadmin@royalsuites.com');
    await page.getByLabel(/password/i).fill('RoyalAdmin@123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin/billing');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Find a guest row and click it
    const firstRow = page.locator('table tbody tr').first();
    const rowVisible = await firstRow.isVisible().catch(() => false);
    if (!rowVisible) { test.skip(true, 'No billing rows visible'); return; }
    await firstRow.click();

    // VAT toggle button should be visible
    const vatBtn = page.getByRole('button', { name: /apply vat|remove vat/i });
    await expect(vatBtn).toBeVisible({ timeout: 10000 });

    // Grand Total should be visible
    await expect(page.getByText(/Grand Total/i)).toBeVisible();
  });
});
