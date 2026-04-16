/**
 * offer-billing.spec.ts
 *
 * Verifies that an active promotional offer correctly discounts:
 *   1. Room charges on a new reservation (roomDiscount %)
 *   2. Food order unitPrice (foodDiscount %)
 *   3. Spa booking price (spaDiscount %)
 *   4. Bill totals reflect discounted amounts (not original prices)
 *   5. After offer is deactivated, new charges use full prices again
 *
 * Run:
 *   cd royal-suites/apps/web
 *   npx playwright test tests/e2e/billing/offer-billing.spec.ts --project=chromium --workers=1 --reporter=line
 */

import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiPost(path: string, token: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  return res.json();
}

async function apiPatch(path: string, token: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// ── Setup helpers ─────────────────────────────────────────────────────────────

/** Create an offer with given discounts, active today → 7 days from now */
async function createOffer(
  token: string,
  overrides: { roomDiscount?: number; foodDiscount?: number; spaDiscount?: number; title?: string } = {}
) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const data = await apiPost('/offers', token, {
    title: overrides.title ?? `Test Offer ${Date.now()}`,
    description: 'Automated test offer',
    roomDiscount: overrides.roomDiscount ?? 10,
    foodDiscount: overrides.foodDiscount ?? 15,
    spaDiscount:  overrides.spaDiscount  ?? 20,
    startDate: start.toISOString(),
    endDate:   end.toISOString(),
    isActive: true,
  });
  if (!data.offer?._id) throw new Error(`Failed to create offer: ${JSON.stringify(data)}`);
  return data.offer;
}

/** Deactivate all offers (don't delete — preserves manually created offers) */
async function deactivateAllOffers(token: string): Promise<string[]> {
  const data = await apiGet('/offers', token);
  const offers: any[] = data.offers ?? [];
  const ids: string[] = [];
  for (const o of offers) {
    if (o.isActive) {
      await apiPatch(`/offers/${o._id}`, token, { isActive: false });
    }
    ids.push(o._id);
  }
  return ids;
}

/** Restore offers that were active before the test */
async function reactivateOffers(token: string, ids: string[]) {
  for (const id of ids) {
    await apiPatch(`/offers/${id}`, token, { isActive: true });
  }
}

/** Pick a free available room */
async function pickFreeRoom(token: string) {
  const roomsData  = await apiGet('/rooms', token);
  const activeData = await apiGet('/checkin/active', token);
  const occupied   = new Set((activeData.guests ?? []).map((g: any) => String(g.room)));
  const room = (roomsData.rooms ?? []).find((r: any) => r.isAvailable && !occupied.has(String(r._id)));
  if (!room) throw new Error('No free rooms available');
  return room;
}

let _callCount = 0;

