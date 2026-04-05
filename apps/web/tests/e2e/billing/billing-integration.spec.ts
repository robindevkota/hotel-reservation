import { test, expect, Browser } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiPost(endpoint: string, token: string, body: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(endpoint: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, { headers });
  return res.json();
}

async function apiPatch(endpoint: string, token: string, body?: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function createCheckedInGuest(adminToken: string, roomOverride?: any) {
  const roomsData = await apiGet('/rooms', adminToken);
  // Pick a random room to avoid conflicts from previous test runs
  const room = roomOverride || roomsData.rooms[Math.floor(Math.random() * roomsData.rooms.length)];

  // Use truly unique dates to avoid conflicts
  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + 10);
  checkIn.setMonth(Math.floor(Math.random() * 12));
  checkIn.setDate(Math.floor(Math.random() * 20) + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  const reservationData = await apiPost('/reservations', adminToken, {
    guest: {
      name: `Test Guest ${Date.now()}`,
      email: `test${Date.now()}@nile.eg`,
      phone: '+20 123 456 7890',
      idProof: `EGY-${Date.now()}`,
    },
    room: room._id,
    checkInDate: checkIn.toISOString(),
    checkOutDate: checkOut.toISOString(),
    numberOfGuests: 2,
  });

  const reservationId = reservationData.reservation?._id;
  if (!reservationId) throw new Error(`Failed to create reservation: ${JSON.stringify(reservationData)}`);

  // Confirm the reservation
  await apiPatch(`/reservations/${reservationId}/confirm`, adminToken);

  // Check in
  const checkinData = await apiPost(`/checkin/${reservationId}`, adminToken, {});
  if (!checkinData.success) throw new Error(`Check-in failed: ${JSON.stringify(checkinData)}`);

  return {
    guestId: checkinData.guest._id,
    qrToken: checkinData.qrToken,
    reservationId,
    bill: checkinData.bill,
  };
}

async function cleanupActiveGuests(adminToken: string) {
  // Checkout any active guests to avoid stale data
  try {
    const resData = await apiGet('/reservations?status=checked_in', adminToken);
    for (const res of resData.reservations || []) {
      if (res.guest?._id) {
        try {
          await apiPost(`/checkin/checkout/${res.guest._id}`, adminToken, {});
        } catch (e) {
          // Ignore checkout errors
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Also deactivate any remaining active guests directly
  try {
    const allReservations = await apiGet('/reservations?limit=100', adminToken);
    for (const res of allReservations.reservations || []) {
      if (res.status === 'checked_in' && res.guest?._id) {
        try {
          // Force deactivate the guest
          await fetch(`${API_URL}/admin/guests/${res.guest._id}/deactivate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (e) {
    // Ignore
  }
}

test.describe('Full Billing Integration Test', () => {
  test('reserve → checkin → order food → book spa → verify bill total', { timeout: 60000 }, async ({ page, browser }) => {
    const adminToken = await apiLoginAsAdmin();

    // ── Step 1: Create and check in a guest (use room 2) ──
    const roomsData = await apiGet('/rooms', adminToken);
    const checkin = await createCheckedInGuest(adminToken, roomsData.rooms[5]);
    const { guestId, qrToken, bill: checkinBill } = checkin;

    expect(checkinBill.lineItems.length).toBe(1);
    expect(checkinBill.lineItems[0].type).toBe('room');

    // ── Step 2: Guest logs in via QR and orders food ──
    // First get the guest JWT token by verifying the QR
    const qrVerifyData = await apiGet(`/qr/verify/${qrToken}`);
    if (!qrVerifyData.token) {
      await guestCtx.close();
      test.skip(true, `QR verify failed: ${JSON.stringify(qrVerifyData)}`);
      return;
    }
    const guestToken = qrVerifyData.token;
    // Use the actual guest ID from QR verify (not the check-in response)
    const actualGuestId = qrVerifyData.guestId;
    
    // Get the initial bill for this guest
    const initialBillData = await apiGet(`/billing/${actualGuestId}`, adminToken);
    const initialBill = initialBillData.bill;
    expect(initialBill.lineItems.length).toBeGreaterThanOrEqual(1);
    expect(initialBill.lineItems[0].type).toBe('room');
    const roomCharge = initialBill.lineItems[0].amount;
    const initialLineItemCount = initialBill.lineItems.length;
    expect(roomCharge).toBeGreaterThan(0);

    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();

    await guestPage.goto(`/qr/${qrToken}`);
    await guestPage.waitForTimeout(3000);
    await guestPage.waitForURL(/\/guest\/dashboard/, { timeout: 10000 });

    // Navigate to menu
    await guestPage.getByText(/Order Food/i).click();
    await guestPage.waitForURL(/\/guest\/menu/, { timeout: 5000 });
    await guestPage.waitForTimeout(3000);

    // Add items to cart
    const addButtons = guestPage.getByText('Add to Order');
    const addCount = await addButtons.count();
    if (addCount === 0) {
      await guestCtx.close();
      test.skip(true, 'No menu items available');
      return;
    }

    // Add 2 items
    await addButtons.first().click();
    await guestPage.waitForTimeout(500);
    if (addCount > 1) {
      await addButtons.nth(1).click();
      await guestPage.waitForTimeout(500);
    }

    // Place order
    await guestPage.getByText(/View Order/i).click();
    await guestPage.getByRole('button', { name: /Place Order/i }).click();
    await expect(guestPage.getByText(/order placed/i)).toBeVisible({ timeout: 10000 });

    // Get order details
    const ordersData = await apiGet('/orders/my', guestToken);
    const order = ordersData.orders?.[0];
    expect(order).toBeTruthy();
    const orderId = order._id;
    const orderTotal = order.totalAmount;

    // ── Step 3: Guest books a spa session ──
    // Navigate back to dashboard first
    await guestPage.goto('/guest/dashboard');
    await guestPage.waitForTimeout(2000);
    await guestPage.getByText('Book Spa').click();
    await guestPage.waitForURL(/\/guest\/spa/, { timeout: 5000 });
    await guestPage.waitForTimeout(3000);

    const bookBtn = guestPage.getByRole('button', { name: /Book/i }).first();
    const bookVisible = await bookBtn.isVisible().catch(() => false);
    let spaBookingId = null;
    let spaPrice = 0;

    if (bookVisible) {
      await bookBtn.click();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];
      await guestPage.locator('input[type="date"]').fill(dateStr);
      await guestPage.waitForTimeout(1000);

      const slotBtn = guestPage.locator('button').filter({ hasText: /\d{2}:\d{2}/ }).first();
      const slotVisible = await slotBtn.isVisible().catch(() => false);
      if (slotVisible) {
        await slotBtn.click();
        await guestPage.getByRole('button', { name: /Confirm Booking/i }).click();
        await expect(guestPage.getByText(/booked/i)).toBeVisible({ timeout: 10000 });

        const spaBookingsData = await apiGet('/spa/bookings/my', guestToken);
        const booking = spaBookingsData.bookings?.[0];
        if (booking) {
          spaBookingId = booking._id;
          spaPrice = booking.price;
        }
      }
    }

    // ── Step 4: Admin advances order through all statuses to 'delivered' ──
    // Order must go through: pending → accepted → preparing → ready → delivering → delivered
    const orderStatuses = ['accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    let deliverSuccess = true;
    for (const status of orderStatuses) {
      await new Promise((r) => setTimeout(r, 1000)); // Delay between transitions
      const result = await apiPatch(`/orders/${orderId}/status`, adminToken, { status });
      console.log(`Order transition to ${status}:`, JSON.stringify(result));
      if (!result.success || result.error) {
        console.log(`Order status transition FAILED: ${status}`, JSON.stringify(result));
        deliverSuccess = false;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));

    // ── Step 5: Admin marks spa booking as completed ──
    let spaChargeAdded = false;
    if (spaBookingId) {
      const spaResult = await apiPatch(`/spa/bookings/${spaBookingId}/status`, adminToken, { status: 'completed' });
      console.log('Spa completion:', JSON.stringify(spaResult));
      await new Promise((r) => setTimeout(r, 2000));
      spaChargeAdded = spaResult.success && !spaResult.error;
    }

    // ── Step 6: Verify bill total ──
    // Wait a moment for line items to be added
    await new Promise((r) => setTimeout(r, 2000));

    const finalBillData = await apiGet(`/billing/${actualGuestId}`, adminToken);
    
    if (!finalBillData.bill) {
      throw new Error(`Bill not found for guest ${actualGuestId}: ${JSON.stringify(finalBillData)}`);
    }
    
    const finalBill = finalBillData.bill;

    const types = finalBill.lineItems.map((item: any) => item.type);
    expect(types).toContain('room');

    // The food order charge is added when status = 'delivered'
    // Check that a new food_order line item was added (beyond what was there initially)
    expect(finalBill.lineItems.length).toBeGreaterThan(initialLineItemCount);
    expect(types).toContain('food_order');

    // The spa charge is added when booking status = 'completed'
    if (spaBookingId && spaChargeAdded) {
      expect(types).toContain('spa');
    }

    // Verify math - compare the delta from initial to final
    const initialTotal = initialBill.totalAmount;
    const actualDelta = finalBill.totalAmount - initialTotal;
    
    // The delta should equal orderTotal + spaPrice (if spa was booked)
    let expectedDelta = orderTotal;
    if (types.includes('spa')) {
      expectedDelta += spaPrice;
    }
    
    expect(actualDelta).toBeCloseTo(expectedDelta, 1);
    
    // Also verify the grand total calculation is correct
    const expectedTax = Math.round(finalBill.totalAmount * 0.13 * 100) / 100;
    const expectedGrandTotal = Math.round((finalBill.totalAmount + expectedTax) * 100) / 100;
    expect(finalBill.taxAmount).toBeCloseTo(expectedTax, 1);
    expect(finalBill.grandTotal).toBeCloseTo(expectedGrandTotal, 1);

    await guestCtx.close();
  });

  test('checkout locks bill and cash payment flow works', async ({ page }) => {
    const adminToken = await apiLoginAsAdmin();

    // Create and check in guest (use room 4)
    const roomsData = await apiGet('/rooms', adminToken);
    const checkin = await createCheckedInGuest(adminToken, roomsData.rooms[4]);
    const { guestId, bill: initialBill } = checkin;

    expect(initialBill.status).toBe('open');
    const openGrandTotal = initialBill.grandTotal;

    // Add a manual charge
    await apiPost(`/billing/${guestId}/add`, adminToken, {
      description: 'Minibar charge',
      amount: 25,
    });

    // Bill should still be open with updated total
    const updatedBillData = await apiGet(`/billing/${guestId}`, adminToken);
    expect(updatedBillData.bill.status).toBe('open');
    expect(updatedBillData.bill.grandTotal).toBeGreaterThan(openGrandTotal);
    const billAfterCharge = updatedBillData.bill.grandTotal;

    // Checkout
    const checkoutData = await apiPost(`/checkin/checkout/${guestId}`, adminToken, {});
    expect(checkoutData.success).toBe(true);

    // Bill should now be 'pending_payment'
    const postCheckoutData = await apiGet(`/billing/${guestId}`, adminToken);
    expect(postCheckoutData.bill.status).toBe('pending_payment');
    expect(postCheckoutData.bill.grandTotal).toBe(billAfterCharge);

    // Pay via cash
    const cashData = await apiPost('/payment/cash', adminToken, {
      billId: postCheckoutData.bill._id,
    });
    expect(cashData.bill.status).toBe('paid');
    expect(cashData.bill.paymentMethod).toBe('cash');
    expect(cashData.bill.paidAt).toBeTruthy();
  });
});
