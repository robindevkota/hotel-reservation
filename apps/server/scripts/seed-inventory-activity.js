/**
 * seed-inventory-activity.js
 *
 * Seeds realistic 30-day activity logs for the inventory analytics charts.
 * Run AFTER importing inventory-seed.xlsx so ingredients/recipes exist.
 *
 * Usage:
 *   node scripts/seed-inventory-activity.js
 *
 * What it creates (spread across last 30 days):
 *   - Restocks for key ingredients
 *   - Sales (sell endpoint) for bar + kitchen recipes
 *   - Staff drinks (staff_consumption)
 *   - Owner drinks (owner_consumption)
 *   - Wastage with reasons (spillage, breakage, expired)
 *   - Complimentary / free gifts
 *   - One stocktake (physical count)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ── helpers ──────────────────────────────────────────────────────────────────

async function login() {
  const r = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@royalsuites.com', password: 'RoyalAdmin@123' }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(`Login failed: ${JSON.stringify(d)}`);
  console.log('✅  Logged in as superadmin');
  return d.accessToken;
}

async function api(method, path, body, token) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── fetch current state ───────────────────────────────────────────────────────

async function getIngredients(token) {
  const d = await api('GET', '/inventory/ingredients', null, token);
  if (!d.ingredients?.length) throw new Error('No ingredients found. Import inventory-seed.xlsx first.');
  return d.ingredients;
}

async function getRecipes(token) {
  const d = await api('GET', '/inventory/recipes', null, token);
  if (!d.recipes?.length) throw new Error('No recipes found. Import inventory-seed.xlsx first.');
  return d.recipes;
}

// ── seed actions ──────────────────────────────────────────────────────────────

async function restock(token, ingredientId, qty, note) {
  const d = await api('POST', `/inventory/ingredients/${ingredientId}/restock`, { qty, note }, token);
  if (!d.success) console.warn(`  ⚠️  Restock failed: ${d.message}`);
  return d.success;
}

async function sell(token, recipeId, servings) {
  const d = await api('POST', '/inventory/sell', { recipeId, servings }, token);
  if (!d.success) console.warn(`  ⚠️  Sell failed: ${d.message}`);
  return d.success;
}

async function consume(token, type, ingredientId, qty, opts = {}) {
  const d = await api('POST', '/inventory/consume', { type, ingredientId, qty, ...opts }, token);
  if (!d.success) console.warn(`  ⚠️  Consume (${type}) failed: ${d.message}`);
  return d.success;
}

async function stocktake(token, lines) {
  const d = await api('POST', '/inventory/stocktake', { lines }, token);
  if (!d.success) console.warn(`  ⚠️  Stocktake failed: ${d.message}`);
  return d.success;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🍺  Inventory Activity Seeder');
  console.log('─'.repeat(40));

  const token = await login();
  const ingredients = await getIngredients(token);
  const recipes     = await getRecipes(token);

  // Index by name for easy lookup
  const ing = {};
  ingredients.forEach(i => { ing[i.name] = i; });
  const rec = {};
  recipes.forEach(r => { rec[r.name] = r; });

  console.log(`\n📦  Found ${ingredients.length} ingredients, ${recipes.length} recipes\n`);

  // ── 1. RESTOCKS — add stock so we have headroom for all activities ──────────
  console.log('📥  Restocking ingredients...');
  const restocks = [
    [ing['Whiskey (Black Label)']?._id, 3000, 'Monthly stock — 4 bottles Black Label'],
    [ing['Vodka (Smirnoff)']?._id,      2800, 'Monthly stock — 4 bottles Smirnoff'],
    [ing['Rum (Old Monk)']?._id,        2250, 'Monthly stock — 3 bottles Old Monk'],
    [ing['Beer (Everest)']?._id,        48,   'Case of 48 Everest beers'],
    [ing['Beer (Tuborg)']?._id,         24,   'Case of 24 Tuborg beers'],
    [ing['Tonic Water']?._id,           4000, '12 cans tonic water'],
    [ing['Cola (Coca-Cola)']?._id,      6000, '18 cans cola'],
    [ing['Lime Juice']?._id,            1000, 'Bulk lime juice'],
    [ing['Sugar Syrup']?._id,           800,  'Bulk sugar syrup'],
    [ing['Mint Leaves']?._id,           200,  'Fresh mint batch'],
    [ing['Chicken Keema']?._id,         10,   'Weekly kitchen stock — 10kg keema'],
    [ing['Momo Dough']?._id,            8,    'Weekly kitchen stock — 8kg dough'],
    [ing['Rice']?._id,                  15,   'Monthly rice — 15kg'],
    [ing['Dal (Lentils)']?._id,         8,    'Monthly dal — 8kg'],
    [ing['Egg']?._id,                   60,   '5 dozen eggs'],
    [ing['Bread Slice']?._id,           80,   '4 loaves'],
    [ing['Butter']?._id,                2000, '2kg butter'],
    [ing['Cooking Oil']?._id,           5,    '5 litres cooking oil'],
  ].filter(([id]) => id);

  for (const [id, qty, note] of restocks) {
    await restock(token, id, qty, note);
    await sleep(80);
  }
  console.log(`  ✅  ${restocks.length} restocks done\n`);

  // ── 2. SALES — simulate 30 days of bar + kitchen sales ─────────────────────
  console.log('💰  Logging sales...');
  const salesPlan = [
    // Bar — high volume
    { name: 'Whiskey Peg',   servings: 8 },
    { name: 'Whiskey Soda',  servings: 5 },
    { name: 'Vodka Lime',    servings: 6 },
    { name: 'Mojito',        servings: 7 },
    { name: 'Rum & Coke',    servings: 4 },
    { name: 'Everest Beer',  servings: 12 },
    { name: 'Tuborg Beer',   servings: 6 },
    // Kitchen
    { name: 'Chicken Momo',  servings: 5 },
    { name: 'Dal Bhat',      servings: 8 },
    { name: 'Egg Omelette',  servings: 6 },
    { name: 'Butter Toast',  servings: 10 },
    { name: 'Cheese Toast',  servings: 4 },
  ];

  let salesDone = 0;
  for (const { name, servings } of salesPlan) {
    if (!rec[name]) { console.warn(`  ⚠️  Recipe not found: ${name}`); continue; }
    // Split into multiple smaller sells to show activity over time in trend
    const batches = Math.min(servings, 3);
    const perBatch = Math.floor(servings / batches);
    for (let b = 0; b < batches; b++) {
      const qty = b === batches - 1 ? servings - perBatch * (batches - 1) : perBatch;
      if (qty > 0) {
        await sell(token, rec[name]._id, qty);
        await sleep(60);
        salesDone++;
      }
    }
  }
  console.log(`  ✅  ${salesDone} sell operations done\n`);

  // ── 3. STAFF CONSUMPTION ───────────────────────────────────────────────────
  console.log('👨‍🍳  Logging staff consumption...');
  const staffDrinks = [
    { id: ing['Whiskey (Black Label)']?._id, qty: 120, consumedBy: 'Ramesh (Bartender)',  note: 'End of shift drink' },
    { id: ing['Whiskey (Black Label)']?._id, qty: 60,  consumedBy: 'Sita (Waitress)',     note: 'Staff party' },
    { id: ing['Vodka (Smirnoff)']?._id,      qty: 90,  consumedBy: 'Bikash (Bartender)', note: 'Tasting new cocktail' },
    { id: ing['Beer (Everest)']?._id,        qty: 3,   consumedBy: 'Kitchen Staff',       note: 'After shift beers' },
    { id: ing['Beer (Tuborg)']?._id,         qty: 2,   consumedBy: 'Ramesh (Bartender)', note: 'Staff meal' },
    { id: ing['Rum (Old Monk)']?._id,        qty: 60,  consumedBy: 'Bikash (Bartender)', note: 'Bartender tasting' },
    { id: ing['Chicken Keema']?._id,         qty: 0.5, consumedBy: 'Kitchen Staff',       note: 'Staff meal — chicken momo' },
    { id: ing['Rice']?._id,                  qty: 0.3, consumedBy: 'Kitchen Staff',       note: 'Staff lunch dal bhat' },
    { id: ing['Dal (Lentils)']?._id,         qty: 0.2, consumedBy: 'Kitchen Staff',       note: 'Staff lunch dal bhat' },
    { id: ing['Egg']?._id,                   qty: 4,   consumedBy: 'Kitchen Staff',       note: 'Staff breakfast' },
  ].filter(d => d.id);

  for (const { id, qty, consumedBy, note } of staffDrinks) {
    await consume(token, 'staff_consumption', id, qty, { consumedBy, note });
    await sleep(70);
  }
  console.log(`  ✅  ${staffDrinks.length} staff consumption entries done\n`);

  // ── 4. OWNER CONSUMPTION ──────────────────────────────────────────────────
  console.log('👔  Logging owner consumption...');
  const ownerDrinks = [
    { id: ing['Whiskey (Black Label)']?._id, qty: 180, consumedBy: 'Owner',  note: 'Business meeting drinks' },
    { id: ing['Whiskey (Black Label)']?._id, qty: 120, consumedBy: 'Owner',  note: 'Personal evening drink' },
    { id: ing['Beer (Everest)']?._id,        qty: 4,   consumedBy: 'Owner',  note: 'Owner evening drinks' },
    { id: ing['Vodka (Smirnoff)']?._id,      qty: 60,  consumedBy: 'Owner',  note: 'Owner party at home' },
    { id: ing['Rum (Old Monk)']?._id,        qty: 90,  consumedBy: 'Owner',  note: 'Owner consumption' },
    { id: ing['Chicken Keema']?._id,         qty: 0.3, consumedBy: 'Owner',  note: 'Owner family dinner' },
  ].filter(d => d.id);

  for (const { id, qty, consumedBy, note } of ownerDrinks) {
    await consume(token, 'owner_consumption', id, qty, { consumedBy, note });
    await sleep(70);
  }
  console.log(`  ✅  ${ownerDrinks.length} owner consumption entries done\n`);

  // ── 5. WASTAGE ────────────────────────────────────────────────────────────
  console.log('🗑️   Logging wastage...');
  const wastageEntries = [
    { id: ing['Whiskey (Black Label)']?._id, qty: 90,  consumptionReason: 'spillage', note: 'Bottle knocked over at bar' },
    { id: ing['Vodka (Smirnoff)']?._id,      qty: 60,  consumptionReason: 'spillage', note: 'Spilled during cocktail prep' },
    { id: ing['Beer (Everest)']?._id,        qty: 2,   consumptionReason: 'breakage', note: 'Dropped 2 bottles' },
    { id: ing['Lime Juice']?._id,            qty: 50,  consumptionReason: 'expired',  note: 'Lime juice gone sour' },
    { id: ing['Mint Leaves']?._id,           qty: 30,  consumptionReason: 'expired',  note: 'Mint wilted — unusable' },
    { id: ing['Tomato']?._id,                qty: 0.3, consumptionReason: 'expired',  note: 'Tomatoes rotted' },
    { id: ing['Bread Slice']?._id,           qty: 6,   consumptionReason: 'expired',  note: 'Mouldy bread' },
    { id: ing['Egg']?._id,                   qty: 3,   consumptionReason: 'breakage', note: 'Dropped tray' },
    { id: ing['Rum (Old Monk)']?._id,        qty: 45,  consumptionReason: 'spillage', note: 'Bar spillage during busy night' },
    { id: ing['Cola (Coca-Cola)']?._id,      qty: 330, consumptionReason: 'other',    note: 'Flat cola — opened cans unused' },
  ].filter(d => d.id);

  for (const { id, qty, consumptionReason, note } of wastageEntries) {
    await consume(token, 'wastage', id, qty, { consumptionReason, note });
    await sleep(70);
  }
  console.log(`  ✅  ${wastageEntries.length} wastage entries done\n`);

  // ── 6. COMPLIMENTARY / FREE GIFTS ─────────────────────────────────────────
  console.log('🎁  Logging complimentary / free gifts...');
  const giftEntries = [
    { id: ing['Whiskey (Black Label)']?._id, qty: 60,  note: 'Welcome drink — VIP guest check-in' },
    { id: ing['Whiskey (Black Label)']?._id, qty: 120, note: 'Birthday celebration — complimentary round' },
    { id: ing['Beer (Everest)']?._id,        qty: 3,   note: 'Complimentary beers — long-stay guest' },
    { id: ing['Beer (Tuborg)']?._id,         qty: 2,   note: 'Welcome gift — honeymoon couple' },
    { id: ing['Vodka (Smirnoff)']?._id,      qty: 60,  note: 'Farewell drink — repeat guest' },
    { id: ing['Mojito']?._id,                qty: 30,  note: 'Poolside welcome cocktail — group booking' },
    { id: ing['Chicken Keema']?._id,         qty: 0.2, note: 'Complimentary momo — VIP arrival' },
    { id: ing['Rum (Old Monk)']?._id,        qty: 60,  note: 'Anniversary gift drink' },
  ].filter(d => d.id);

  for (const { id, qty, note } of giftEntries) {
    await consume(token, 'complimentary', id, qty, { note });
    await sleep(70);
  }
  console.log(`  ✅  ${giftEntries.length} complimentary entries done\n`);

  // ── 7. STOCKTAKE ──────────────────────────────────────────────────────────
  console.log('📋  Running end-of-month stocktake...');

  // Fetch fresh stock levels after all activity
  const freshIngredients = await getIngredients(token);
  const freshIng = {};
  freshIngredients.forEach(i => { freshIng[i.name] = i; });

  // Simulate physical count — bar items slightly off (over-pour reality)
  const stocktakeLines = [
    { ingredientId: freshIng['Whiskey (Black Label)']?._id, actualQty: Math.max(0, (freshIng['Whiskey (Black Label)']?.stock || 0) - 45) },  // -45ml unaccounted
    { ingredientId: freshIng['Vodka (Smirnoff)']?._id,      actualQty: Math.max(0, (freshIng['Vodka (Smirnoff)']?.stock || 0) - 30) },       // -30ml unaccounted
    { ingredientId: freshIng['Rum (Old Monk)']?._id,        actualQty: Math.max(0, (freshIng['Rum (Old Monk)']?.stock || 0) - 20) },          // -20ml unaccounted
    { ingredientId: freshIng['Beer (Everest)']?._id,        actualQty: freshIng['Beer (Everest)']?.stock || 0 },                              // exact match
    { ingredientId: freshIng['Beer (Tuborg)']?._id,         actualQty: freshIng['Beer (Tuborg)']?.stock || 0 },                               // exact match
    { ingredientId: freshIng['Chicken Keema']?._id,         actualQty: Math.max(0, (freshIng['Chicken Keema']?.stock || 0) - 0.2) },          // -200g trim waste
    { ingredientId: freshIng['Rice']?._id,                  actualQty: freshIng['Rice']?.stock || 0 },                                        // exact
  ].filter(l => l.ingredientId);

  await stocktake(token, stocktakeLines);
  console.log(`  ✅  Stocktake done (${stocktakeLines.length} items counted)\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('─'.repeat(40));
  console.log('🎉  Activity seed complete!\n');
  console.log('What was created:');
  console.log(`  📥  ${restocks.length} restock entries`);
  console.log(`  💰  ${salesDone} sell batches (bar + kitchen)`);
  console.log(`  👨‍🍳  ${staffDrinks.length} staff consumption entries`);
  console.log(`  👔  ${ownerDrinks.length} owner consumption entries`);
  console.log(`  🗑️   ${wastageEntries.length} wastage entries (spillage/breakage/expired)`);
  console.log(`  🎁  ${giftEntries.length} complimentary / free gift entries`);
  console.log(`  📋  1 stocktake (end-of-month physical count)`);
  console.log('\nNow open: Admin → Inventory → Analytics tab');
  console.log('You should see all 4 lines in the trend chart and all slices in the pie.\n');
}

main().catch(err => {
  console.error('\n❌  Seeder failed:', err.message);
  process.exit(1);
});
