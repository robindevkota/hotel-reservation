# Royal Suites — E2E Test Tracker

> Run all tests: `cd apps/web && npx playwright test`
> Run one file:  `npx playwright test tests/e2e/auth/login.spec.ts`
> View report:   `npx playwright show-report`

---

## Status Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Written & passing |
| ⚠️ | Written, needs verification |
| ❌ | Not yet written |

---

## Auth
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/auth/login.spec.ts` | Render page, empty validation, valid login, invalid credentials, link to register, password toggle | ✅ |
| `e2e/auth/register.spec.ts` | Register staff / kitchen / waiter roles with invite code | ✅ |
| `e2e/auth/profile.spec.ts` | Render profile, change password form, mismatched passwords, wrong current password, visibility toggle, strength bar, sidebar link | ✅ |

---

## Reservations
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/reservation/booking-wizard.spec.ts` | 3-step wizard render, full flow, no room error, cost calculation, back navigation, past-date prevention, loading state, return home after confirm | ✅ |
| `e2e/reservation/availability-check.spec.ts` | Date min attribute, room availability API | ⚠️ |
| `e2e/reservation/cancellation.spec.ts` | Cancel reservation flow | ⚠️ |

---

## Orders
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/orders/place-order.spec.ts` | Guest browses menu via QR, selects items, places order | ⚠️ Requires active checked-in guest |
| `e2e/orders/order-status-realtime.spec.ts` | Real-time order status updates via Socket.io | ⚠️ Requires active checked-in guest |
| `e2e/orders/order-cancellation.spec.ts` | Guest cancels pending order | ⚠️ Requires active checked-in guest |

---

## QR Flow
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/qr/qr-scan-flow.spec.ts` | QR token → guest dashboard redirect | ⚠️ Requires seeded data |
| `e2e/qr/qr-invalid-token.spec.ts` | Invalid/expired token shows error | ⚠️ |
| `e2e/qr/qr-expiry.spec.ts` | Expired QR token handling | ⚠️ |

---

## Spa
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/spa/spa-booking.spec.ts` | Browse services, select service, booking modal | ⚠️ Requires active checked-in guest |
| `e2e/spa/slot-conflict.spec.ts` | Double-booking same slot prevention | ⚠️ Requires active checked-in guest |

---

## Billing
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/billing/billing-integration.spec.ts` | Full billing lifecycle via API | ⚠️ Requires checked-in guest |
| `e2e/billing/bill-accumulation.spec.ts` | Room + food + spa charges accumulate | ⚠️ Requires checked-in guest |
| `e2e/billing/checkout-receipt.spec.ts` | Checkout generates receipt | ⚠️ Requires checked-in guest |
| `e2e/billing/stripe-payment.spec.ts` | Stripe payment intent flow | ❌ Needs Stripe test keys in env |

---

## Admin Panels
| Test File | Scenarios | Status |
|-----------|-----------|--------|
| `e2e/admin/admin-panels.spec.ts` | Dashboard stats, reservations, guests, check-out, orders, rooms CRUD, QR regen, menu, spa confirm, billing view + charge | ✅ |

---

## What Still Needs Work
1. **Stripe payment test** — needs `STRIPE_SECRET_KEY` (test mode) in `.env.test`
2. **Guest QR flow tests** (orders, spa, billing) — depend on a checked-in guest existing at test time; consider a `beforeAll` seed fixture
3. **Slot conflict test** — needs two concurrent bookings; add a setup helper
4. **Real-time order tests** — Socket.io needs two browser contexts; complex setup pending

---

## Fixtures
| File | Contents |
|------|----------|
| `fixtures/users.ts` | ADMIN_USER, STAFF_USER, KITCHEN_USER, WAITER_USER, GUEST_INFO |
| `fixtures/rooms.ts` | Room data constants |
| `fixtures/menu.ts` | Menu item data constants |
| `helpers/auth.helper.ts` | loginAsStaff, loginAsAdmin, registerStaff, apiLoginAsAdmin, apiLoginAsStaff |
| `helpers/qr.helper.ts` | QR token helpers |
| `helpers/stripe.helper.ts` | Stripe test card helpers |
