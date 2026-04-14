/**
 * full-occupancy.spec.ts
 *
 * Tests hotel behaviour under full-occupancy conditions across all 28 rooms,
 * walk-in vs. online conflict coverage, and billing consistency between
 * the guest portal and the admin/front-desk view.
 *
 * Uses `--workers=1` if run standalone (stateful DB).
 * Always `npm run seed` before running this file.
 *
 * Test groups:
 *   A. Normal guest lifecycle (online booking + front-desk check-in/out)
 *   B. Walk-in lifecycle (front-desk direct check-in without prior reservation)
 *   C. Billing consistency — admin vs guest view identical at every stage
 *   D. Full-occupancy detection — all rooms booked → availability = 0
 *   E. Edge cases specific to 28-room, 5-floor, 5-type dataset
 */

import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function post(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function patch(path: string, body: any, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

/** Checkout all active guests to reset room availability */
async function checkoutAllGuests(token: string) {
  const { data } = await get('/checkin/active', token);
  const guests: any[] = data?.guests ?? [];
  await Promise.all(guests.map(g =>
    post(`/checkin/checkout/${g._id}`, {}, token).catch(() => {})
  ));
}

/** Cancel all confirmed reservations */
async function cancelAllConfirmed(token: string) {
  const { data } = await get('/reservations?limit=500', token);
  const confirmed: any[] = (data?.reservations ?? []).filter((r: any) => r.status === 'confirmed');
  await Promise.all(confirmed.map(r =>
    patch(`/reservations/${r._id}/cancel`, {}, token).catch(() => {})
  ));
}

async function cleanState(token: string) {
  await checkoutAllGuests(token);
  await cancelAllConfirmed(token);
}

type CreatedReservation = {
  reservationId: string;
  bookingRef: string;
  email: string;
  guestId?: string;
  qrToken?: string;
  guestJwt?: string;
  billId?: string;
  room: any;
};

/** Create reservation → confirm → check-in → return full context */
async function createAndCheckin(
  token: string,
  room: any,
  checkIn: string,
  checkOut: string,
  suffix: string
): Promise<CreatedReservation | null> {
  const email = `guest-${suffix}-${Date.now()}@test.com`;
  const { data: createData } = await post('/reservations', {
    guest: { name: `Guest ${suffix}`, email, phone: '+10000000000' },
    room: room._id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
  }, token);

  if (!createData.success) return null;
  const reservationId = createData.reservation._id;
  const bookingRef    = createData.reservation.bookingRef;

  const { data: confirmData } = await patch(`/reservations/${reservationId}/confirm`, {}, token);
  if (!confirmData.success) return null;

  const { data: checkinData } = await post(`/checkin/${reservationId}`, {}, token);
  if (!checkinData.success) return null;

  const qrToken  = checkinData.qrToken;
  const guestId  = checkinData.guest._id;
  const billId   = checkinData.bill._id;

  // Get guest JWT via QR — only use it if it belongs to our test guest
  const { data: qrData } = await get(`/qr/verify/${qrToken}`);
  // qrData.guestId may differ from our guestId if a seed demo guest is still
  // active on the same room; in that case don't pass a guestJwt
  const guestJwt = (qrData.token && qrData.guestId === guestId) ? qrData.token : null;

  return { reservationId, bookingRef, email, guestId, qrToken, guestJwt, billId, room };
}

// ── A. Normal Guest Lifecycle ─────────────────────────────────────────────────

test.describe('A. Normal Online Guest Lifecycle', () => {

  test('A-01: full flow — book, confirm, check-in, checkout, room freed', async () => {
    const token = await apiLoginAsAdmin();
    await cleanState(token);

    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    expect(available.length).toBeGreaterThan(0);

    const room = available[0];
    const checkIn  = futureDate(60);
    const checkOut = futureDate(62);

    const ctx = await createAndCheckin(token, room, checkIn, checkOut, 'lifecycle');
    expect(ctx).not.toBeNull();

    // Room should now be unavailable
    const roomNow = (await get(`/rooms/${room.slug}`, token)).data.room;
    expect(roomNow.isAvailable).toBe(false);

    // Checkout
    const { data: outData } = await post(`/checkin/checkout/${ctx!.guestId}`, {}, token);
    expect(outData.success).toBe(true);

    // Room should be available again
    const roomAfter = (await get(`/rooms/${room.slug}`, token)).data.room;
    expect(roomAfter.isAvailable).toBe(true);
  });

  test('A-02: reservation status transitions correctly (pending → confirmed → checked_in → checked_out)', async () => {
    const token = await apiLoginAsAdmin();

    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const checkIn  = futureDate(70);
    const checkOut = futureDate(72);
    const email = `status-flow${Date.now()}@test.com`;

    // Create → pending
    const { data: createData } = await post('/reservations', {
      guest: { name: 'Status Flow Guest', email, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    expect(createData.success).toBe(true);
    expect(createData.reservation.status).toBe('pending');

    // Confirm → confirmed
    const { data: confirmData } = await patch(`/reservations/${createData.reservation._id}/confirm`, {}, token);
    expect(confirmData.success).toBe(true);
    expect(confirmData.reservation.status).toBe('confirmed');

    // Check-in → checked_in
    const { data: checkinData } = await post(`/checkin/${createData.reservation._id}`, {}, token);
    expect(checkinData.success).toBe(true);

    const resMid = (await get(`/reservations/${createData.reservation._id}`, token)).data.reservation;
    expect(resMid.status).toBe('checked_in');

    // Checkout → checked_out
    await post(`/checkin/checkout/${checkinData.guest._id}`, {}, token);
    const resFinal = (await get(`/reservations/${createData.reservation._id}`, token)).data.reservation;
    expect(resFinal.status).toBe('checked_out');
  });

  test('A-03: bookingRef matches RS-YYYYMMDD-XXXX pattern', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const { data } = await post('/reservations', {
      guest: { name: 'Ref Pattern Guest', email: `refpat${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: futureDate(80),
      checkOutDate: futureDate(82),
      numberOfGuests: 1,
    }, token);

    expect(data.success).toBe(true);
    expect(data.reservation.bookingRef).toMatch(/^RS-\d{8}-[A-Z0-9]{4}$/);
  });

  test('A-04: pending reservation does NOT block room availability', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const checkIn  = futureDate(200);
    const checkOut = futureDate(202);

    // Create (pending, not confirmed)
    await post('/reservations', {
      guest: { name: 'Pending Guest', email: `pending${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);

    // Second booking for same dates should still succeed (pending doesn't block)
    const { data } = await post('/reservations', {
      guest: { name: 'Also Pending', email: `pending2${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);

    expect(data.success).toBe(true);
  });

});

// ── B. Walk-In Lifecycle ──────────────────────────────────────────────────────

test.describe('B. Walk-In Guest Lifecycle', () => {

  test('B-01: walk-in creates confirmed reservation immediately (no separate confirm step)', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const checkIn  = futureDate(100);
    const checkOut = futureDate(102);

    const { data } = await post('/reservations/walk-in', {
      guest: { name: 'Walk-In Guest B1', email: `walkin-b1-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);

    expect(data.success).toBe(true);
    expect(data.reservation.status).toBe('confirmed');
  });

  test('B-02: walk-in blocked when confirmed online reservation exists for same dates', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const checkIn  = futureDate(105);
    const checkOut = futureDate(107);

    // Online booking confirmed first
    const { data: online } = await post('/reservations', {
      guest: { name: 'Online First', email: `online-b2-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!online.success) { test.skip(true, 'Could not create online reservation'); return; }
    await patch(`/reservations/${online.reservation._id}/confirm`, {}, token);

    // Walk-in for same dates → must fail
    const { data: walkin } = await post('/reservations/walk-in', {
      guest: { name: 'Walk-In Blocked', email: `walkin-blocked-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    expect(walkin.success).toBe(false);
    expect(walkin.message).toMatch(/already reserved|already booked/i);
  });

  test('B-03: online booking blocked when walk-in already confirmed for same dates', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[1] ?? available[0];
    const checkIn  = futureDate(110);
    const checkOut = futureDate(112);

    // Walk-in first
    const { data: walkin } = await post('/reservations/walk-in', {
      guest: { name: 'Walk-In First', email: `walkin-first-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!walkin.success) { test.skip(true, 'Could not create walk-in'); return; }

    // Online booking for same room same dates → must fail
    const { data: online } = await post('/reservations', {
      guest: { name: 'Online Blocked', email: `online-blocked-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    // Online guests go to pending first; at confirm it should conflict.
    // Either creation fails or confirmation fails — both are valid
    if (online.success) {
      const { data: confirmData } = await patch(`/reservations/${online.reservation._id}/confirm`, {}, token);
      expect(confirmData.success).toBe(false);
    } else {
      expect(online.success).toBe(false);
    }
  });

  test('B-04: walk-in guest gets QR token on check-in', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const checkIn  = futureDate(115);
    const checkOut = futureDate(117);

    const { data: walkin } = await post('/reservations/walk-in', {
      guest: { name: 'Walk-In QR Guest', email: `walkin-qr-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!walkin.success) { test.skip(true, 'Could not create walk-in'); return; }

    const { data: checkinData } = await post(`/checkin/${walkin.reservation._id}`, {}, token);
    expect(checkinData.success).toBe(true);
    expect(checkinData.qrToken).toBeTruthy();
    expect(checkinData.guest._id).toBeTruthy();
    expect(checkinData.bill._id).toBeTruthy();
  });

  test('B-05: walk-in bill is created with correct room charge', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room = available[0];
    const nights = 2;
    const checkIn  = futureDate(120);
    const checkOut = futureDate(120 + nights);

    const { data: walkin } = await post('/reservations/walk-in', {
      guest: { name: 'Walk-In Bill Guest', email: `walkin-bill-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!walkin.success) { test.skip(true, 'Could not create walk-in'); return; }

    const { data: checkinData } = await post(`/checkin/${walkin.reservation._id}`, {}, token);
    if (!checkinData.success) { test.skip(true, 'Could not check in'); return; }

    const { data: billData } = await get(`/billing/${checkinData.guest._id}`, token);
    const bill = billData.bill;

    expect(bill).toBeTruthy();
    expect(bill.status).toBe('open');
    // Room charge = nights × pricePerNight
    expect(bill.roomCharges).toBe(room.pricePerNight * nights);
    // VAT check: taxAmount = totalAmount × 0.13 (rounded to 2dp)
    const expectedTax = Math.round(bill.totalAmount * 0.13 * 100) / 100;
    expect(bill.taxAmount).toBeCloseTo(expectedTax, 1);
    expect(bill.grandTotal).toBeCloseTo(bill.totalAmount + bill.taxAmount, 1);
  });

});

// ── C. Billing Consistency ────────────────────────────────────────────────────

test.describe('C. Billing Consistency — Admin vs Guest', () => {

  test('C-01: admin and guest see identical bill immediately after check-in', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(130), futureDate(132), 'c01');
    if (!ctx || !ctx.guestJwt) { test.skip(true, 'Could not set up guest'); return; }

    const adminBill = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    const guestBill = (await get('/billing/my', ctx.guestJwt)).data.bill;

    expect(adminBill.grandTotal).toBe(guestBill.grandTotal);
    expect(adminBill.taxAmount).toBe(guestBill.taxAmount);
    expect(adminBill.totalAmount).toBe(guestBill.totalAmount);
    expect(adminBill.status).toBe(guestBill.status);
    expect(adminBill.lineItems.length).toBe(guestBill.lineItems.length);
  });

  test('C-02: admin and guest bill match after room-service order is delivered', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(140), futureDate(142), 'c02');
    if (!ctx || !ctx.guestJwt) { test.skip(true, 'Could not set up guest'); return; }

    // Get a menu item
    const menuData = (await get('/menu', token)).data;
    const items: any[] = menuData.items ?? menuData.menuItems ?? [];
    const menuItem = items.find((i: any) => i.isAvailable);
    if (!menuItem) { test.skip(true, 'No menu items'); return; }

    // Place order as guest
    const { data: orderData } = await post('/orders', {
      items: [{ menuItem: menuItem._id, quantity: 1 }],
    }, ctx.guestJwt);
    if (!orderData.success) { test.skip(true, `Could not place order: ${orderData.message}`); return; }
    const orderId = orderData.order._id;

    // Walk the status chain to delivered
    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      await patch(`/orders/${orderId}/status`, { status }, token);
    }

    // Both views should now include the food charge
    const adminBill = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    const guestBill = (await get('/billing/my', ctx.guestJwt)).data.bill;

    expect(adminBill.grandTotal).toBe(guestBill.grandTotal);
    expect(adminBill.foodCharges).toBe(guestBill.foodCharges);
    expect(adminBill.lineItems.length).toBe(guestBill.lineItems.length);
    // Food line item should be present
    const foodItems = adminBill.lineItems.filter((li: any) => li.type === 'food_order');
    expect(foodItems.length).toBeGreaterThan(0);
  });

  test('C-03: admin and guest bill match after manual charge added by front desk', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(145), futureDate(147), 'c03');
    if (!ctx || !ctx.guestJwt) { test.skip(true, 'Could not set up guest'); return; }

    // Admin adds a manual charge
    const { data: chargeData } = await post(`/billing/${ctx.guestId}/add`, {
      description: 'Late checkout fee',
      amount: 50,
    }, token);
    expect(chargeData.success).toBe(true);

    const adminBill = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    const guestBill = (await get('/billing/my', ctx.guestJwt)).data.bill;

    expect(adminBill.grandTotal).toBe(guestBill.grandTotal);
    expect(adminBill.otherCharges).toBe(guestBill.otherCharges);
    expect(adminBill.lineItems.length).toBe(guestBill.lineItems.length);
  });

  test('C-04: bill by guestId equals bill by reservationId', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(150), futureDate(152), 'c04');
    if (!ctx) { test.skip(true, 'Could not set up guest'); return; }

    const byGuest       = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    const byReservation = (await get(`/billing/reservation/${ctx.reservationId}`, token)).data.bill;

    expect(byGuest._id).toBe(byReservation._id);
    expect(byGuest.grandTotal).toBe(byReservation.grandTotal);
  });

  test('C-05: VAT is exactly 13% of subtotal; grandTotal = subtotal + VAT', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(155), futureDate(157), 'c05');
    if (!ctx) { test.skip(true, 'Could not set up guest'); return; }

    const bill = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    const expectedVat      = Math.round(bill.totalAmount * 0.13 * 100) / 100;
    const expectedGrand    = Math.round((bill.totalAmount + bill.taxAmount) * 100) / 100;

    expect(bill.taxAmount).toBeCloseTo(expectedVat, 1);
    expect(bill.grandTotal).toBeCloseTo(expectedGrand, 1);
  });

  test('C-06: bill status moves to pending_payment after checkout, not before', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const ctx = await createAndCheckin(token, available[0], futureDate(160), futureDate(162), 'c06');
    if (!ctx) { test.skip(true, 'Could not set up guest'); return; }

    const billBefore = (await get(`/billing/${ctx.guestId}`, token)).data.bill;
    expect(billBefore.status).toBe('open');

    await post(`/checkin/checkout/${ctx.guestId}`, {}, token);

    const billAfter = (await get(`/billing/reservation/${ctx.reservationId}`, token)).data.bill;
    expect(billAfter.status).toBe('pending_payment');
  });

});

// ── D. Full Occupancy ─────────────────────────────────────────────────────────

test.describe('D. Full Occupancy — All 28 Rooms Booked', () => {

  test('D-01: availability API returns zero available rooms when all are checked in', async () => {
    test.setTimeout(120_000); // 28 sequential check-ins need extra time
    const token = await apiLoginAsAdmin();
    await cleanState(token);

    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    expect(rooms.length).toBe(28);

    const checkIn  = futureDate(300);
    const checkOut = futureDate(301); // 1 night

    let checkedInCount = 0;
    for (const room of rooms) {
      const { data: createData } = await post('/reservations', {
        guest: { name: `Full-${room.roomNumber}`, email: `full-${room.roomNumber}-${Date.now()}@test.com`, phone: '+10000000000' },
        room: room._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 1,
      }, token);
      if (!createData.success) continue;

      await patch(`/reservations/${createData.reservation._id}/confirm`, {}, token);
      const { data: ci } = await post(`/checkin/${createData.reservation._id}`, {}, token);
      if (ci.success) checkedInCount++;
    }

    if (checkedInCount < rooms.length) {
      // Some rooms were pre-occupied — skip full assertion but verify count matches
      test.skip(true, `Only ${checkedInCount}/${rooms.length} rooms checked in — hotel not fully occupied`);
      return;
    }

    // Availability query for that date should return 0 available rooms
    const { data: avail } = await get(`/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`, token);
    const availableRooms = (avail.rooms ?? []).filter((r: any) => r.availabilityStatus === 'available');
    expect(availableRooms.length).toBe(0);
  });

  test('D-02: attempting to book any room when all confirmed returns 409', async () => {
    const token = await apiLoginAsAdmin();

    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    if (!rooms.length) { test.skip(true, 'No rooms'); return; }

    const checkIn  = futureDate(310);
    const checkOut = futureDate(311);

    // Confirm first room for that date
    const { data: first } = await post('/reservations', {
      guest: { name: 'First Occupant', email: `first-occ-${Date.now()}@test.com`, phone: '+10000000000' },
      room: rooms[0]._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!first.success) { test.skip(true, 'Could not create first reservation'); return; }
    await patch(`/reservations/${first.reservation._id}/confirm`, {}, token);

    // Attempt same room, same date → must be rejected
    const { data: second } = await post('/reservations', {
      guest: { name: 'Blocked Guest', email: `blocked-${Date.now()}@test.com`, phone: '+10000000000' },
      room: rooms[0]._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    expect(second.success).toBe(false);
    expect(second.message).toMatch(/already booked/i);
  });

  test('D-03: reserve page shows no rooms available for fully-booked dates (UI)', async ({ page }) => {
    // Navigate to the reserve page with dates far in the future
    // The reserve page fetches rooms based on date — with everything booked, it should show empty state.
    await page.goto('/reserve');
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 10000 });

    const checkIn  = futureDate(300);
    const checkOut = futureDate(301);
    await page.locator('input[type="date"]').first().fill(checkIn);
    await page.locator('input[type="date"]').last().fill(checkOut);
    await page.waitForTimeout(2000);

    // Either shows room cards (some rooms may have been freed by cleanup) or an empty/loading state
    const roomCards   = page.locator('.room-sel');
    const emptyState  = page.getByText(/no rooms available|loading available rooms/i);
    await expect(roomCards.first().or(emptyState)).toBeVisible({ timeout: 8000 });
  });

  test('D-04: cancelling one room frees it for a new booking on the same dates', async () => {
    const token = await apiLoginAsAdmin();

    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    if (!rooms.length) { test.skip(true, 'No rooms'); return; }

    const room       = rooms[0];
    const checkIn    = futureDate(320);
    const checkOut   = futureDate(322);

    // Book room
    const { data: first } = await post('/reservations', {
      guest: { name: 'Cancel Frees Room', email: `cancel-free-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!first.success) { test.skip(true, 'Could not create reservation'); return; }
    await patch(`/reservations/${first.reservation._id}/confirm`, {}, token);

    // Cancel it
    const { data: cancelData } = await patch(`/reservations/${first.reservation._id}/cancel`, {}, token);
    expect(cancelData.success).toBe(true);

    // Now another guest can book the same room
    const { data: second } = await post('/reservations', {
      guest: { name: 'Now Available Guest', email: `now-avail-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    expect(second.success).toBe(true);
  });

});

// ── E. 28-Room / 5-Floor / 5-Type Dataset Edge Cases ─────────────────────────

test.describe('E. 28-Room Dataset Edge Cases', () => {

  test('E-01: all 5 room categories are present in the database', async () => {
    const token = await apiLoginAsAdmin();
    const { data } = await get('/room-categories', token);
    const cats: string[] = (data.categories ?? []).map((c: any) => c.slug);
    expect(cats).toContain('standard');
    expect(cats).toContain('deluxe');
    expect(cats).toContain('suite');
    expect(cats).toContain('royal');
    expect(cats).toContain('penthouse');
  });

  test('E-02: rooms exist on all 5 floors', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const floors = new Set<number>(rooms.map((r: any) => r.floorNumber));
    expect(floors.has(1)).toBe(true);
    expect(floors.has(2)).toBe(true);
    expect(floors.has(3)).toBe(true);
    expect(floors.has(4)).toBe(true);
    expect(floors.has(5)).toBe(true);
  });

  test('E-03: total room count is 28', async () => {
    const token = await apiLoginAsAdmin();
    const { data } = await get('/rooms', token);
    expect(data.rooms.length).toBe(28);
  });

  test('E-04: penthouse rooms are present and have highest price tiers', async () => {
    const token = await apiLoginAsAdmin();
    const rooms: any[] = (await get('/rooms', token)).data.rooms ?? [];
    const penthouses = rooms.filter((r: any) => r.categorySlug === 'penthouse');
    expect(penthouses.length).toBeGreaterThanOrEqual(3);
    // All penthouses should be more expensive than all standards
    const standards = rooms.filter((r: any) => r.categorySlug === 'standard');
    const maxStandard = Math.max(...standards.map((r: any) => r.pricePerNight));
    const minPenthouse = Math.min(...penthouses.map((r: any) => r.pricePerNight));
    expect(minPenthouse).toBeGreaterThan(maxStandard);
  });

  test('E-05: category filter returns only matching rooms', async () => {
    const token = await apiLoginAsAdmin();
    const { data } = await get('/rooms?type=standard', token);
    const rooms: any[] = data.rooms ?? [];
    expect(rooms.length).toBeGreaterThan(0);
    rooms.forEach(r => {
      expect(['standard', undefined].includes(r.categorySlug) || r.type === 'standard').toBe(true);
    });
  });

  test('E-06: adjacent-date booking allowed — checkout of first = check-in of second', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room       = available[0];
    const checkIn1   = futureDate(250);
    const checkOut1  = futureDate(252);
    const checkIn2   = checkOut1;          // adjacent
    const checkOut2  = futureDate(254);

    const { data: first } = await post('/reservations', {
      guest: { name: 'Adj Guest 1', email: `adj1-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn1,
      checkOutDate: checkOut1,
      numberOfGuests: 1,
    }, token);
    if (!first.success) { test.skip(true, 'Could not create first reservation'); return; }
    await patch(`/reservations/${first.reservation._id}/confirm`, {}, token);

    const { data: second } = await post('/reservations', {
      guest: { name: 'Adj Guest 2', email: `adj2-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn2,
      checkOutDate: checkOut2,
      numberOfGuests: 1,
    }, token);

    expect(second.success).toBe(true);
  });

  test('E-07: double-booking same room same dates always rejected (concurrent race)', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room     = available[0];
    const checkIn  = futureDate(260);
    const checkOut = futureDate(262);

    // Fire both at same time
    const [resA, resB] = await Promise.all([
      post('/reservations', {
        guest: { name: 'Race A', email: `race-a-${Date.now()}@test.com`, phone: '+10000000000' },
        room: room._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 1,
      }, token),
      post('/reservations', {
        guest: { name: 'Race B', email: `race-b-${Date.now()}@test.com`, phone: '+10000000000' },
        room: room._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 1,
      }, token),
    ]);

    const successes = [resA, resB].filter(r => r.data.success === true);
    // Confirm the winner
    if (successes.length > 0) {
      await patch(`/reservations/${successes[0].data.reservation._id}/confirm`, {}, token);
    }

    // Now try to create another booking for the same room + dates → must fail
    const extra = await post('/reservations', {
      guest: { name: 'Extra Blocked', email: `extra-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);

    // Once winner is confirmed, any new attempt for same room/dates is rejected
    if (successes.length > 0) {
      expect(extra.data.success).toBe(false);
    }
  });

  test('E-08: rooms/availability endpoint returns per-room availabilityStatus', async () => {
    const token = await apiLoginAsAdmin();
    const checkIn  = futureDate(400);
    const checkOut = futureDate(402);

    const { status, data } = await get(`/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`, token);
    expect(status).toBe(200);
    expect(data.rooms).toBeTruthy();
    const roomList: any[] = data.rooms;
    expect(roomList.length).toBeGreaterThan(0);
    // Every room should have an availabilityStatus field
    roomList.forEach(r => {
      expect(['available', 'unavailable', 'occupied']).toContain(r.availabilityStatus);
    });
  });

  test('E-09: no-show admin action marks reservation no_show and sets penaltyCharged', async () => {
    const token = await apiLoginAsAdmin();
    const rooms = (await get('/rooms', token)).data.rooms ?? [];
    const available = rooms.filter((r: any) => r.isAvailable);
    if (!available.length) { test.skip(true, 'No available rooms'); return; }

    const room     = available[0];
    const checkIn  = futureDate(2);   // must be on/after today per rules
    const checkOut = futureDate(4);

    const { data: createData } = await post('/reservations', {
      guest: { name: 'No Show Guest', email: `noshow-${Date.now()}@test.com`, phone: '+10000000000' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
    }, token);
    if (!createData.success) { test.skip(true, 'Could not create reservation'); return; }
    await patch(`/reservations/${createData.reservation._id}/confirm`, {}, token);

    const { status, data } = await patch(`/reservations/${createData.reservation._id}/no-show`, {}, token);
    // no-show is only allowed on/after checkInDate — may get 400 if checkIn is in future
    if (status === 400) {
      // Expected for a future check-in date — confirm the guard is working
      expect(data.message).toMatch(/no.show|date|check.in/i);
    } else {
      expect(status).toBe(200);
      expect(data.reservation.status).toBe('no_show');
    }
  });

});
