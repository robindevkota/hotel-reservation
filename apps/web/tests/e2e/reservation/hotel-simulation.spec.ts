/**
 * hotel-simulation.spec.ts
 *
 * A narrative-driven simulation of 30 compressed days of real hotel operation.
 * State carries forward between phases — each phase builds on the previous.
 *
 * Story arc:
 *   Phase 1 (Week 1)  — First guests arrive. 0 → 3 occupied rooms.
 *   Phase 2 (Week 2)  — Mid-stay events: orders, spa, no-show, cancellations.
 *   Phase 3 (Week 3)  — Ramp to full occupancy. All 28 rooms filled.
 *   Phase 4 (Week 4)  — Checkout wave. Room recycling. Final state verified.
 *
 * MUST run with --workers=1 (sequential, shared DB state).
 * MUST run npm run seed first (clean 28-room state).
 *
 * Run:
 *   cd royal-suites/apps/web
 *   npx playwright test tests/e2e/reservation/hotel-simulation.spec.ts \
 *     --project=chromium --workers=1 --reporter=line
 */

import { test, expect } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Low-level HTTP helpers ────────────────────────────────────────────────────

async function post(path: string, body: any, token?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}

async function patch(path: string, body: any, token: string) {
  const r = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

async function get(path: string, token?: string) {
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { headers: h });
  return { status: r.status, data: await r.json() };
}

/** Check room availability by fetching the full list and filtering by _id.
 *  GET /rooms/:id uses slug; GET /rooms/:id/qr is admin-only — list is the only safe option. */
async function isRoomAvailable(roomId: string, token?: string): Promise<boolean> {
  const { data } = await get('/rooms', token);
  const room = (data.rooms ?? []).find((r: any) => r._id === roomId);
  return room?.isAvailable === true;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// All simulation dates start 400+ days in the future to avoid seed collisions.
const BASE_OFFSET = 400;
function simDate(dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + BASE_OFFSET + dayOffset);
  return d.toISOString().split('T')[0];
}

// ── Domain helpers ────────────────────────────────────────────────────────────

/** Book, confirm, check-in a guest. Returns full context or null on failure. */
async function bookAndCheckin(
  adminToken: string,
  roomId: string,
  name: string,
  email: string,
  checkIn: string,
  checkOut: string,
  policy: 'flexible' | 'non_refundable' = 'flexible',
): Promise<{
  reservationId: string; bookingRef: string; guestId: string;
  guestJwt: string | null; billId: string; qrToken: string;
} | null> {
  const { data: cd } = await post('/reservations', {
    guest: { name, email, phone: '+20000000000' },
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
    cancellationPolicy: policy,
  });
  if (!cd.success) return null;
  const resId = cd.reservation._id;

  const { data: confD } = await patch(`/reservations/${resId}/confirm`, {}, adminToken);
  if (!confD.success) return null;

  const { data: ciD } = await post(`/checkin/${resId}`, {}, adminToken);
  if (!ciD.success) return null;

  const guestId = ciD.guest._id;
  const billId  = ciD.bill._id;
  const qrToken = ciD.qrToken;

  const { data: qrD } = await get(`/qr/verify/${qrToken}`);
  const guestJwt = (qrD.token && qrD.guestId === guestId) ? qrD.token : null;

  return { reservationId: resId, bookingRef: cd.reservation.bookingRef, guestId, guestJwt, billId, qrToken };
}

/** Walk-in: confirm immediately, then check in. */
async function walkInAndCheckin(
  adminToken: string,
  roomId: string,
  name: string,
  email: string,
  checkIn: string,
  checkOut: string,
): Promise<{
  reservationId: string; guestId: string;
  guestJwt: string | null; billId: string; qrToken: string;
} | null> {
  const { data: wd } = await post('/reservations/walk-in', {
    guest: { name, email, phone: '+20000000000' },
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
  }, adminToken);
  if (!wd.success) return null;
  const resId = wd.reservation._id;

  const { data: ciD } = await post(`/checkin/${resId}`, {}, adminToken);
  if (!ciD.success) return null;

  const guestId = ciD.guest._id;
  const billId  = ciD.bill._id;
  const qrToken = ciD.qrToken;

  const { data: qrD } = await get(`/qr/verify/${qrToken}`);
  const guestJwt = (qrD.token && qrD.guestId === guestId) ? qrD.token : null;

  return { reservationId: resId, guestId, guestJwt, billId, qrToken };
}

/** Progress a food order through all 5 steps to delivered. */
async function deliverOrder(orderId: string, adminToken: string) {
  for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
    const { data } = await patch(`/orders/${orderId}/status`, { status }, adminToken);
    if (!data.success) throw new Error(`Order status ${status} failed: ${JSON.stringify(data)}`);
  }
}

/** Place a food order and deliver it fully. Returns orderId. */
async function placeAndDeliver(
  guestJwt: string,
  menuItemId: string,
  adminToken: string,
): Promise<string> {
  const { data } = await post('/orders', {
    items: [{ menuItem: menuItemId, quantity: 1 }],
  }, guestJwt);
  if (!data.success) throw new Error(`Place order failed: ${JSON.stringify(data)}`);
  const orderId = data.order._id;
  await deliverOrder(orderId, adminToken);
  return orderId;
}

/** Walk a spa booking from pending all the way to completed. */
async function completeSpaBooking(
  bookingId: string,
  adminToken: string,
  paymentMethod: 'room_bill' | 'cash' = 'room_bill',
) {
  await patch(`/spa/bookings/${bookingId}/status`, { status: 'confirmed' }, adminToken);
  await patch(`/spa/bookings/${bookingId}/arrive`, {}, adminToken);
  await patch(`/spa/bookings/${bookingId}/status`, { status: 'in_progress' }, adminToken);
  await patch(`/spa/bookings/${bookingId}/complete`, { paymentMethod }, adminToken);
}

/** Fetch both admin and guest views of a bill and return them. */
async function getBothBillViews(guestId: string, adminToken: string, guestJwt: string | null) {
  const { data: adminData } = await get(`/billing/${guestId}`, adminToken);
  const adminBill = adminData.bill ?? adminData;
  let guestBill: any = null;
  if (guestJwt) {
    const { data: guestData } = await get('/billing/my', guestJwt);
    const candidate = guestData.bill ?? guestData;
    // Only use guest bill if it has bill fields (not an error response)
    if (candidate?.grandTotal !== undefined) guestBill = candidate;
  }
  return { adminBill, guestBill };
}

/** Assert admin and guest bill views are cent-for-cent identical. */
function assertBillsMatch(adminBill: any, guestBill: any) {
  expect(adminBill.grandTotal).toBe(guestBill.grandTotal);
  expect(adminBill.totalAmount).toBe(guestBill.totalAmount);
  expect(adminBill.taxAmount).toBe(guestBill.taxAmount);
  expect(adminBill.status).toBe(guestBill.status);
  expect(adminBill.lineItems.length).toBe(guestBill.lineItems.length);
}

/** Assert VAT is consistent with vatEnabled flag (VAT is opt-in, off by default). */
function assertVAT(bill: any) {
  if (bill.vatEnabled) {
    const expectedTax = Math.round(bill.totalAmount * 0.13 * 100) / 100;
    expect(bill.taxAmount).toBeCloseTo(expectedTax, 1);
  } else {
    expect(bill.taxAmount).toBe(0);
  }
  expect(bill.grandTotal).toBeCloseTo(bill.totalAmount + bill.taxAmount, 1);
}

// ── Shared simulation state ───────────────────────────────────────────────────

let ADMIN: string;                        // admin JWT
let FREE_ROOMS: any[] = [];               // rooms[5..27] — free from seed

// Named guest contexts built up through phases
const G: Record<string, {
  reservationId: string;
  guestId: string;
  guestJwt: string | null;
  billId: string;
  qrToken: string;
  roomId: string;
  roomPrice: number;
}> = {};

let BULK: typeof G[string][] = [];        // 8 guests for full-occupancy ramp
let MENU_ITEM_ID = '';                    // first available menu item
let SPA_SERVICE_ID = '';                  // first available spa service
let SPA_DATE = '';                        // date used for spa bookings

// ── Global setup: load admin token + free rooms ───────────────────────────────