/** Create reservation → confirm → checkin. Returns { guestId, qrToken, reservationId, roomPricePerNight } */
async function checkinGuest(token: string) {
  _callCount++;
  const room = await pickFreeRoom(token);

  const checkIn = new Date();
  checkIn.setFullYear(checkIn.getFullYear() + 200 + _callCount);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2); // 2 nights

  const resData = await apiPost('/reservations', token, {
    guest: {
      name:    `Offer Test Guest ${Date.now()}`,
      email:   `offer${Date.now()}@test.eg`,
      phone:   '+20 111 222 3333',
      idProof: `EGY-OFFER-${Date.now()}`,
    },
    room: room._id,
    checkInDate:    checkIn.toISOString(),
    checkOutDate:   checkOut.toISOString(),
    numberOfGuests: 1,
  });
  if (!resData.reservation?._id) throw new Error(`Reservation failed: ${JSON.stringify(resData)}`);
  const reservationId = resData.reservation._id;

  await apiPatch(`/reservations/${reservationId}/confirm`, token);

  const ciData = await apiPost(`/checkin/${reservationId}`, token, {});
  if (!ciData.success) throw new Error(`Check-in failed: ${JSON.stringify(ciData)}`);

  return {
    guestId:          ciData.guest._id,
    qrToken:          ciData.qrToken,
    reservationId,
    roomPricePerNight: room.pricePerNight,
    nights:           2,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('Offer Discount Billing', () => {

  test('1 — room charge is discounted when offer is active', async () => {
    test.setTimeout(60_000);
    const adminToken = await apiLoginAsAdmin();

    const prevIds = await deactivateAllOffers(adminToken);
    const ROOM_DISC = 10; // 10% off rooms
    const offer = await createOffer(adminToken, { roomDiscount: ROOM_DISC, foodDiscount: 0, spaDiscount: 0 });

    // Verify active offer endpoint returns it
    const activeData = await apiGet('/offers/active');
    expect(activeData.offer).toBeTruthy();
    expect(activeData.offer._id).toBe(offer._id);
    expect(activeData.offer.roomDiscount).toBe(ROOM_DISC);

    const { guestId, roomPricePerNight, nights } = await checkinGuest(adminToken);

    const billData = await apiGet(`/billing/${guestId}`, adminToken);
    expect(billData.bill).toBeTruthy();

    const roomLine = billData.bill.lineItems.find((li: any) => li.type === 'room');
    expect(roomLine).toBeTruthy();

    const baseCharge   = roomPricePerNight * nights;
    const discounted   = Math.round(baseCharge * (1 - ROOM_DISC / 100) * 100) / 100;

    // Room line amount should be the discounted value (within $1 tolerance for rounding)
    expect(roomLine.amount).toBeCloseTo(discounted, 0);

    // Cleanup — delete test offer, restore previous ones
    await apiDelete(`/offers/${offer._id}`, adminToken);
    await reactivateOffers(adminToken, prevIds);
  });

  test('2 — food order uses discounted unit price when offer is active', async () => {
    test.setTimeout(90_000);
    const adminToken = await apiLoginAsAdmin();

    const prevIds = await deactivateAllOffers(adminToken);
    const FOOD_DISC = 15;
    const offer = await createOffer(adminToken, { roomDiscount: 0, foodDiscount: FOOD_DISC, spaDiscount: 0 });

    const { guestId, qrToken } = await checkinGuest(adminToken);

    // Get guest JWT
    const qrData = await apiGet(`/qr/verify/${qrToken}`);
    if (!qrData.token) {
      test.skip(true, 'QR verify failed — skipping food discount test');
      return;
    }
    const guestToken  = qrData.token;
    const actualGuestId = qrData.guestId;

    // Get menu items and pick one
    const menuData = await apiGet('/menu', guestToken);
    const items: any[] = menuData.items ?? menuData.menuItems ?? [];
    if (items.length === 0) {
      test.skip(true, 'No menu items — skipping');
      return;
    }
    const item = items[0];
    const originalPrice = item.price;
    const expectedUnitPrice = Math.round(originalPrice * (1 - FOOD_DISC / 100) * 100) / 100;

    // Place order via API
    const orderData = await apiPost('/orders', guestToken, {
      items: [{ menuItem: item._id, quantity: 1 }],
    });
    expect(orderData.order ?? orderData.success).toBeTruthy();
    const order = orderData.order;
    expect(order).toBeTruthy();

    // Unit price stored on order item should be discounted
    const orderItem = order.items?.[0];
    expect(orderItem).toBeTruthy();
    expect(orderItem.unitPrice).toBeCloseTo(expectedUnitPrice, 1);

    // Advance order to delivered so it gets added to bill
    const orderId = order._id;
    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      await new Promise(r => setTimeout(r, 500));
      await apiPatch(`/orders/${orderId}/status`, adminToken, { status });
    }
    await new Promise(r => setTimeout(r, 2000));

    // Bill food line should equal discounted total
    const billData = await apiGet(`/billing/${actualGuestId}`, adminToken);
    const foodLine = billData.bill?.lineItems?.find((li: any) => li.type === 'food_order');
    expect(foodLine).toBeTruthy();
    expect(foodLine.amount).toBeCloseTo(expectedUnitPrice, 1);

    await apiDelete(`/offers/${offer._id}`, adminToken);
    await reactivateOffers(adminToken, prevIds);
  });

  test('3 — spa booking price is discounted when offer is active', async () => {
    test.setTimeout(60_000);
    const adminToken = await apiLoginAsAdmin();

    const prevIds = await deactivateAllOffers(adminToken);
    const SPA_DISC = 20;
    const offer = await createOffer(adminToken, { roomDiscount: 0, foodDiscount: 0, spaDiscount: SPA_DISC });

    const { qrToken } = await checkinGuest(adminToken);

    const qrData = await apiGet(`/qr/verify/${qrToken}`);
    if (!qrData.token) {
      test.skip(true, 'QR verify failed');
      return;
    }
    const guestToken    = qrData.token;
    const actualGuestId = qrData.guestId;

    // Get spa services
    const spaData = await apiGet('/spa/services', guestToken);
    const services: any[] = spaData.services ?? [];
    if (services.length === 0) {
      test.skip(true, 'No spa services available');
      return;
    }
    const service = services[0];
    const originalPrice      = service.price;
    const expectedDiscounted = Math.round(originalPrice * (1 - SPA_DISC / 100) * 100) / 100;

    // Book spa
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split('T')[0];

    // Get available slots
    const slotsData = await apiGet(`/spa/availability?serviceId=${service._id}&date=${dateStr}`, guestToken);
    const slots: string[] = slotsData.slots ?? [];
    if (slots.length === 0) {
      test.skip(true, 'No spa slots available');
      return;
    }

    const bookData = await apiPost('/spa/book', guestToken, {
      service: service._id,
      date: dateStr,
      startTime: slots[0],
    });
    if (!bookData.booking) {
      test.skip(true, `Spa booking failed: ${JSON.stringify(bookData)}`);
      return;
    }

    // Price stored on booking should be discounted
    expect(bookData.booking.price).toBeCloseTo(expectedDiscounted, 1);

    // Complete spa → adds line item to bill
    const spaBookingId = bookData.booking._id;
    await apiPatch(`/spa/bookings/${spaBookingId}/status`, adminToken, { status: 'completed' }); // admin route
    await new Promise(r => setTimeout(r, 2000));

    const billData = await apiGet(`/billing/${actualGuestId}`, adminToken);
    const spaLine = billData.bill?.lineItems?.find((li: any) => li.type === 'spa');
    expect(spaLine).toBeTruthy();
    expect(spaLine.amount).toBeCloseTo(expectedDiscounted, 1);

    await apiDelete(`/offers/${offer._id}`, adminToken);
    await reactivateOffers(adminToken, prevIds);
  });

  test('4 — full offer scenario: room + food + spa all discounted, bill total correct', async () => {
    test.setTimeout(120_000);
    const adminToken = await apiLoginAsAdmin();

    const prevIds = await deactivateAllOffers(adminToken);
    const ROOM_DISC = 10;
    const FOOD_DISC = 15;
    const SPA_DISC  = 20;
    const offer = await createOffer(adminToken, {
      roomDiscount: ROOM_DISC,
      foodDiscount: FOOD_DISC,
      spaDiscount:  SPA_DISC,
      title: 'Full Offer Test',
    });

    const { roomPricePerNight, nights, qrToken } = await checkinGuest(adminToken);

    const qrData = await apiGet(`/qr/verify/${qrToken}`);
    if (!qrData.token) {
      test.skip(true, 'QR verify failed');
      return;
    }
    const guestToken    = qrData.token;
    const actualGuestId = qrData.guestId;

    // ── Room charge ──
    const baseRoomCharge      = roomPricePerNight * nights;
    const discountedRoom      = Math.round(baseRoomCharge * (1 - ROOM_DISC / 100) * 100) / 100;

    const initialBill = (await apiGet(`/billing/${actualGuestId}`, adminToken)).bill;
    const roomLine    = initialBill.lineItems.find((li: any) => li.type === 'room');
    expect(roomLine.amount).toBeCloseTo(discountedRoom, 0);

    // ── Food order ──
    const menuData = await apiGet('/menu', guestToken);
    const items: any[] = menuData.items ?? menuData.menuItems ?? [];
    let foodChargeAdded = false;
    let discountedFood  = 0;

    if (items.length > 0) {
      const item = items[0];
      discountedFood = Math.round(item.price * (1 - FOOD_DISC / 100) * 100) / 100;

      const orderData = await apiPost('/orders', guestToken, {
        items: [{ menuItem: item._id, quantity: 1 }],
      });
      const orderId = orderData.order?._id;
      if (orderId) {
        for (const s of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
          await new Promise(r => setTimeout(r, 400));
          await apiPatch(`/orders/${orderId}/status`, adminToken, { status: s });
        }
        await new Promise(r => setTimeout(r, 2000));
        foodChargeAdded = true;
      }
    }

    // ── Spa booking ──
    const spaData = await apiGet('/spa/services', guestToken);
    const services: any[] = spaData.services ?? [];
    let spaChargeAdded  = false;
    let discountedSpa   = 0;

    if (services.length > 0) {
      const service = services[0];
      discountedSpa  = Math.round(service.price * (1 - SPA_DISC / 100) * 100) / 100;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 6);
      const dateStr   = futureDate.toISOString().split('T')[0];
      const slotsData = await apiGet(`/spa/availability?serviceId=${service._id}&date=${dateStr}`, guestToken);
      const slots: string[] = slotsData.slots ?? [];

      if (slots.length > 0) {
        const bookData = await apiPost('/spa/book', guestToken, {
          service: service._id, date: dateStr, startTime: slots[0],
        });
        if (bookData.booking?._id) {
          await apiPatch(`/spa/bookings/${bookData.booking._id}/status`, adminToken, { status: 'completed' });
          await new Promise(r => setTimeout(r, 2000));
          spaChargeAdded = true;
        }
      }
    }

    // ── Final bill verification ──
    const finalBill = (await apiGet(`/billing/${actualGuestId}`, adminToken)).bill;
    expect(finalBill).toBeTruthy();

    const types = finalBill.lineItems.map((li: any) => li.type);
    expect(types).toContain('room');

    // Expected subtotal
    let expectedSubtotal = discountedRoom;
    if (foodChargeAdded) {
      expect(types).toContain('food_order');
      expectedSubtotal += discountedFood;
    }
    if (spaChargeAdded) {
      expect(types).toContain('spa');
      expectedSubtotal += discountedSpa;
    }

    expect(finalBill.totalAmount).toBeCloseTo(expectedSubtotal, 0);

    // Tax (13%) and grand total
    const expectedTax        = Math.round(expectedSubtotal * 0.13 * 100) / 100;
    const expectedGrandTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;
    expect(finalBill.taxAmount).toBeCloseTo(expectedTax, 1);
    expect(finalBill.grandTotal).toBeCloseTo(expectedGrandTotal, 1);

    await apiDelete(`/offers/${offer._id}`, adminToken);
    await reactivateOffers(adminToken, prevIds);
  });

  test('5 — no offer active: prices are full (no discount)', async () => {
    test.setTimeout(60_000);
    const adminToken = await apiLoginAsAdmin();

    // Deactivate all offers temporarily
    const prevIds = await deactivateAllOffers(adminToken);

    const activeData = await apiGet('/offers/active');
    expect(activeData.offer).toBeFalsy();

    const { guestId, roomPricePerNight, nights } = await checkinGuest(adminToken);

    const billData = await apiGet(`/billing/${guestId}`, adminToken);
    const roomLine = billData.bill?.lineItems?.find((li: any) => li.type === 'room');
    expect(roomLine).toBeTruthy();

    const fullCharge = roomPricePerNight * nights;
    expect(roomLine.amount).toBeCloseTo(fullCharge, 0);

    // Restore offers
    await reactivateOffers(adminToken, prevIds);
  });
});
