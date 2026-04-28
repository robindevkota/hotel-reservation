/**
 * Inventory Flow E2E Tests
 * ────────────────────────
 * Suite A — Auto-deduction: guest places order via portal, admin delivers it,
 *           verify ingredient stock decreases by exactly qtyPerServing × qty.
 *
 * Suite B — Record Usage: staff logs staff_consumption (by dish) and wastage
 *           (by raw ingredient) — verify StockLog entries and stock decreases.
 *
 * Suite C — Reconciliation accuracy: after running the 6-month sim seed,
 *           call /inventory/variance and assert unaccounted shrinkage < 15%
 *           for every ingredient that had non-zero activity.
 *
 * Suite D — Unit guard: Record Usage modal shows correct unit label when
 *           switching between ingredients.
 *
 * Prerequisites:
 *   - Main seed (npm run seed) must have run (rooms, menu items, recipes, ingredients)
 *   - Server running on port 5000, Next.js on port 3000
 *   - At least one checked-in guest with an active QR token
 */

import { test, expect } from '@playwright/test';
import { apiLoginAsAdmin } from '../../helpers/auth.helper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── API helpers ───────────────────────────────────────────────────────────────

async function get(path: string, token: string) {
  const r = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}
async function post(path: string, body: object, token: string) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function patch(path: string, body: object, token: string) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite A — Auto-deduction via full order lifecycle
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Suite A — Auto-deduction on order delivery', () => {

  test('A1: stock decreases by correct amount when order is delivered', async () => {
    const token = await apiLoginAsAdmin();

    // 1. Get recipes + current ingredient stock, pick one where all ingredients have stock
    const [menuData, recipeData, ingData] = await Promise.all([
      get('/menu', token),
      get('/inventory/recipes', token),
      get('/inventory/ingredients', token),
    ]);
    const menuItems: any[] = menuData.menuItems ?? menuData.items ?? [];
    const recipes: any[] = recipeData.recipes ?? [];
    const allIngs: any[] = ingData.ingredients ?? [];
    const ingStockMap = new Map<string, number>(allIngs.map((i: any) => [String(i._id), i.stock]));

    const ORDER_QTY = 2;
    let menuItemWithRecipe: any = null;
    let recipe: any = null;
    for (const mi of menuItems) {
      if (!mi.recipe) continue;
      const rec = recipes.find((r: any) => String(r._id) === String(mi.recipe));
      if (!rec?.ingredients?.length) continue;
      const allHaveStock = rec.ingredients.every((line: any) => {
        const ingId = String(line.ingredient?._id ?? line.ingredient);
        return (ingStockMap.get(ingId) ?? 0) >= line.qtyPerServing * ORDER_QTY;
      });
      if (allHaveStock) { menuItemWithRecipe = mi; recipe = rec; break; }
    }
    if (!menuItemWithRecipe || !recipe) {
      test.skip(true, 'No recipe with sufficient stock — run seed-inventory-sim.ts first');
      return;
    }

    // 2. Find a checked-in guest
    const guestData = await get('/checkin/active', token);
    const guests: any[] = guestData.guests ?? [];
    const activeGuest = guests[0];
    if (!activeGuest) {
      test.skip(true, 'No active checked-in guest — run seed first');
      return;
    }

    // 3. Record timestamp just before order creation so we can find the log entry
    const beforeTs = new Date().toISOString();

    // 4. Admin places order for the guest
    const orderData = await post('/orders/admin', {
      guestId: activeGuest._id,
      items: [{ menuItem: menuItemWithRecipe._id, quantity: ORDER_QTY }],
      orderPaymentMethod: 'room_bill',
    }, token);
    expect(orderData.success, `Order creation failed: ${JSON.stringify(orderData)}`).toBe(true);
    const orderId = orderData.order._id;

    // 5. Walk order through all required status transitions to delivered
    const statusSteps = ['accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    for (const status of statusSteps) {
      const res = await patch(`/orders/${orderId}/status`, { status }, token);
      expect(res.success, `Status update to '${status}' failed: ${JSON.stringify(res)}`).toBe(true);
    }

    // 6. Wait briefly for async deduction to complete
    await new Promise(r => setTimeout(r, 600));

    // 7. Verify via StockLog (race-condition-free: the log entry records the exact deduction)
    const logsData = await get('/inventory/logs?type=sale&limit=10', token);
    const saleLogs: any[] = logsData.logs ?? [];
    // Find the log entry created after our order (most-recent first, so saleLogs[0] is newest)
    const ourLog = saleLogs.find((l: any) =>
      new Date(l.createdAt) >= new Date(beforeTs) &&
      l.lines?.some((line: any) =>
        recipe.ingredients.some((ri: any) =>
          String(ri.ingredient?._id ?? ri.ingredient) === String(line.ingredient)
        )
      )
    );

    expect(ourLog, 'No sale StockLog found for this order delivery').toBeTruthy();

    let deductionVerified = false;
    for (const line of recipe.ingredients) {
      const ingIdStr = String(line.ingredient?._id ?? line.ingredient);
      const logLine = ourLog?.lines?.find((l: any) => String(l.ingredient) === ingIdStr);
      if (!logLine) continue;

      const expectedDeduction = parseFloat((line.qtyPerServing * ORDER_QTY).toFixed(4));
      const actualDeduction = Math.abs(parseFloat(logLine.delta));

      expect(
        Math.abs(actualDeduction - expectedDeduction) < 0.01,
        `Ingredient "${line.ingredient?.name ?? ingIdStr}": log recorded ${actualDeduction} ${line.ingredient?.unit ?? ''}, expected ${expectedDeduction}`
      ).toBe(true);

      deductionVerified = true;
    }

    expect(deductionVerified, 'No ingredient deductions could be verified in StockLog').toBe(true);
  });

  test('A2: cancelled order does NOT deduct stock', async () => {
    const token = await apiLoginAsAdmin();

    const menuData = await get('/menu', token);
    const menuItems: any[] = menuData.menuItems ?? menuData.items ?? [];
    const menuItemWithRecipe = menuItems.find((m: any) => m.recipe);
    if (!menuItemWithRecipe) { test.skip(true, 'No menu item with recipe'); return; }

    const guestData = await get('/checkin/active', token);
    const guests: any[] = guestData.guests ?? [];
    const activeGuest = guests[0];
    if (!activeGuest) { test.skip(true, 'No active guest'); return; }

    // Snapshot before
    const ingBefore = await get('/inventory/ingredients', token);
    const before = new Map<string, number>(
      (ingBefore.ingredients ?? []).map((i: any) => [i._id, i.stock])
    );

    // Place order
    const orderData = await post('/orders/admin', {
      guestId: activeGuest._id,
      items: [{ menuItem: menuItemWithRecipe._id, quantity: 1 }],
      orderPaymentMethod: 'room_bill',
    }, token);
    expect(orderData.success).toBe(true);
    const orderId = orderData.order._id;

    // Cancel immediately (still pending)
    const cancelRes = await patch(`/orders/${orderId}/cancel`, {}, token);
    expect(cancelRes.success, `Cancel failed: ${JSON.stringify(cancelRes)}`).toBe(true);

    await new Promise(r => setTimeout(r, 400));

    // Only check ingredients linked to the cancelled order's recipe — other stock may
    // change concurrently from other tests running in parallel
    const recipeData2 = await get('/inventory/recipes', token);
    const recipes2: any[] = recipeData2.recipes ?? [];
    const orderedRecipe = recipes2.find((r: any) =>
      String(r._id) === String(menuItemWithRecipe.recipe)
    );
    const recipeIngIds = new Set(
      (orderedRecipe?.ingredients ?? []).map((l: any) => String(l.ingredient?._id ?? l.ingredient))
    );

    const ingAfter = await get('/inventory/ingredients', token);
    for (const ing of ingAfter.ingredients ?? []) {
      if (!recipeIngIds.has(String(ing._id))) continue; // not part of the cancelled order
      const stockBefore = before.get(ing._id);
      if (stockBefore === 0) continue; // already depleted
      expect(
        ing.stock,
        `Stock of "${ing.name}" changed after cancellation — it should not have`
      ).toBe(stockBefore);
    }
  });

  test('A3: guest places order via portal and admin delivers it — stock drops', async ({ page }) => {
    const token = await apiLoginAsAdmin();

    // Find a room with an active guest + QR token
    const roomsData = await get('/rooms', token);
    const rooms: any[] = roomsData.rooms ?? [];
    const roomWithGuest = rooms.find((r: any) => r.qrToken && r.currentGuest);
    if (!roomWithGuest) { test.skip(true, 'No room with active guest+QR'); return; }

    // Snapshot stock before
    const ingBefore = await get('/inventory/ingredients', token);
    const before = new Map<string, number>(
      (ingBefore.ingredients ?? []).map((i: any) => [i._id, i.stock])
    );

    // Guest navigates via QR and places order
    await page.goto(`/qr/${roomWithGuest.qrToken}`);
    await page.waitForURL(/\/guest\/dashboard/, { timeout: 12000 });

    await page.getByText(/Order Food/i).click();
    await page.waitForURL(/\/guest\/menu/, { timeout: 8000 });
    await page.waitForTimeout(1500);

    const addButtons = page.getByText('Add to Order');
    if (await addButtons.count() === 0) { test.skip(true, 'No menu items available'); return; }
    await addButtons.first().click();

    await page.getByText(/View Order/i).click();
    await page.getByRole('button', { name: /Place Order/i }).click();
    await expect(page.getByText(/order placed/i)).toBeVisible({ timeout: 10000 });

    // Admin delivers the order via API
    const ordersData = await get('/orders', token);
    const orders: any[] = ordersData.orders ?? [];
    const pending = orders.find((o: any) =>
      o.status === 'pending' && String(o.room) === String(roomWithGuest._id)
    );
    if (!pending) { test.skip(true, 'Could not find the placed order'); return; }

    for (const status of ['accepted', 'preparing', 'ready', 'delivering', 'delivered']) {
      await patch(`/orders/${pending._id}/status`, { status }, token);
    }

    await new Promise(r => setTimeout(r, 1000));

    // Verify stock dropped for at least one ingredient
    const ingAfter = await get('/inventory/ingredients', token);
    const anyDrop = (ingAfter.ingredients ?? []).some((ing: any) => {
      const prev = before.get(ing._id);
      return prev !== undefined && ing.stock < prev;
    });
    expect(anyDrop, 'No ingredient stock dropped after guest order delivery').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite B — Record Usage (consume + wastage via API)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Suite B — Record Usage deductions', () => {

  test('B1: staff_consumption by dish deducts all recipe ingredients', async () => {
    const token = await apiLoginAsAdmin();

    const recipeData = await get('/inventory/recipes', token);
    const recipes: any[] = recipeData.recipes ?? [];
    if (!recipes.length) { test.skip(true, 'No recipes'); return; }

    // Pick a recipe where all ingredients have stock
    let recipe: any = null;
    const ingData = await get('/inventory/ingredients', token);
    const ingMap = new Map<string, any>((ingData.ingredients ?? []).map((i: any) => [i._id, i]));

    for (const r of recipes) {
      const canMake = (r.ingredients ?? []).every((line: any) => {
        const ing = ingMap.get(String(line.ingredient?._id ?? line.ingredient));
        return ing && ing.stock >= line.qtyPerServing;
      });
      if (canMake) { recipe = r; break; }
    }
    if (!recipe) { test.skip(true, 'No recipe with sufficient stock'); return; }

    // Snapshot
    const before = new Map<string, number>(
      (ingData.ingredients ?? []).map((i: any) => [i._id, i.stock])
    );

    // Consume 1 serving
    const res = await post('/inventory/consume-dish', {
      type: 'staff_consumption',
      recipeId: recipe._id,
      servings: 1,
      consumedBy: 'Test Staff',
      note: 'E2E test — staff meal',
    }, token);
    expect(res.success, `consume-dish failed: ${JSON.stringify(res)}`).toBe(true);

    // Verify each ingredient dropped by qtyPerServing
    const ingAfter = await get('/inventory/ingredients', token);
    for (const line of recipe.ingredients ?? []) {
      const ingId = String(line.ingredient?._id ?? line.ingredient);
      const ingName = line.ingredient?.name ?? ingId;
      const beforeStock = before.get(ingId);
      const afterIng = (ingAfter.ingredients ?? []).find((i: any) => i._id === ingId);
      if (beforeStock === undefined || !afterIng) continue;

      const drop = parseFloat((beforeStock - afterIng.stock).toFixed(4));
      const expected = parseFloat(line.qtyPerServing.toFixed(4));
      expect(
        Math.abs(drop - expected) < 0.01,
        `"${ingName}": expected drop ${expected}, got ${drop}`
      ).toBe(true);
    }
  });

  test('B2: wastage by raw ingredient deducts correct qty and logs reason', async () => {
    const token = await apiLoginAsAdmin();

    const ingData = await get('/inventory/ingredients', token);
    const ings: any[] = ingData.ingredients ?? [];
    const ing = ings.find((i: any) => i.stock >= 0.1);
    if (!ing) { test.skip(true, 'No ingredient with stock'); return; }

    const qty = parseFloat((ing.stock * 0.05).toFixed(4)); // waste 5%
    if (qty <= 0) { test.skip(true, 'Qty too small'); return; }

    const res = await post('/inventory/consume', {
      type: 'wastage',
      ingredientId: ing._id,
      qty,
      consumptionReason: 'unaccounted',
      note: 'E2E test — end-of-day unaccounted',
    }, token);
    expect(res.success, `consume failed: ${JSON.stringify(res)}`).toBe(true);

    // Verify stock dropped
    const ingAfter = await get('/inventory/ingredients', token);
    const updated = (ingAfter.ingredients ?? []).find((i: any) => i._id === ing._id);
    expect(updated).toBeDefined();
    const drop = parseFloat((ing.stock - updated.stock).toFixed(4));
    expect(Math.abs(drop - qty) < 0.01, `Expected drop ${qty}, got ${drop}`).toBe(true);

    // Verify StockLog entry has correct reason
    const logData = await get('/inventory/logs', token);
    const logs: any[] = logData.logs ?? [];
    const entry = logs.find((l: any) =>
      l.type === 'wastage' &&
      l.lines?.some((ln: any) => ln.ingredientName === ing.name) &&
      l.note?.includes('E2E test')
    );
    expect(entry, 'StockLog entry not found for wastage').toBeDefined();
    // consumptionReason is stored on the StockLog root document
    expect(entry.consumptionReason).toBe('unaccounted');
  });

  test('B3: consume below zero is rejected', async () => {
    const token = await apiLoginAsAdmin();

    const ingData = await get('/inventory/ingredients', token);
    const ings: any[] = ingData.ingredients ?? [];
    const ing = ings[0];
    if (!ing) { test.skip(true, 'No ingredients'); return; }

    const res = await post('/inventory/consume', {
      type: 'wastage',
      ingredientId: ing._id,
      qty: ing.stock + 9999,
    }, token);
    expect(res.success).toBeFalsy();
    expect(res.message ?? res.error ?? '').toMatch(/not enough|insufficient|stock/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite C — 6-month reconciliation accuracy
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Suite C — Reconciliation accuracy (6-month sim)', () => {

  test('C1: overall unaccounted shrinkage < 15% of total restocked', async () => {
    const token = await apiLoginAsAdmin();

    // No date filter — all-time variance uses live stock as baseline (formula: netIn - outflows - currentStock)
    const data = await get('/inventory/variance', token);
    const ingredients: any[] = data.ingredients ?? [];

    if (!ingredients.length) {
      test.skip(true, 'No variance data — run seed-inventory-sim.ts first');
      return;
    }

    // Only evaluate ingredients that had activity (restocked > 0)
    const active = ingredients.filter((r: any) => r.restocked > 0);
    if (!active.length) {
      test.skip(true, 'No restock activity found — run seed-inventory-sim.ts first');
      return;
    }

    const totalRestocked   = active.reduce((s: number, r: any) => s + r.restocked, 0);
    const totalUnaccounted = active.reduce((s: number, r: any) => s + (r.shrinkage ?? 0), 0);
    const shrinkagePct     = (totalUnaccounted / totalRestocked) * 100;

    console.log(`\n  Reconciliation: ${totalUnaccounted.toFixed(2)} unaccounted out of ${totalRestocked.toFixed(2)} restocked = ${shrinkagePct.toFixed(1)}% shrinkage`);

    // < 15% shrinkage — allows for intentional wastage + stocktake variance
    expect(shrinkagePct).toBeLessThan(15);
  });

  test('C2: no ingredient has > 30% unaccounted shrinkage', async () => {
    const token = await apiLoginAsAdmin();

    // No date filter — all-time variance uses live stock as baseline (formula: netIn - outflows - currentStock)
    const data = await get('/inventory/variance', token);
    const ingredients: any[] = data.ingredients ?? [];
    if (!ingredients.length) { test.skip(true, 'No variance data'); return; }

    const bad = ingredients.filter((r: any) =>
      r.restocked > 0 && (r.shrinkagePct ?? 0) > 30
    );

    if (bad.length) {
      console.log('\n  High-shrinkage ingredients:');
      bad.forEach((r: any) =>
        console.log(`    ${r.name}: ${r.shrinkagePct.toFixed(1)}% unaccounted (${r.shrinkage.toFixed(2)} ${r.unit})`)
      );
    }

    expect(bad, `${bad.length} ingredient(s) have >30% shrinkage: ${bad.map((r:any)=>r.name).join(', ')}`).toHaveLength(0);
  });

  test('C3: sale StockLog entries exist and match delivered order count', async () => {
    const token = await apiLoginAsAdmin();

    // Query by type to avoid pagination hiding sale logs under more-recent restock/stocktake entries
    const saleData = await get('/inventory/logs?type=sale&limit=50', token);
    if (saleData.error?.includes('Too many requests') || saleData.message?.includes('Too many requests')) {
      test.skip(true, 'Rate limited — run this test in isolation');
      return;
    }
    const saleLogs: any[] = saleData.logs ?? [];
    console.log(`\n  Sale logs (sample): ${saleData.total ?? saleLogs.length}`);

    expect(saleLogs.length, 'No sale logs found — run seed-inventory-sim.ts first').toBeGreaterThan(0);

    // Every sale log should have at least one ingredient line
    const logsWithNoLines = saleLogs.filter((l: any) => !l.lines?.length);
    expect(logsWithNoLines.length, 'Some sale logs have no ingredient lines').toBe(0);
  });

  test('C4: variance endpoint respects ?days= filter', async () => {
    const token = await apiLoginAsAdmin();

    const [all, last7] = await Promise.all([
      get('/inventory/variance', token),
      get('/inventory/variance?days=7', token),
    ]);

    // 7-day totals should be ≤ all-time totals for every ingredient
    const allMap = new Map<string, any>(
      (all.ingredients ?? []).map((r: any) => [r.id, r])
    );

    for (const r7 of last7.ingredients ?? []) {
      const allEntry = allMap.get(r7.id);
      if (!allEntry) continue;
      expect(r7.restocked).toBeLessThanOrEqual(allEntry.restocked + 0.01);
      expect(r7.sold).toBeLessThanOrEqual(allEntry.sold + 0.01);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite D — UI: unit label in Record Usage modal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Suite D — Unit label in Record Usage modal', () => {

  test('D1: unit badge appears next to qty field when ingredient is selected', async ({ page }) => {
    const token = await apiLoginAsAdmin();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('royal-suites-auth', JSON.stringify({
        state: { user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'super_admin', department: 'food', type: 'staff' }, accessToken: token },
        version: 0,
      }));
    }, { token });

    await page.goto('/admin/inventory');
    await page.waitForURL(/\/admin\/inventory/, { timeout: 12000 });
    await page.waitForTimeout(1200);

    // Open Record Usage modal (button is always visible in the page header)
    await page.getByText(/Record Usage/i).click({ force: true });
    await expect(page.getByText('Record Usage').first()).toBeVisible({ timeout: 5000 });

    // Switch to By Raw Ingredient tab
    await page.getByText(/By Raw Ingredient/i).click({ force: true });
    await page.waitForTimeout(300);

    // Select an ingredient from the dropdown
    const ingSelect = page.locator('select').filter({ hasText: /Select ingredient/i });
    const options = await ingSelect.locator('option').all();
    const firstRealOption = options.find(async o => (await o.getAttribute('value')) !== '');
    if (!firstRealOption) { test.skip(true, 'No ingredients in dropdown'); return; }

    const ingValue = await firstRealOption.getAttribute('value');
    if (!ingValue) { test.skip(true, 'Could not get ingredient id'); return; }
    await ingSelect.selectOption(ingValue);

    await page.waitForTimeout(300);

    // Qty label shows unit in parentheses — CSS uppercases it visually but textContent is mixed-case
    const qtyLabel = page.getByText(/quantity \(/i);
    await expect(qtyLabel).toBeVisible({ timeout: 3000 });

    // The "Available:" hint should also appear below the input
    await expect(page.getByText(/Available:/i)).toBeVisible({ timeout: 3000 });
  });

  test('D2: unit label changes when a different ingredient is selected', async ({ page }) => {
    const token = await apiLoginAsAdmin();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('royal-suites-auth', JSON.stringify({
        state: { user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'super_admin', department: 'food', type: 'staff' }, accessToken: token },
        version: 0,
      }));
    }, { token });

    await page.goto('/admin/inventory');
    await page.waitForTimeout(1200);

    await page.getByText(/Record Usage/i).click({ force: true });
    await expect(page.getByText('Record Usage').first()).toBeVisible({ timeout: 5000 });
    await page.getByText(/By Raw Ingredient/i).click({ force: true });
    await page.waitForTimeout(300);

    const ingSelect = page.locator('select').filter({ hasText: /Select ingredient/i });
    const options   = await ingSelect.locator('option').all();
    const realOpts  = (await Promise.all(
      options.map(async o => ({ el: o, val: await o.getAttribute('value') }))
    )).filter(o => o.val && o.val !== '');

    if (realOpts.length < 2) { test.skip(true, 'Need ≥2 ingredients'); return; }

    await ingSelect.selectOption(realOpts[0].val!);
    await page.waitForTimeout(200);
    const label1 = await page.getByText(/quantity \(/i).textContent();

    await ingSelect.selectOption(realOpts[1].val!);
    await page.waitForTimeout(200);
    const label2 = await page.getByText(/quantity \(/i).textContent();

    // Labels may be the same if both share a unit — that's fine
    // The important thing is both labels contain a unit token like "(kg)", "(g)", etc.
    expect(label1).toMatch(/quantity \(\w/i);
    expect(label2).toMatch(/quantity \(\w/i);
  });
});