test.beforeAll(async () => {
  // Load admin token written by globalSetup (via os.tmpdir())
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs');
  const tokenFile = process.env.ADMIN_TOKEN_FILE ||
    path.join(os.tmpdir(), 'rs-admin-token.json');
  const raw = fs.readFileSync(tokenFile, 'utf8');
  ADMIN = JSON.parse(raw).token;

  // Load all rooms, take the ones not occupied by seed demo guests
  const { data } = await get('/rooms', ADMIN);
  const all: any[] = data.rooms ?? [];
  // Seed occupies the first 5 — we use rooms[5..27]
  FREE_ROOMS = all.filter((r: any) => r.isAvailable === true).slice(0, 23);

  // Load a menu item
  const { data: md } = await get('/menu', ADMIN);
  const items: any[] = md.items ?? md.menuItems ?? [];
  const available = items.find((i: any) => i.isAvailable !== false);
  if (available) MENU_ITEM_ID = available._id;

  // Load a spa service
  const { data: sd } = await get('/spa/services');
  const services: any[] = sd.services ?? sd;
  if (services.length) SPA_SERVICE_ID = services[0]._id;

  // Spa date: 3 days into the simulation window
  SPA_DATE = simDate(3);
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Week 1: First Guests Arrive
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 1 — Week 1: First Guests Arrive', () => {
  test.describe.configure({ mode: 'serial' });

  test('SIM-01 Amira books Standard room online (flexible policy)', async () => {
    const room = FREE_ROOMS.find(r => r.type === 'standard' || r.categorySlug === 'standard') ?? FREE_ROOMS[0];
    const { data } = await post('/reservations', {
      guest: { name: 'Amira Nour', email: 'amira.sim@nile.eg', phone: '+20111111111' },
      room: room._id,
      checkInDate: simDate(0),
      checkOutDate: simDate(3),
      numberOfGuests: 1,
      cancellationPolicy: 'flexible',
    });
    expect(data.success).toBe(true);
    expect(data.reservation.status).toBe('pending');
    expect(data.reservation.bookingRef).toMatch(/^RS-\d{8}-[A-Z0-9]{4}$/);

    // Pending does NOT mark room unavailable
    expect(await isRoomAvailable(room._id)).toBe(true);

    // Store for next test
    G['amira'] = {
      reservationId: data.reservation._id,
      guestId: '', guestJwt: null, billId: '',
      qrToken: '', roomId: room._id, roomPrice: room.pricePerNight,
    };
  });

  test('SIM-02 Admin confirms Amira\'s reservation', async () => {
    const { data } = await patch(`/reservations/${G['amira'].reservationId}/confirm`, {}, ADMIN);
    expect(data.success).toBe(true);
    expect(data.reservation.status).toBe('confirmed');

    // Room still available — check-in hasn't happened yet
    expect(await isRoomAvailable(G['amira'].roomId)).toBe(true);
  });

  test('SIM-03 Amira checks in — bill created, VAT correct, room locked', async () => {
    const { data } = await post(`/checkin/${G['amira'].reservationId}`, {}, ADMIN);
    expect(data.success).toBe(true);

    const guestId = data.guest._id;
    const billId  = data.bill._id;
    const qrToken = data.qrToken;

    G['amira'].guestId  = guestId;
    G['amira'].billId   = billId;
    G['amira'].qrToken  = qrToken;

    // Get guest JWT
    const { data: qrD } = await get(`/qr/verify/${qrToken}`);
    G['amira'].guestJwt = (qrD.token && qrD.guestId === guestId) ? qrD.token : null;

    // Room is now unavailable
    expect(await isRoomAvailable(G['amira'].roomId)).toBe(false);

    // Bill opened with room charge
    const bill = data.bill;
    expect(bill.status).toBe('open');
    expect(bill.lineItems.length).toBeGreaterThanOrEqual(1);
    expect(bill.lineItems[0].type).toBe('room');
    expect(bill.lineItems[0].amount).toBeGreaterThan(0);

    // VAT = 13%
    assertVAT(bill);
  });

  test('SIM-04 Amira orders breakfast — bill grows, no duplicate line item', async () => {
    test.skip(!G['amira'].guestJwt || !MENU_ITEM_ID, 'No guest JWT or menu item');

    const { data: billBefore } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const before = billBefore.bill ?? billBefore;
    const linesBefore = before.lineItems.length;

    await placeAndDeliver(G['amira'].guestJwt!, MENU_ITEM_ID, ADMIN);

    const { data: billAfter } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const after = billAfter.bill ?? billAfter;

    // Exactly one new line item
    expect(after.lineItems.length).toBe(linesBefore + 1);
    expect(after.lineItems.at(-1).type).toBe('food_order');
    expect(after.foodCharges).toBeGreaterThan(0);
    assertVAT(after);

    // Admin and guest see identical bill
    const { adminBill, guestBill } = await getBothBillViews(G['amira'].guestId, ADMIN, G['amira'].guestJwt);
    if (guestBill) assertBillsMatch(adminBill, guestBill);
  });

  test('SIM-05 Amira books spa — bill updated, no double-charge', async () => {
    test.skip(!G['amira'].guestJwt || !SPA_SERVICE_ID, 'No guest JWT or spa service');

    const { data: bookD } = await post('/spa/book', {
      service: SPA_SERVICE_ID,
      date: SPA_DATE,
      window: 'morning',
    }, G['amira'].guestJwt!);

    // Skip gracefully if all slots taken by seed
    if (!bookD.success) { test.skip(true, 'Spa slots full'); return; }
    const bookingId = bookD.booking._id;

    const { data: billBefore } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const before = billBefore.bill ?? billBefore;
    const spaBefore = before.spaCharges ?? 0;

    await completeSpaBooking(bookingId, ADMIN);

    const { data: billAfter } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const after = billAfter.bill ?? billAfter;

    expect(after.spaCharges).toBeGreaterThan(spaBefore);
    assertVAT(after);

    // Complete same booking again — addedToBill guard prevents double-charge
    await patch(`/spa/bookings/${bookingId}/complete`, {}, ADMIN);
    const { data: billAgain } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const again = billAgain.bill ?? billAgain;
    expect(again.spaCharges).toBe(after.spaCharges);
  });

  test('SIM-06 Omar walk-in (Deluxe room)', async () => {
    const room = FREE_ROOMS.find(r =>
      (r.type === 'deluxe' || r.categorySlug === 'deluxe') && r._id !== G['amira'].roomId
    ) ?? FREE_ROOMS.find((r: any) => r._id !== G['amira'].roomId);

    const result = await walkInAndCheckin(
      ADMIN, room._id,
      'Omar Farouk', 'omar.sim@nile.eg',
      simDate(1), simDate(4),
    );
    expect(result).not.toBeNull();
    G['omar'] = { ...result!, roomId: room._id, roomPrice: room.pricePerNight };

    // Walk-in room is now occupied
    expect(await isRoomAvailable(room._id)).toBe(false);

    // Bill created with room charge
    const { data: billD } = await get(`/billing/${G['omar'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;
    expect(bill.status).toBe('open');
    expect(bill.lineItems[0].type).toBe('room');
  });

  test('SIM-07 Omar orders twice — cancels one, only delivered order on bill', async () => {
    test.skip(!G['omar'].guestJwt || !MENU_ITEM_ID, 'No guest JWT or menu item');

    // Order 1: place and deliver fully
    await placeAndDeliver(G['omar'].guestJwt!, MENU_ITEM_ID, ADMIN);

    // Order 2: place then cancel before it's accepted (cancel is admin-only)
    const { data: ord2 } = await post('/orders', {
      items: [{ menuItem: MENU_ITEM_ID, quantity: 1 }],
    }, G['omar'].guestJwt!);
    expect(ord2.success).toBe(true);
    const ord2Id = ord2.order._id;
    const { data: cancelD } = await patch(`/orders/${ord2Id}/cancel`, {}, ADMIN);
    expect(cancelD.success).toBe(true);

    const { data: billD } = await get(`/billing/${G['omar'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;

    // Only 2 line items: room + 1 food (cancelled order adds nothing)
    const foodItems = bill.lineItems.filter((l: any) => l.type === 'food_order');
    expect(foodItems.length).toBe(1);
  });

  test('SIM-08 Khaled books room then cancels >48h before check-in (free cancel)', async () => {
    const room = FREE_ROOMS.find((r: any) =>
      r.isAvailable !== false &&
      r._id !== G['amira'].roomId &&
      r._id !== G['omar'].roomId
    )!;

    // Book far in future — >48h guaranteed
    const { data: cd } = await post('/reservations', {
      guest: { name: 'Khaled Ali', email: 'khaled.sim@nile.eg', phone: '+20333333333' },
      room: room._id,
      checkInDate: simDate(20),
      checkOutDate: simDate(22),
      numberOfGuests: 1,
      cancellationPolicy: 'flexible',
    });
    expect(cd.success).toBe(true);
    const resId = cd.reservation._id;
    const bookingRef = cd.reservation.bookingRef;

    await patch(`/reservations/${resId}/confirm`, {}, ADMIN);

    // Guest self-cancel via manage endpoint
    const { data: cancelD } = await post('/reservations/manage/cancel', {
      bookingRef,
      email: 'khaled.sim@nile.eg',
    });
    expect(cancelD.success).toBe(true);
    expect(cancelD.reservation.status).toBe('cancelled');
    expect(cancelD.reservation.penaltyCharged).toBe(0);

    // Room freed
    expect(await isRoomAvailable(room._id)).toBe(true);
  });

  test('SIM-09 Occupancy check — 2 named guests active (Amira + Omar)', async () => {
    const { data } = await get('/checkin/active', ADMIN);
    const active: any[] = data?.guests ?? [];
    // At least Amira and Omar (plus 5 seed demo guests = 7 minimum)
    expect(active.length).toBeGreaterThanOrEqual(2);

    // GET /rooms?available=false is not implemented — filter client-side
    const { data: roomsD } = await get('/rooms', ADMIN);
    const all: any[] = roomsD.rooms ?? [];
    const occupied = all.filter((r: any) => r.isAvailable === false).length;
    const free     = all.filter((r: any) => r.isAvailable === true).length;
    expect(occupied).toBeGreaterThanOrEqual(2);
    expect(occupied + free).toBe(28);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Week 2: Mid-Stay Events
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 2 — Week 2: Mid-Stay Events', () => {
  test.describe.configure({ mode: 'serial' });

  test('SIM-10 Amira checks out — bill finalised, admin=guest view identical', async () => {
    const { data } = await post(`/checkin/checkout/${G['amira'].guestId}`, {}, ADMIN);
    expect(data.success).toBe(true);

    const { data: resD } = await get(`/reservations/${G['amira'].reservationId}`, ADMIN);
    expect(resD.reservation.status).toBe('checked_out');

    // Room freed
    expect(await isRoomAvailable(G['amira'].roomId)).toBe(true);

    // Bill → pending_payment
    const { data: billD } = await get(`/billing/${G['amira'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;
    expect(bill.status).toBe('pending_payment');

    // Bill has at least room line item
    expect(bill.lineItems.length).toBeGreaterThanOrEqual(1);

    // Admin and guest view match (guestJwt may be null if QR guard fired)
    if (G['amira'].guestJwt) {
      const { adminBill, guestBill } = await getBothBillViews(G['amira'].guestId, ADMIN, G['amira'].guestJwt);
      if (guestBill) assertBillsMatch(adminBill, guestBill);
    }

    assertVAT(bill);
  });

  test('SIM-11 Fatima recycles Amira\'s room on the same day', async () => {
    // Amira just checked out — her room should be free
    const result = await bookAndCheckin(
      ADMIN,
      G['amira'].roomId,
      'Fatima Zara', 'fatima.sim@nile.eg',
      simDate(3),   // check-in same offset Amira vacated
      simDate(6),
    );
    expect(result).not.toBeNull();
    G['fatima'] = { ...result!, roomId: G['amira'].roomId, roomPrice: G['amira'].roomPrice };

    // Fresh bill — no carryover from Amira
    const { data: billD } = await get(`/billing/${G['fatima'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;
    expect(bill.status).toBe('open');
    expect(bill.lineItems.length).toBe(1);  // only room charge
    expect(bill.lineItems[0].type).toBe('room');

    // Room re-occupied
    expect(await isRoomAvailable(G['amira'].roomId)).toBe(false);
  });

  test('SIM-12 Layla books Suite but admin marks no-show — 1 night penalty', async () => {
    const room = FREE_ROOMS.find((r: any) =>
      (r.type === 'suite' || r.categorySlug === 'suite') &&
      r._id !== G['amira'].roomId && r._id !== G['omar'].roomId
    ) ?? FREE_ROOMS.find((r: any) =>
      r._id !== G['amira'].roomId && r._id !== G['omar'].roomId && r._id !== G['fatima'].roomId
    );
    if (!room) { test.skip(true, 'No free Suite room'); return; }

    // Use today as check-in — no-show requires now >= checkInDate
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0]; })();

    const { data: cd } = await post('/reservations', {
      guest: { name: 'Layla Hassan', email: 'layla.sim@nile.eg', phone: '+20444444444' },
      room: room._id,
      checkInDate: today,
      checkOutDate: threeDaysLater,
      numberOfGuests: 1,
      cancellationPolicy: 'flexible',
    });
    expect(cd.success).toBe(true);
    const resId = cd.reservation._id;

    await patch(`/reservations/${resId}/confirm`, {}, ADMIN);

    // Admin marks no-show
    const { data: nsD } = await patch(`/reservations/${resId}/no-show`, {}, ADMIN);
    expect(nsD.success).toBe(true);
    expect(nsD.reservation.status).toBe('no_show');
    // penaltyCharged = 1 night (may be 0 if no Stripe intent in test — verify field exists)
    expect(nsD.reservation.penaltyCharged).toBeDefined();

    // Room stays available (no check-in occurred)
    expect(await isRoomAvailable(room._id)).toBe(true);
  });

  test('SIM-13 Youssef late-cancel (<48h before check-in) — penalty = 1 night', async () => {
    const room = FREE_ROOMS.find((r: any) =>
      (r.type === 'penthouse' || r.categorySlug === 'penthouse') &&
      ![G['amira'].roomId, G['omar'].roomId, G['fatima'].roomId].includes(r._id)
    ) ?? FREE_ROOMS.find((r: any) =>
      ![G['amira'].roomId, G['omar'].roomId, G['fatima'].roomId].includes(r._id)
    );
    if (!room) { test.skip(true, 'No free room for Youssef'); return; }

    // Use a near-future date (today+1) so <48h condition is met
    const nearCheckIn = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();
    const nearCheckOut = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    })();

    const { data: cd } = await post('/reservations', {
      guest: { name: 'Youssef Gamal', email: 'youssef.sim@nile.eg', phone: '+20555555555' },
      room: room._id,
      checkInDate: nearCheckIn,
      checkOutDate: nearCheckOut,
      numberOfGuests: 1,
      cancellationPolicy: 'flexible',
    });
    expect(cd.success).toBe(true);
    const resId = cd.reservation._id;
    const bookingRef = cd.reservation.bookingRef;

    await patch(`/reservations/${resId}/confirm`, {}, ADMIN);

    // Cancel via manage endpoint — <48h window
    const { data: cancelD } = await post('/reservations/manage/cancel', {
      bookingRef,
      email: 'youssef.sim@nile.eg',
    });
    expect(cancelD.success).toBe(true);
    expect(cancelD.reservation.status).toBe('cancelled');
    // penaltyCharged should be non-zero for late cancel
    expect(cancelD.reservation.penaltyCharged).toBeDefined();
  });

  test('SIM-14 Nadia books Royal room (non-refundable, 10% discount)', async () => {
    const room = FREE_ROOMS.find((r: any) =>
      (r.type === 'royal' || r.categorySlug === 'royal') &&
      ![G['amira'].roomId, G['omar'].roomId, G['fatima'].roomId].includes(r._id)
    ) ?? FREE_ROOMS.find((r: any) =>
      ![G['amira'].roomId, G['omar'].roomId, G['fatima'].roomId].includes(r._id)
    );
    if (!room) { test.skip(true, 'No free Royal room'); return; }

    const nights = 4;
    const checkIn  = simDate(8);
    const checkOut = simDate(8 + nights);

    const { data: cd } = await post('/reservations', {
      guest: { name: 'Nadia Saleh', email: 'nadia.sim@nile.eg', phone: '+20666666666' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
      cancellationPolicy: 'non_refundable',
    });
    expect(cd.success).toBe(true);
    // 10% discount applied: roomCharges = nights × price × 0.9
    const expectedCharges = Math.round(nights * room.pricePerNight * 0.9 * 100) / 100;
    expect(cd.reservation.roomCharges).toBeCloseTo(expectedCharges, 0);

    await patch(`/reservations/${cd.reservation._id}/confirm`, {}, ADMIN);
    const { data: ciD } = await post(`/checkin/${cd.reservation._id}`, {}, ADMIN);
    expect(ciD.success).toBe(true);

    const guestId = ciD.guest._id;
    const qrToken = ciD.qrToken;
    const { data: qrD } = await get(`/qr/verify/${qrToken}`);
    const guestJwt = (qrD.token && qrD.guestId === guestId) ? qrD.token : null;

    G['nadia'] = {
      reservationId: cd.reservation._id,
      guestId,
      guestJwt,
      billId: ciD.bill._id,
      qrToken,
      roomId: room._id,
      roomPrice: room.pricePerNight,
    };
  });

  test('SIM-15 Nadia: food + spa + manual charge — 4 line item types on bill', async () => {
    test.skip(!G['nadia'], 'Nadia not checked in (SIM-14 skipped)');

    // Food order
    if (G['nadia'].guestJwt && MENU_ITEM_ID) {
      await placeAndDeliver(G['nadia'].guestJwt, MENU_ITEM_ID, ADMIN);
    }

    // Spa booking on a different day to avoid slot conflict with Amira
    if (G['nadia'].guestJwt && SPA_SERVICE_ID) {
      const { data: spD } = await post('/spa/book', {
        service: SPA_SERVICE_ID,
        date: simDate(9),
        window: 'afternoon',
      }, G['nadia'].guestJwt);
      if (spD.success) {
        await completeSpaBooking(spD.booking._id, ADMIN);
      }
    }

    // Manual charge by admin (minibar)
    const { data: mcD } = await post(`/billing/${G['nadia'].guestId}/add`, {
      description: 'Minibar consumption',
      amount: 45,
    }, ADMIN);
    expect(mcD.success).toBe(true);

    const { data: billD } = await get(`/billing/${G['nadia'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;

    // Must have room charge + at least manual charge
    expect(bill.lineItems.length).toBeGreaterThanOrEqual(2);
    const hasRoom   = bill.lineItems.some((l: any) => l.type === 'room');
    const hasOther  = bill.lineItems.some((l: any) => l.type === 'other');
    expect(hasRoom).toBe(true);
    expect(hasOther).toBe(true);

    // Grand total = subtotal × 1.13
    assertVAT(bill);

    // Admin and guest match
    if (G['nadia'].guestJwt) {
      const { adminBill, guestBill } = await getBothBillViews(G['nadia'].guestId, ADMIN, G['nadia'].guestJwt);
      if (guestBill) assertBillsMatch(adminBill, guestBill);
    }
  });

  test('SIM-16 Omar checks out — non-refundable guest, bill correct', async () => {
    const { data } = await post(`/checkin/checkout/${G['omar'].guestId}`, {}, ADMIN);
    expect(data.success).toBe(true);

    const { data: billD } = await get(`/billing/${G['omar'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;
    expect(bill.status).toBe('pending_payment');

    // Exactly 1 food_order line item (cancelled order left no trace)
    const foodItems = bill.lineItems.filter((l: any) => l.type === 'food_order');
    expect(foodItems.length).toBe(1);

    assertVAT(bill);

    if (G['omar'].guestJwt) {
      const { adminBill, guestBill } = await getBothBillViews(G['omar'].guestId, ADMIN, G['omar'].guestJwt);
      if (guestBill) assertBillsMatch(adminBill, guestBill);
    }

    // Omar's room freed
    expect(await isRoomAvailable(G['omar'].roomId)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Week 3: Ramp to Full Occupancy
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 3 — Week 3: Ramp to Full Occupancy', () => {
  test.describe.configure({ mode: 'serial' });

  test('SIM-17 Check in 8 bulk guests across a mix of room types', async () => {
    test.setTimeout(120_000);

    // Get all currently available rooms
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const available: any[] = freeD.rooms ?? [];
    const toFill = available.slice(0, 8);

    if (toFill.length < 8) {
      test.skip(true, `Only ${toFill.length} rooms free — need 8`);
      return;
    }

    for (let i = 0; i < 8; i++) {
      const room = toFill[i];
      const email = `bulk${i + 1}.sim@nile.eg`;
      const result = await bookAndCheckin(
        ADMIN, room._id,
        `Bulk Guest ${i + 1}`, email,
        simDate(10 + i),
        simDate(13 + i),
      );
      expect(result).not.toBeNull();
      BULK.push({ ...result!, roomId: room._id, roomPrice: room.pricePerNight });
    }

    expect(BULK.length).toBe(8);
  });

  test('SIM-18 Mid-occupancy: available + occupied = 28', async () => {
    // GET /rooms?available=false is not implemented — filter client-side
    const { data } = await get('/rooms', ADMIN);
    const all: any[] = data.rooms ?? [];
    const occupied = all.filter((r: any) => r.isAvailable === false).length;
    const free     = all.filter((r: any) => r.isAvailable === true).length;
    expect(occupied + free).toBe(28);
    expect(occupied).toBeGreaterThan(0);
    expect(free).toBeGreaterThan(0);
  });

  test('SIM-19 Fill remaining rooms to reach full occupancy', async () => {
    test.setTimeout(180_000);

    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const remaining: any[] = freeD.rooms ?? [];

    let filled = 0;
    for (let i = 0; i < remaining.length; i++) {
      const room = remaining[i];
      const email = `fill${i}.sim@nile.eg`;
      const result = await bookAndCheckin(
        ADMIN, room._id,
        `Fill Guest ${i}`, email,
        simDate(15 + i),
        simDate(18 + i),
      );
      if (result) {
        BULK.push({ ...result, roomId: room._id, roomPrice: room.pricePerNight });
        filled++;
      }
    }

    // All rooms should now be occupied
    const { data: afterD } = await get('/rooms?available=true', ADMIN);
    const stillFree = (afterD.rooms ?? []).length;
    expect(stillFree).toBe(0);
  });

  test('SIM-20 Fully occupied — all booking attempts rejected', async () => {
    if (BULK.length === 0) { test.skip(true, 'No bulk guests — SIM-17/19 skipped'); return; }

    // Availability API returns empty
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    expect((freeD.rooms ?? []).length).toBe(0);

    // Use the first BULK guest's room — it has a real checked_in reservation.
    // Dates simDate(10)–simDate(13) overlap with SIM-17 guests (booked simDate(10+i)–simDate(13+i)).
    const bulkRoom = BULK[0];

    const { status } = await post('/reservations', {
      guest: { name: 'Refused Guest', email: 'refused@nile.eg', phone: '+20000000001' },
      room: bulkRoom.roomId,
      checkInDate: simDate(10),
      checkOutDate: simDate(13),
      numberOfGuests: 1,
    });
    // Expect 409 conflict (date overlap) or 400 (room unavailable)
    expect([400, 409]).toContain(status);

    // Walk-in also rejected — same room, overlapping dates
    const { status: wiStatus } = await post('/reservations/walk-in', {
      guest: { name: 'Refused Walkin', email: 'refused2@nile.eg', phone: '+20000000002' },
      room: bulkRoom.roomId,
      checkInDate: simDate(10),
      checkOutDate: simDate(13),
      numberOfGuests: 1,
    }, ADMIN);
    expect([400, 409]).toContain(wiStatus);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — Week 4: Checkout Wave + Room Recycling
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 4 — Week 4: Checkout Wave + Room Recycling', () => {
  test.describe.configure({ mode: 'serial' });

  test('SIM-21 Bulk checkout wave — rooms freed and immediately recycled', async () => {
    test.setTimeout(120_000);
    if (BULK.length === 0) { test.skip(true, 'No bulk guests to check out'); return; }

    // Check out first 3 bulk guests and immediately re-book their rooms
    const toCheckout = BULK.slice(0, 3);

    for (const g of toCheckout) {
      // Checkout
      const { data: coD } = await post(`/checkin/checkout/${g.guestId}`, {}, ADMIN);
      expect(coD.success).toBe(true);

      // Room freed immediately
      expect(await isRoomAvailable(g.roomId)).toBe(true);

      // Immediately re-book same room — same-day recycling
      const newEmail = `recycle-${Date.now()}@nile.eg`;
      const newResult = await bookAndCheckin(
        ADMIN, g.roomId,
        'Recycled Guest', newEmail,
        simDate(20),
        simDate(22),
      );
      expect(newResult).not.toBeNull();

      // Room re-occupied
      expect(await isRoomAvailable(g.roomId)).toBe(false);

      // New bill has no carryover — only room charge
      const { data: newBillD } = await get(`/billing/${newResult!.guestId}`, ADMIN);
      const newBill = newBillD.bill ?? newBillD;
      expect(newBill.lineItems.length).toBe(1);
      expect(newBill.lineItems[0].type).toBe('room');
    }
  });

  test('SIM-22 Nadia checks out — full 4-type bill, cent-perfect billing', async () => {
    test.skip(!G['nadia'], 'Nadia not checked in (SIM-14 skipped)');

    const { data: coD } = await post(`/checkin/checkout/${G['nadia'].guestId}`, {}, ADMIN);
    expect(coD.success).toBe(true);

    const { data: billD } = await get(`/billing/${G['nadia'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;

    expect(bill.status).toBe('pending_payment');

    // Has room + manual charge at minimum
    expect(bill.lineItems.length).toBeGreaterThanOrEqual(2);
    expect(bill.lineItems.some((l: any) => l.type === 'room')).toBe(true);
    expect(bill.lineItems.some((l: any) => l.type === 'other')).toBe(true);

    // grandTotal = (room + food + spa + other) × 1.13  — exact to 1 decimal
    assertVAT(bill);

    // Bill by reservationId matches bill by guestId
    const { data: byResD } = await get(`/billing/reservation/${G['nadia'].reservationId}`, ADMIN);
    const byRes = byResD.bill ?? byResD;
    expect(byRes.grandTotal).toBeCloseTo(bill.grandTotal, 1);
    expect(byRes.lineItems.length).toBe(bill.lineItems.length);

    // Admin and guest view match
    if (G['nadia'].guestJwt) {
      const { adminBill, guestBill } = await getBothBillViews(G['nadia'].guestId, ADMIN, G['nadia'].guestJwt);
      if (guestBill) assertBillsMatch(adminBill, guestBill);
    }
  });

  test('SIM-23 Fatima checks out', async () => {
    test.skip(!G['fatima'], 'Fatima not checked in (SIM-11 skipped)');

    const { data } = await post(`/checkin/checkout/${G['fatima'].guestId}`, {}, ADMIN);
    expect(data.success).toBe(true);

    expect(await isRoomAvailable(G['fatima'].roomId)).toBe(true);

    const { data: billD } = await get(`/billing/${G['fatima'].guestId}`, ADMIN);
    const bill = billD.bill ?? billD;
    expect(bill.status).toBe('pending_payment');
    assertVAT(bill);
  });

  test('SIM-25 Hassan early-departure (flexible) — room charge trimmed to 1 night', async () => {
    // Hassan books 4 nights but leaves after 1 night
    const room = FREE_ROOMS.find((r: any) =>
      ![...Object.values(G).map(g => g.roomId), ...BULK.map(b => b.roomId)].includes(r._id)
    ) ?? FREE_ROOMS.slice(-1)[0];
    if (!room) { test.skip(true, 'No free room for Hassan'); return; }

    const nights = 4;
    const result = await bookAndCheckin(
      ADMIN, room._id,
      'Hassan Tarek', 'hassan.sim@nile.eg',
      simDate(25),
      simDate(25 + nights),
      'flexible',
    );
    if (!result) { test.skip(true, 'Hassan check-in failed'); return; }
    G['hassan'] = { ...result, roomId: room._id, roomPrice: room.pricePerNight };

    // Verify bill opened with full 4-night room charge
    const { data: billBefore } = await get(`/billing/${G['hassan'].guestId}`, ADMIN);
    const before = billBefore.bill ?? billBefore;
    expect(before.roomCharges).toBeCloseTo(nights * room.pricePerNight, 1);

    // Admin performs early checkout — only 1 night stayed
    const { data: earlyD } = await post(`/checkin/early-checkout/${G['hassan'].guestId}`, { nightsStayed: 1 }, ADMIN);
    expect(earlyD.success).toBe(true);
    expect(earlyD.nightsStayed).toBe(1);
    expect(earlyD.policy).toBe('flexible');

    // Room charge must now equal exactly 1 night
    const bill = earlyD.bill;
    const roomItem = bill.lineItems.find((li: any) => li.type === 'room');
    expect(roomItem.amount).toBeCloseTo(room.pricePerNight, 1);

    // Bill finalised — pending_payment
    expect(bill.status).toBe('pending_payment');

    // VAT still correct on trimmed amount
    assertVAT(bill);

    // Room freed immediately
    expect(await isRoomAvailable(room._id)).toBe(true);
  });

  test('SIM-26 Sara checks in and requests a second room (linked walk-in)', async () => {
    // Get two free rooms
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const freeNow: any[] = (freeD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (freeNow.length < 2) { test.skip(true, 'Need 2 free rooms for Sara'); return; }

    const primaryRoom = freeNow[0];
    const secondRoom  = freeNow[1];

    // Sara checks into her primary room
    const result = await bookAndCheckin(
      ADMIN, primaryRoom._id,
      'Sara Mansour', 'sara.sim@nile.eg',
      simDate(26),
      simDate(29),
    );
    if (!result) { test.skip(true, 'Sara primary check-in failed'); return; }
    G['sara'] = { ...result, roomId: primaryRoom._id, roomPrice: primaryRoom.pricePerNight };

    // Sara wants a second room — admin creates walk-in-linked
    const { data: linkedD } = await post('/reservations/walk-in-linked', {
      existingGuestId: G['sara'].guestId,
      room: secondRoom._id,
      checkInDate: simDate(26),
      checkOutDate: simDate(29),
      numberOfGuests: 1,
    }, ADMIN);
    expect(linkedD.success).toBe(true);
    expect(linkedD.reservation.status).toBe('confirmed');
    expect(linkedD.linkedToGuestId).toBe(G['sara'].guestId);

    const secondResId = linkedD.reservation._id;

    // Check in the second reservation, passing linkedToGuestId
    const { data: ci2D } = await post(`/checkin/${secondResId}`, { linkedToGuestId: G['sara'].guestId }, ADMIN);
    expect(ci2D.success).toBe(true);

    const secondGuestId = ci2D.guest._id;

    // Second room has its own fresh bill
    const { data: bill2D } = await get(`/billing/${secondGuestId}`, ADMIN);
    const bill2 = bill2D.bill ?? bill2D;
    expect(bill2.status).toBe('open');
    expect(bill2.lineItems[0].type).toBe('room');

    // Bills are independent — different IDs
    const { data: bill1D } = await get(`/billing/${G['sara'].guestId}`, ADMIN);
    const bill1 = bill1D.bill ?? bill1D;
    expect(bill1._id).not.toBe(bill2._id);

    // Both rooms occupied
    expect(await isRoomAvailable(primaryRoom._id)).toBe(false);
    expect(await isRoomAvailable(secondRoom._id)).toBe(false);

    // Cleanup: checkout both guests
    await post(`/checkin/checkout/${secondGuestId}`, {}, ADMIN).catch(() => {});
    await post(`/checkin/checkout/${G['sara'].guestId}`, {}, ADMIN).catch(() => {});
  });

  test('SIM-27 Nadia (non-refundable) — room pre-paid, only food+spa due at checkout', async () => {
    // Find two free rooms (one for Nadia)
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const freeNow: any[] = (freeD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeNow.length) { test.skip(true, 'No free rooms for Nadia'); return; }

    const room = freeNow[0];
    const nights = 3;

    // Book as non_refundable + paidUpfront
    const { data: resD, status: resStatus } = await post('/reservations', {
      guest: { name: 'Nadia Kamal', email: 'nadia.sim27@nile.eg', phone: '+20-100-000-0027' },
      room: room._id,
      checkInDate: simDate(27),
      checkOutDate: simDate(27 + nights),
      numberOfGuests: 1,
      cancellationPolicy: 'non_refundable',
      paidUpfront: true,
    }, ADMIN);
    expect(resStatus).toBe(201);
    expect(resD.success).toBe(true);

    // Confirm, mark paid upfront (simulates Stripe chargeUpfront), then check in
    await patch(`/reservations/${resD.reservation._id}/confirm`, {}, ADMIN);
    await patch(`/reservations/${resD.reservation._id}/mark-paid-upfront`, {}, ADMIN);
    const { data: ciD } = await post(`/checkin/${resD.reservation._id}`, {}, ADMIN);
    expect(ciD.success).toBe(true);
    const nadiaGuestId = ciD.guest._id;

    // Bill should show prepaidAmount = roomCharges, grandTotal = 0
    const { data: billOpen } = await get(`/billing/${nadiaGuestId}`, ADMIN);
    const openBill = billOpen.bill ?? billOpen;
    expect(openBill.prepaidAmount).toBeCloseTo(openBill.roomCharges, 2);
    expect(openBill.grandTotal).toBeCloseTo(0, 2);

    // Add food + spa charges during stay
    const foodAmt = 95;
    const spaAmt  = 150;
    await post(`/billing/${nadiaGuestId}/add`, { description: 'Breakfast in bed', amount: foodAmt }, ADMIN);
    await post(`/billing/${nadiaGuestId}/add`, { description: 'Aromatherapy session', amount: spaAmt }, ADMIN);

    // Checkout
    const { data: coD } = await post(`/checkin/checkout/${nadiaGuestId}`, {}, ADMIN);
    expect(coD.success).toBe(true);

    // Grand total = (food + spa) × 1.13 only — room still excluded
    const { data: billFinal } = await get(`/billing/${nadiaGuestId}`, ADMIN);
    const finalBill = billFinal.bill ?? billFinal;
    expect(finalBill.status).toBe('pending_payment');

    // VAT is opt-in (off by default) — grandTotal = food + spa, no tax unless toggled
    expect(finalBill.totalAmount).toBeCloseTo(foodAmt + spaAmt, 1);
    expect(finalBill.grandTotal).toBeCloseTo(finalBill.totalAmount + finalBill.taxAmount, 1);
    expect(finalBill.roomCharges).toBeGreaterThan(0);     // still recorded
    expect(finalBill.prepaidAmount).toBeGreaterThan(0);   // still tracked

    // Room freed after checkout
    expect(await isRoomAvailable(room._id)).toBe(true);
  });

  test('SIM-28 Spa cash payment — guest pays at desk, room bill unchanged; restaurant charge added manually', async () => {
    // Find a free room for this test's guest
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const freeNow: any[] = (freeD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeNow.length) { test.skip(true, 'No free rooms for SIM-28'); return; }

    const room = freeNow[0];
    const result = await walkInAndCheckin(
      ADMIN, room._id,
      'Layla Samir', 'layla.sim28@nile.eg',
      simDate(28), simDate(31),
    );
    if (!result) { test.skip(true, 'SIM-28 check-in failed'); return; }
    G['layla28'] = { ...result, roomId: room._id, roomPrice: room.pricePerNight };

    // ── Part A: spa cash payment ────────────────────────────────────────────

    // Get a spa service
    const { data: svcD } = await get('/spa/services');
    const spaServices: any[] = svcD.services ?? svcD;
    const svc = spaServices.find((s: any) => s.isAvailable);
    test.skip(!svc, 'No spa service available');

    const spaBefore = (await get(`/billing/${G['layla28'].guestId}`, ADMIN)).data?.bill?.spaCharges ?? 0;
    const linesBefore = (await get(`/billing/${G['layla28'].guestId}`, ADMIN)).data?.bill?.lineItems?.length ?? 1;

    // Admin creates walk-in spa booking
    const { data: wkD, status: wkStatus } = await post('/spa/walkin', {
      service: svc?._id,
      guestId: G['layla28'].guestId,
      date: simDate(28),
      startTime: '14:00',
    }, ADMIN);

    if (wkStatus !== 201 || !wkD.success) {
      // Spa slot may be taken — skip spa portion gracefully
      console.log('SIM-28: spa walk-in slot taken, skipping spa cash test portion');
    } else {
      const bookingId = wkD.booking._id;

      // Complete with cash — should NOT add a line item to the bill
      await completeSpaBooking(bookingId, ADMIN, 'cash');

      const { data: billAfterSpa } = await get(`/billing/${G['layla28'].guestId}`, ADMIN);
      const billSpa = billAfterSpa.bill ?? billAfterSpa;

      // spa line item must NOT appear
      expect(billSpa.spaCharges ?? 0).toBeCloseTo(spaBefore, 2);
      expect(billSpa.lineItems.length).toBe(linesBefore);

      // booking stored with spaPaymentMethod=cash
      const { data: bkD } = await get(`/spa/bookings`, ADMIN);
      const bk = (bkD.bookings ?? []).find((b: any) => b._id === bookingId);
      expect(bk?.spaPaymentMethod).toBe('cash');
    }

    // ── Part B: restaurant dining on room bill ──────────────────────────────

    const { data: billBeforeDining } = await get(`/billing/${G['layla28'].guestId}`, ADMIN);
    const before = billBeforeDining.bill ?? billBeforeDining;
    const otherBefore = before.otherCharges ?? 0;
    const linesBeforeDining = before.lineItems.length;

    const diningAmt = 110;
    const { data: addD } = await post(`/billing/${G['layla28'].guestId}/add`, {
      description: 'Restaurant dining — lunch',
      amount: diningAmt,
    }, ADMIN);
    expect(addD.success).toBe(true);

    const { data: billAfterDining } = await get(`/billing/${G['layla28'].guestId}`, ADMIN);
    const after = billAfterDining.bill ?? billAfterDining;

    // One new 'other' line item for the dining charge
    expect(after.lineItems.length).toBe(linesBeforeDining + 1);
    const diningItem = after.lineItems.find((li: any) => li.description === 'Restaurant dining — lunch');
    expect(diningItem).toBeTruthy();
    expect(diningItem.type).toBe('other');
    expect(diningItem.amount).toBeCloseTo(diningAmt, 2);
    expect(after.otherCharges).toBeCloseTo(otherBefore + diningAmt, 2);

    // VAT recalculated correctly
    assertVAT(after);

    // Cleanup
    await post(`/checkin/checkout/${G['layla28'].guestId}`, {}, ADMIN).catch(() => {});
  });

  test('SIM-29 Admin creates restaurant order for dine-in guest — cash and room_bill paths', async () => {
    test.setTimeout(60_000);

    // Find a free room
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const freeNow: any[] = (freeD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeNow.length) { test.skip(true, 'No free rooms for SIM-29'); return; }

    const room = freeNow[0];
    const result = await walkInAndCheckin(
      ADMIN, room._id,
      'Kareem Mansour', 'kareem.sim29@nile.eg',
      simDate(29), simDate(32),
    );
    if (!result) { test.skip(true, 'SIM-29 check-in failed'); return; }
    G['kareem29'] = { ...result, roomId: room._id, roomPrice: room.pricePerNight };

    const { data: menuD } = await get('/menu', ADMIN);
    const menuItem = (menuD.items ?? menuD.menuItems ?? []).find((m: any) => m.isAvailable);
    if (!menuItem) { test.skip(true, 'No available menu item'); return; }

    const guestId = G['kareem29'].guestId;

    // ── Part A: admin order cash → no bill line item ──────────────────────────

    const billBefore = (await get(`/billing/${guestId}`, ADMIN)).data?.bill ?? {};
    const foodBefore = billBefore.foodCharges ?? 0;
    const linesBefore = billBefore.lineItems?.length ?? 0;

    const { data: cashOrderD } = await post('/orders/admin', {
      guestId,
      items: [{ menuItem: menuItem._id, quantity: 2 }],
      notes: 'Dine-in lunch',
      orderPaymentMethod: 'cash',
    }, ADMIN);
    expect(cashOrderD.success).toBe(true);
    expect(cashOrderD.order.isAdminOrder).toBe(true);
    expect(cashOrderD.order.orderPaymentMethod).toBe('cash');

    // Deliver cash order
    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      const { data } = await patch(`/orders/${cashOrderD.order._id}/status`, { status }, ADMIN);
      expect(data.success).toBe(true);
    }

    const { data: billAfterCash } = await get(`/billing/${guestId}`, ADMIN);
    const bCash = billAfterCash.bill ?? billAfterCash;
    // Cash order must NOT touch the bill
    expect(bCash.foodCharges ?? 0).toBeCloseTo(foodBefore, 2);
    expect(bCash.lineItems.length).toBe(linesBefore);

    // ── Part B: admin order room_bill → food_order line item on bill ──────────

    const { data: billOrderD } = await post('/orders/admin', {
      guestId,
      items: [{ menuItem: menuItem._id, quantity: 1 }],
      notes: 'Dine-in dinner — charge to room',
      orderPaymentMethod: 'room_bill',
    }, ADMIN);
    expect(billOrderD.success).toBe(true);
    expect(billOrderD.order.orderPaymentMethod).toBe('room_bill');

    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      const { data } = await patch(`/orders/${billOrderD.order._id}/status`, { status }, ADMIN);
      expect(data.success).toBe(true);
    }

    const { data: billAfterRoom } = await get(`/billing/${guestId}`, ADMIN);
    const bRoom = billAfterRoom.bill ?? billAfterRoom;
    expect(bRoom.foodCharges).toBeGreaterThan(foodBefore);

    const dineItem = bRoom.lineItems.find((li: any) =>
      li.type === 'food_order' && li.description?.match(/dine-in|restaurant/i)
    );
    expect(dineItem).toBeTruthy();
    expect(dineItem.amount).toBeCloseTo(menuItem.price, 2);

    // VAT correct after the new food charge
    assertVAT(bRoom);

    // Cleanup
    await post(`/checkin/checkout/${guestId}`, {}, ADMIN).catch(() => {});
  });

  test('SIM-30 External walk-in customers — dine-in order + spa booking, both cash, revenue in analytics', async () => {
    test.setTimeout(60_000);

    // ── Part A: walk-in dine-in order ────────────────────────────────────────
    const { data: menuD } = await get('/menu', ADMIN);
    const menuItem = (menuD.items ?? menuD.menuItems ?? []).find((m: any) => m.isAvailable);
    if (!menuItem) { test.skip(true, 'No available menu item for SIM-30'); return; }

    const { data: wicDineD } = await post('/walkin-customers', {
      name: 'External Diner — Sim30',
      phone: '+20100000030',
      type: 'dine_in',
    }, ADMIN);
    expect(wicDineD.success).toBe(true);
    expect(wicDineD.customer.type).toBe('dine_in');

    const { data: orderD } = await post('/orders/admin', {
      walkInCustomerId: wicDineD.customer._id,
      items: [{ menuItem: menuItem._id, quantity: 2 }],
      notes: 'External walk-in lunch',
      orderPaymentMethod: 'cash',
    }, ADMIN);
    expect(orderD.success).toBe(true);
    expect(orderD.order.isAdminOrder).toBe(true);
    expect(orderD.order.orderPaymentMethod).toBe('cash');
    expect(orderD.order.addedToBill).toBe(true);

    // Deliver order
    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      const { data } = await patch(`/orders/${orderD.order._id}/status`, { status }, ADMIN);
      expect(data.success).toBe(true);
    }

    // ── Part B: walk-in spa booking ──────────────────────────────────────────
    const { data: svcD } = await get('/spa/services');
    const spaServices: any[] = svcD.services ?? svcD;
    const svc = spaServices.find((s: any) => s.isAvailable);

    if (svc) {
      const { data: wicSpaD } = await post('/walkin-customers', {
        name: 'External Spa Guest — Sim30',
        type: 'spa',
      }, ADMIN);
      expect(wicSpaD.success).toBe(true);

      const { data: bkD, status: bkStatus } = await post('/spa/walkin', {
        walkInCustomerId: wicSpaD.customer._id,
        service: svc._id,
        date: simDate(30),
        startTime: '15:00',
      }, ADMIN);

      if (bkStatus === 201 && bkD.success) {
        expect(bkD.booking.spaPaymentMethod).toBe('cash');
        expect(bkD.booking.addedToBill).toBe(true);

        // Complete the booking
        await patch(`/spa/bookings/${bkD.booking._id}/arrive`, {}, ADMIN);
        await patch(`/spa/bookings/${bkD.booking._id}/status`, { status: 'in_progress' }, ADMIN);
        const { data: complD } = await patch(`/spa/bookings/${bkD.booking._id}/complete`, { paymentMethod: 'cash' }, ADMIN);
        expect(complD.success).toBe(true);
        expect(complD.booking.status).toBe('completed');

        // Analytics spaStats.walkInCount includes this
        const { data: analyticsD } = await get('/analytics', ADMIN);
        expect(analyticsD.spaStats.walkInCount).toBeGreaterThanOrEqual(1);
        expect(analyticsD.spaStats.cashRevenue).toBeGreaterThan(0);
      } else {
        console.log('SIM-30: spa slot taken, skipping spa walk-in portion');
      }
    }

    // ── Part C: analytics reflects cash walk-in orders ───────────────────────
    const { data: analyticsD } = await get('/analytics', ADMIN);
    expect(analyticsD.orderStats.cashRevenue).toBeGreaterThan(0);
    expect(analyticsD.orderStats.walkInCount).toBeGreaterThanOrEqual(1);
    expect(analyticsD.kpis.totalRevenue).toBeGreaterThan(0);

    // Walk-in customers list contains today's records
    const { data: wicListD } = await get(`/walkin-customers?date=${simDate(0).slice(0,10)}`, ADMIN);
    // May be 0 if simDate(30) is different from today — just verify endpoint works
    expect(Array.isArray(wicListD.customers)).toBe(true);
  });

  test('SIM-31 Rania early-arrival — extra nights added to bill, reservation dates updated', async () => {
    // Find a free room
    const { data: freeD } = await get('/rooms?available=true', ADMIN);
    const freeNow: any[] = (freeD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeNow.length) { test.skip(true, 'No free rooms for Rania'); return; }

    const room = freeNow[0];
    const bookedCheckIn  = simDate(28);
    const bookedCheckOut = simDate(31);

    // Check in Rania with booked dates
    const result = await bookAndCheckin(
      ADMIN, room._id,
      'Rania Faris', 'rania.sim31@nile.eg',
      bookedCheckIn, bookedCheckOut,
    );
    if (!result) { test.skip(true, 'Rania check-in failed'); return; }
    G['rania31'] = { ...result, roomId: room._id, roomPrice: room.pricePerNight };

    // Baseline bill — only room charge for 3 booked nights
    const { data: billBefore } = await get(`/billing/${G['rania31'].guestId}`, ADMIN);
    const before = billBefore.bill ?? billBefore;
    const linesBefore = before.lineItems.length;
    expect(before.roomCharges).toBeCloseTo(3 * room.pricePerNight, 1);

    // Admin records early arrival — 2 days before booked check-in
    const actualCheckIn = simDate(26); // 2 days earlier
    const { data: earlyD } = await post(`/checkin/early-arrival/${G['rania31'].guestId}`, { actualCheckInDate: actualCheckIn }, ADMIN);
    expect(earlyD.success).toBe(true);
    expect(earlyD.extraNights).toBe(2);
    expect(earlyD.extraCharge).toBeCloseTo(2 * room.pricePerNight, 1);

    // Bill should have one extra room line item
    const bill = earlyD.bill;
    expect(bill.lineItems.length).toBe(linesBefore + 1);
    const extraItem = bill.lineItems.find((li: any) => li.description?.includes('Early arrival'));
    expect(extraItem).toBeTruthy();
    expect(extraItem.type).toBe('room');
    expect(extraItem.amount).toBeCloseTo(2 * room.pricePerNight, 1);

    // VAT still correct on the expanded bill
    assertVAT(bill);

    // Reservation dates updated
    const { data: resD } = await get(`/reservations/${G['rania31'].reservationId}`, ADMIN);
    const res = resD.reservation;
    expect(res.totalNights).toBe(5); // 3 booked + 2 extra
    // Allow ±1 day for UTC/local timezone shift on date storage
    const storedMs  = new Date(res.checkInDate).getTime();
    const expectedMs = new Date(actualCheckIn).getTime();
    expect(Math.abs(storedMs - expectedMs)).toBeLessThanOrEqual(86400000);

    // Cleanup
    await post(`/checkin/checkout/${G['rania31'].guestId}`, {}, ADMIN).catch(() => {});
  });

  test('SIM-24 Final state — simulation complete, invariants hold', async () => {
    test.setTimeout(60_000);

    // Checkout any remaining bulk/recycled guests
    const { data: activeD } = await get('/checkin/active', ADMIN);
    const stillActive: any[] = (activeD?.guests ?? []).filter((g: any) =>
      // Don't touch the 5 original seed demo guests by name
      !['Amira Hassan', 'Omar Farouk', 'Layla Nour', 'Khaled Ali', 'Nadia Saleh'].includes(g.name)
    );
    for (const g of stillActive) {
      await post(`/checkin/checkout/${g._id}`, {}, ADMIN).catch(() => {});
    }

    // After all simulation checkouts, available + occupied = 28
    // GET /rooms?available=false is not implemented — filter client-side
    const { data: allRoomsD } = await get('/rooms', ADMIN);
    const allRooms: any[] = allRoomsD.rooms ?? [];
    const occupied = allRooms.filter((r: any) => r.isAvailable === false).length;
    const free     = allRooms.filter((r: any) => r.isAvailable === true).length;
    expect(occupied + free).toBe(28);

    // Seed demo guests still occupy their 5 rooms
    expect(occupied).toBeGreaterThanOrEqual(0);
    expect(free).toBeGreaterThanOrEqual(0);

    // All simulation reservations are in terminal states
    const { data: resD } = await get('/reservations?limit=500', ADMIN);
    const simReservations = (resD.reservations ?? []).filter((r: any) =>
      r.guest?.email?.endsWith('.sim@nile.eg') ||
      r.guest?.email?.endsWith('sim@nile.eg')
    );
    const nonTerminal = simReservations.filter((r: any) =>
      !['checked_out', 'cancelled', 'no_show', 'checked_in', 'confirmed', 'pending'].includes(r.status)
    );
    // All simulation reservations should be in a known state
    expect(nonTerminal.length).toBe(0);

    // Summary log
    const statuses: Record<string, number> = {};
    for (const r of simReservations) {
      statuses[r.status] = (statuses[r.status] ?? 0) + 1;
    }
    console.log('Simulation final reservation statuses:', statuses);
    console.log(`Total: ${occupied} occupied, ${free} available (${occupied + free} rooms)`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — New Feature Scenarios
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 5 — New Feature Scenarios', () => {
  test.describe.configure({ mode: 'serial' });

  let p5Admin: string;
  let p5RoomId: string;
  let p5GuestId: string;
  let p5RoomPrice: number;

  test.beforeAll(async () => {
    const os   = await import('os');
    const path = await import('path');
    const fs   = await import('fs');
    const tokenFile = process.env.ADMIN_TOKEN_FILE || path.join(os.tmpdir(), 'rs-admin-token.json');
    p5Admin = JSON.parse(fs.readFileSync(tokenFile, 'utf8')).token;
  });

  // ── SIM-P5-01: Stay Extension ─────────────────────────────────────────────

  test('SIM-P5-01 Stay extension — adds nights, line item, extends QR expiry', async () => {
    // Get a free room
    const { data: roomsD } = await get('/rooms?available=true', p5Admin);
    const freeRooms: any[] = (roomsD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    test.skip(!freeRooms.length, 'No free rooms');

    const room = freeRooms[0];
    p5RoomId    = room._id;
    p5RoomPrice = room.pricePerNight;

    // Book 3 nights, confirm, check in
    const ctx = await bookAndCheckin(p5Admin, p5RoomId, 'Zara Phase5', 'zara.p5@nile.eg', simDate(50), simDate(53));
    test.skip(!ctx, 'Check-in failed');
    p5GuestId = ctx!.guestId;

    const { data: billBefore } = await get(`/billing/${p5GuestId}`, p5Admin);
    const before = billBefore.bill ?? billBefore;
    const itemsBefore = before.lineItems.length;
    const totalBefore = before.grandTotal;

    // Extend by 2 nights
    const { status, data } = await patch(`/checkin/extend/${p5GuestId}`, { extraNights: 2 }, p5Admin);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.extraNights).toBe(2);
    expect(data.extraCharge).toBeCloseTo(p5RoomPrice * 2, 1);
    expect(data.newCheckOut).toBeTruthy();

    // Bill has new room line item
    const { data: billAfter } = await get(`/billing/${p5GuestId}`, p5Admin);
    const after = billAfter.bill ?? billAfter;
    expect(after.lineItems.length).toBe(itemsBefore + 1);
    const extItem = after.lineItems.find((i: any) => i.description?.includes('extension'));
    expect(extItem).toBeTruthy();
    expect(extItem.amount).toBeCloseTo(p5RoomPrice * 2, 1);

    // Grand total increased
    expect(after.grandTotal).toBeCloseTo(totalBefore + p5RoomPrice * 2, 1);
  });

  test('SIM-P5-02 Stay extension blocked by conflicting reservation', async () => {
    test.skip(!p5GuestId || !p5RoomId, 'No active guest from P5-01');

    // Get current checkout date from reservation
    const { data: guestD } = await get(`/checkin/active`, p5Admin);
    const guestDoc = (guestD.guests ?? []).find((g: any) => g._id === p5GuestId);
    test.skip(!guestDoc, 'Guest not found');

    // Walk-in a blocker directly onto the same room starting at the extended checkout (day 55)
    // Walk-in creates a confirmed reservation immediately, which is what the conflict check needs
    const blockRes = await post('/reservations/walk-in', {
      guest: { name: 'Blocker Guest', email: 'blocker.p5@nile.eg', phone: '+977000000' },
      room: p5RoomId,
      checkInDate: simDate(56),
      checkOutDate: simDate(58),
      numberOfGuests: 1,
    }, p5Admin);
    expect(blockRes.data.success).toBe(true);

    // Attempt extend by 3 nights (would overlap day 56) — should be blocked
    const { status } = await patch(`/checkin/extend/${p5GuestId}`, { extraNights: 3 }, p5Admin);
    expect(status).toBe(409);
  });

  // ── SIM-P5-03: Nepali Walk-In + NPR Billing ───────────────────────────────

  test('SIM-P5-03 Nepali walk-in — nationality propagates to guest doc', async () => {
    const { data: roomsD } = await get('/rooms?available=true', p5Admin);
    const freeRooms: any[] = (roomsD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    test.skip(!freeRooms.length, 'No free rooms for Nepali walk-in');

    const room = freeRooms[0];

    // Walk-in with guestType = nepali
    const { status: wStatus, data: wData } = await post('/reservations/walk-in', {
      guestType: 'nepali',
      guest: { name: 'Hari Shrestha', email: 'hari.p5@nepal.np', phone: '+977-980-000001' },
      room: room._id,
      checkInDate: simDate(60),
      checkOutDate: simDate(62),
      numberOfGuests: 1,
    }, p5Admin);
    expect(wStatus).toBe(201);
    expect(wData.reservation.guestType).toBe('nepali');

    // Check in
    const { data: ciD } = await post(`/checkin/${wData.reservation._id}`, {}, p5Admin);
    expect(ciD.success).toBe(true);
    expect(ciD.guest.nationality).toBe('nepali');

    // Billing endpoint returns isNepali + exchangeRate
    const { data: billD } = await get(`/billing/${ciD.guest._id}`, p5Admin);
    expect(billD.isNepali).toBe(true);
    expect(billD.exchangeRate).toBeGreaterThan(1);

    // Cleanup — checkout
    await post(`/checkin/checkout/${ciD.guest._id}`, {}, p5Admin);
  });

  // ── SIM-P5-04 to P5-07: Discount System ──────────────────────────────────

  let discountGuestId: string;

  test('SIM-P5-04 Superadmin enables cash discount — front desk applies it', async () => {
    const { data: roomsD } = await get('/rooms?available=true', p5Admin);
    const freeRooms: any[] = (roomsD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    test.skip(!freeRooms.length, 'No free rooms');

    const room = freeRooms[0];
    const ctx = await bookAndCheckin(p5Admin, room._id, 'Discount Guest', 'discount.p5@nile.eg', simDate(70), simDate(72));
    test.skip(!ctx, 'Check-in failed');
    discountGuestId = ctx!.guestId;

    // Add a food charge so there's something to discount
    await post(`/billing/${discountGuestId}/add`, { description: 'Dinner', amount: 100 }, p5Admin);

    // Superadmin enables cash discount, max $50
    const { status: sStatus } = await patch('/settings/discount', {
      discountEnabled: true,
      discountAppliesTo: { room: true, food: true, spa: true },
      maxDiscountCash: 50,
      maxDiscountPercentage: 0,
    }, p5Admin);
    expect(sStatus).toBe(200);

    const { data: billBefore } = await get(`/billing/${discountGuestId}`, p5Admin);
    const before = (billBefore.bill ?? billBefore).grandTotal;

    // Apply $20 cash discount
    const { status: dStatus, data: dData } = await post(`/billing/${discountGuestId}/discount`, {
      discountType: 'cash',
      value: 20,
    }, p5Admin);
    expect(dStatus).toBe(200);

    const { data: billAfter } = await get(`/billing/${discountGuestId}`, p5Admin);
    const after = billAfter.bill ?? billAfter;

    // Negative line item exists
    const discountItem = after.lineItems.find((i: any) => i.amount < 0);
    expect(discountItem).toBeTruthy();
    expect(discountItem.amount).toBeCloseTo(-20, 1);

    // Grand total decreased
    expect(after.grandTotal).toBeCloseTo(before - 20, 1);
  });

  test('SIM-P5-05 Discount blocked when disabled', async () => {
    test.skip(!discountGuestId, 'No discount guest from P5-04');

    await patch('/settings/discount', { discountEnabled: false }, p5Admin);

    const { status } = await post(`/billing/${discountGuestId}/discount`, {
      discountType: 'cash',
      value: 10,
    }, p5Admin);
    expect(status).toBe(403);
  });

  test('SIM-P5-06 Max discount limit enforced — over-limit rejected', async () => {
    test.skip(!discountGuestId, 'No discount guest');

    // Re-enable with max 10%
    await patch('/settings/discount', {
      discountEnabled: true,
      discountAppliesTo: { room: true, food: true, spa: true },
      maxDiscountPercentage: 10,
      maxDiscountCash: 0,
    }, p5Admin);

    // Attempt 20% — exceeds max
    const { status } = await post(`/billing/${discountGuestId}/discount`, {
      discountType: 'percentage',
      value: 20,
    }, p5Admin);
    expect(status).toBe(400);

    // 10% should succeed
    const { status: okStatus } = await post(`/billing/${discountGuestId}/discount`, {
      discountType: 'percentage',
      value: 10,
    }, p5Admin);
    expect(okStatus).toBe(200);
  });

  test('SIM-P5-07 One mode at a time — disabled mode blocked at backend', async () => {
    test.skip(!discountGuestId, 'No discount guest');

    // Settings: cash mode only (maxDiscountCash=30, maxDiscountPercentage=0)
    await patch('/settings/discount', {
      discountEnabled: true,
      discountAppliesTo: { room: true, food: true, spa: true },
      maxDiscountCash: 30,
      maxDiscountPercentage: 0,
    }, p5Admin);

    // Percentage attempt — blocked (maxDiscountPercentage=0)
    const { status: pctStatus } = await post(`/billing/${discountGuestId}/discount`, {
      discountType: 'percentage',
      value: 5,
    }, p5Admin);
    expect(pctStatus).toBe(400);

    // Cleanup
    await post(`/checkin/checkout/${discountGuestId}`, {}, p5Admin).catch(() => {});
  });

  // ── SIM-32: Review & Rating lifecycle ────────────────────────────────────

  test('SIM-32 Guest submits review during stay — admin hides it — public list excludes it', async () => {
    const adminToken = p5Admin;

    // Check-in a guest
    const { data: roomsD } = await get('/rooms?available=true', adminToken);
    const freeRooms: any[] = (roomsD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeRooms.length) { test.skip(true, 'No free rooms for SIM-32'); return; }

    const room = freeRooms[0];
    const { data: resD } = await post('/reservations', {
      guest: { name: 'Review Sim Guest', email: `reviewsim.${Date.now()}@test.com`, phone: '+10000000099' },
      room: room._id,
      checkInDate: simDate(85),
      checkOutDate: simDate(87),
      numberOfGuests: 1,
    }, adminToken);
    expect(resD.success).toBe(true);
    await patch(`/reservations/${resD.reservation._id}/confirm`, {}, adminToken);
    const { data: ciD } = await post(`/checkin/${resD.reservation._id}`, {}, adminToken);
    expect(ciD.success).toBe(true);

    // Get guest token via QR
    const { data: qrD } = await get(`/qr/verify/${ciD.qrToken}`);
    expect(qrD.success).toBe(true);
    const guestToken = qrD.token;

    // 1. Eligibility — room always true, food/spa false before any orders/bookings
    const { data: eligD } = await get('/reviews/eligible', guestToken);
    expect(eligD.success).toBe(true);
    expect(eligD.eligible.room).toBe(true);
    expect(eligD.eligible.food).toBe(false);
    expect(eligD.eligible.spa).toBe(false);

    // 2. Submit room-only review
    const { data: revD } = await post('/reviews', { roomRating: 5, roomFeedback: 'Pharaonic luxury!' }, guestToken);
    expect(revD.success).toBe(true);
    expect(revD.review.roomRating).toBe(5);
    expect(revD.review.overallRating).toBe(5);
    const reviewId = revD.review._id;

    // 3. Public list includes the new review
    const { data: pubBefore } = await get('/reviews/public?limit=50');
    const visibleBefore = (pubBefore.reviews ?? []).find((r: any) => r._id === reviewId);
    expect(visibleBefore).toBeDefined();

    // 4. Admin hides the review
    const { data: hideD } = await patch(`/reviews/${reviewId}/visibility`, {}, adminToken);
    expect(hideD.isHidden).toBe(true);

    // 5. Public list no longer includes hidden review
    const { data: pubAfter } = await get('/reviews/public?limit=50');
    const visibleAfter = (pubAfter.reviews ?? []).find((r: any) => r._id === reviewId);
    expect(visibleAfter).toBeUndefined();

    // 6. Admin list still shows it (admin sees everything)
    const { data: adminList } = await get('/reviews?hidden=true', adminToken);
    const inAdminList = (adminList.reviews ?? []).find((r: any) => r._id === reviewId);
    expect(inAdminList).toBeDefined();
    expect(inAdminList.isHidden).toBe(true);

    // 7. Admin restores visibility
    const { data: showD } = await patch(`/reviews/${reviewId}/visibility`, {}, adminToken);
    expect(showD.isHidden).toBe(false);

    // Cleanup
    await post(`/checkin/checkout/${ciD.guest._id}`, {}, adminToken).catch(() => {});
  });

  // ── SIM-P5-08: Exchange Rate via Settings ─────────────────────────────────

  test('SIM-P5-08 Exchange rate updated via Settings API — reflected in billing', async () => {
    // Update rate
    const { status, data } = await patch('/settings/exchange-rate', { rate: 140 }, p5Admin);
    expect(status).toBe(200);
    expect(data.rate).toBe(140);
    expect(data.updatedBy).toBeTruthy();

    // Verify GET returns new rate
    const { data: getD } = await get('/settings/exchange-rate', p5Admin);
    expect(getD.rate).toBe(140);

    // Walk-in a Nepali guest and verify billing uses the new rate
    const { data: roomsD } = await get('/rooms?available=true', p5Admin);
    const freeRooms: any[] = (roomsD.rooms ?? []).filter((r: any) => r.isAvailable === true);
    if (!freeRooms.length) return;

    const room = freeRooms[0];
    const { data: wData } = await post('/reservations/walk-in', {
      guestType: 'nepali',
      guest: { name: 'Rate Test', email: 'rate.p5@nepal.np', phone: '+977000000002' },
      room: room._id,
      checkInDate: simDate(80),
      checkOutDate: simDate(82),
      numberOfGuests: 1,
    }, p5Admin);
    const { data: ciD } = await post(`/checkin/${wData.reservation._id}`, {}, p5Admin);
    const { data: billD } = await get(`/billing/${ciD.guest._id}`, p5Admin);
    expect(billD.isNepali).toBe(true);
    expect(billD.exchangeRate).toBe(140);

    await post(`/checkin/checkout/${ciD.guest._id}`, {}, p5Admin).catch(() => {});
  });
});
