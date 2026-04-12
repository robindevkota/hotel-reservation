/**
 * seed-inventory-backdated.js
 *
 * Directly inserts backdated StockLog entries spread across the last 30 days
 * so the Analytics trend chart shows realistic daily activity.
 *
 * Run AFTER the main inventory seed + import of inventory-seed.xlsx.
 * (Also run this INSTEAD of seed-inventory-activity.js — it does both restocking
 *  and all activity in one go, backdated.)
 *
 * Usage:
 *   node scripts/seed-inventory-backdated.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1); }

// ── Minimal inline schemas (no TypeScript needed) ──────────────────────────

const IngredientSchema = new mongoose.Schema({
  name: String, stock: Number, unit: String,
  costPrice: Number, salePrice: Number, category: String,
  qtyPerServing: Number, minStock: Number,
}, { timestamps: true });

const RecipeSchema = new mongoose.Schema({
  name: String, section: String, sellingPrice: Number,
  ingredients: [{ ingredient: mongoose.Schema.Types.ObjectId, qtyPerServing: Number }],
}, { timestamps: true });

const StockLogSchema = new mongoose.Schema({
  type: String,
  performedBy: mongoose.Schema.Types.ObjectId,
  recipe: mongoose.Schema.Types.ObjectId,
  recipeName: String,
  servingsConsumed: Number,
  lines: [{
    ingredient: mongoose.Schema.Types.ObjectId,
    ingredientName: String,
    unit: String,
    delta: Number,
  }],
  note: String,
  consumedBy: String,
  consumptionReason: String,
  guestId: mongoose.Schema.Types.ObjectId,
  variance: Number,
}, { timestamps: true });

// ── helpers ──────────────────────────────────────────────────────────────────

/** Random integer between min and max (inclusive) */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** Date that is `daysAgo` days in the past, at a random time during business hours */
function daysBack(daysAgo, hourMin = 10, hourMax = 23) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rand(hourMin, hourMax), rand(0, 59), rand(0, 59), 0);
  return d;
}

/** Build a single StockLog document object (not saved yet) */
function makeLog(overrides) {
  return {
    note: '',
    lines: [],
    ...overrides,
  };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📅  Inventory Backdated Activity Seeder');
  console.log('─'.repeat(45));

  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  const Ingredient = mongoose.models.Ingredient || mongoose.model('Ingredient', IngredientSchema);
  const Recipe     = mongoose.models.Recipe     || mongoose.model('Recipe',     RecipeSchema);
  const StockLog   = mongoose.models.StockLog   || mongoose.model('StockLog',   StockLogSchema);

  // Fetch all ingredients and recipes
  const ingredients = await Ingredient.find({});
  const recipes     = await Recipe.find({});

  if (!ingredients.length) { console.error('❌  No ingredients found. Import inventory-seed.xlsx first.'); process.exit(1); }
  if (!recipes.length)     { console.error('❌  No recipes found. Import inventory-seed.xlsx first.'); process.exit(1); }

  // Index by name
  const ing = {};
  ingredients.forEach(i => { ing[i.name] = i; });
  const rec = {};
  recipes.forEach(r => { rec[r.name] = r; });

  console.log(`📦  Found ${ingredients.length} ingredients, ${recipes.length} recipes`);
  console.log(`🗑️   Removing today-only logs from previous seed run...`);

  // Remove any existing non-restock logs created today (from the previous seed run)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const deletedCount = await StockLog.deleteMany({
    type: { $in: ['sale','staff_consumption','owner_consumption','wastage','complimentary','stocktake'] },
    createdAt: { $gte: todayStart },
  });
  console.log(`  Removed ${deletedCount.deletedCount} same-day logs\n`);

  const logs = [];

  // ── helper to push a log ────────────────────────────────────────────────────
  function push(type, lines, extra, daysAgo) {
    const doc = makeLog({ type, lines, ...extra });
    // We'll set createdAt + updatedAt after insert via updateOne
    doc._backdateMs = daysBack(daysAgo).getTime();
    logs.push(doc);
  }

  // ── RESTOCKS — spread across days 28 → 5 ago ───────────────────────────────
  const restockPlan = [
    ['Whiskey (Black Label)', 3000, 'Monthly stock — 4 bottles Black Label', 28],
    ['Vodka (Smirnoff)',      2800, 'Monthly stock — 4 bottles Smirnoff',    27],
    ['Rum (Old Monk)',        2250, 'Monthly stock — 3 bottles Old Monk',    26],
    ['Beer (Everest)',          48, 'Case of 48 Everest beers',              25],
    ['Beer (Tuborg)',           24, 'Case of 24 Tuborg beers',               25],
    ['Tonic Water',          4000, '12 cans tonic water',                   24],
    ['Cola (Coca-Cola)',      6000, '18 cans cola',                          24],
    ['Lime Juice',           1000, 'Bulk lime juice',                        23],
    ['Sugar Syrup',           800, 'Bulk sugar syrup',                       22],
    ['Mint Leaves',           200, 'Fresh mint batch',                       20],
    ['Chicken Keema',          10, 'Weekly kitchen stock — 10kg keema',      18],
    ['Momo Dough',              8, 'Weekly kitchen stock — 8kg dough',       18],
    ['Rice',                   15, 'Monthly rice — 15kg',                   17],
    ['Dal (Lentils)',            8, 'Monthly dal — 8kg',                     16],
    ['Egg',                    60, '5 dozen eggs',                           15],
    ['Bread Slice',            80, '4 loaves',                               14],
    ['Butter',               2000, '2kg butter',                             14],
    ['Cooking Oil',             5, '5 litres cooking oil',                   13],
  ];

  for (const [name, qty, note, daysAgo] of restockPlan) {
    const i = ing[name];
    if (!i) { console.warn(`  ⚠️  Ingredient not found: ${name}`); continue; }
    // Also update actual stock in Ingredient collection
    await Ingredient.updateOne({ _id: i._id }, { $inc: { stock: qty } });
    push('restock', [{ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: qty }], { note }, daysAgo);
  }
  console.log(`  📥  ${restockPlan.length} restocks queued`);

  // ── SALES — spread across days 27 → 1 ago, multiple per recipe ─────────────
  // Each entry: [recipeName, servings, daysAgo]
  const salesPlan = [
    // Bar sales — spread over many days
    ['Whiskey Peg',  2, 27], ['Whiskey Peg',  3, 22], ['Whiskey Peg',  2, 18], ['Whiskey Peg',  3, 12], ['Whiskey Peg',  2, 6],  ['Whiskey Peg',  2, 2],
    ['Whiskey Soda', 2, 26], ['Whiskey Soda', 1, 20], ['Whiskey Soda', 2, 14], ['Whiskey Soda', 2, 8],  ['Whiskey Soda', 1, 3],
    ['Vodka Lime',   2, 25], ['Vodka Lime',   2, 19], ['Vodka Lime',   2, 13], ['Vodka Lime',   1, 7],  ['Vodka Lime',   2, 2],
    ['Mojito',       2, 24], ['Mojito',       3, 17], ['Mojito',       2, 11], ['Mojito',       2, 5],  ['Mojito',       3, 1],
    ['Rum & Coke',   1, 23], ['Rum & Coke',   2, 16], ['Rum & Coke',   1, 9],  ['Rum & Coke',   2, 4],
    ['Everest Beer', 3, 27], ['Everest Beer', 4, 21], ['Everest Beer', 3, 15], ['Everest Beer', 3, 9],  ['Everest Beer', 2, 4],  ['Everest Beer', 3, 1],
    ['Tuborg Beer',  2, 26], ['Tuborg Beer',  2, 20], ['Tuborg Beer',  1, 13], ['Tuborg Beer',  2, 6],  ['Tuborg Beer',  2, 2],
    // Kitchen sales
    ['Chicken Momo', 2, 27], ['Chicken Momo', 1, 22], ['Chicken Momo', 2, 17], ['Chicken Momo', 2, 10], ['Chicken Momo', 1, 4],
    ['Dal Bhat',     3, 28], ['Dal Bhat',     2, 23], ['Dal Bhat',     3, 18], ['Dal Bhat',     2, 12], ['Dal Bhat',     3, 6],  ['Dal Bhat', 2, 1],
    ['Egg Omelette', 2, 27], ['Egg Omelette', 2, 21], ['Egg Omelette', 2, 16], ['Egg Omelette', 1, 10], ['Egg Omelette', 2, 4],
    ['Butter Toast', 3, 26], ['Butter Toast', 3, 20], ['Butter Toast', 2, 14], ['Butter Toast', 3, 8],  ['Butter Toast', 2, 3],
    ['Cheese Toast', 1, 24], ['Cheese Toast', 2, 17], ['Cheese Toast', 1, 11], ['Cheese Toast', 1, 5],
  ];

  let salesQueued = 0;
  for (const [name, servings, daysAgo] of salesPlan) {
    const r = rec[name];
    if (!r) { console.warn(`  ⚠️  Recipe not found: ${name}`); continue; }

    // Build lines from recipe ingredients
    const lines = [];
    for (const ri of r.ingredients) {
      const ingDoc = ingredients.find(x => x._id.equals(ri.ingredient));
      if (!ingDoc) continue;
      const delta = -(ri.qtyPerServing * servings);
      lines.push({ ingredient: ingDoc._id, ingredientName: ingDoc.name, unit: ingDoc.unit, delta });
      // Deduct from actual stock
      await Ingredient.updateOne({ _id: ingDoc._id }, { $inc: { stock: delta } });
    }

    push('sale', lines, {
      recipe: r._id,
      recipeName: r.name,
      servingsConsumed: servings,
      note: `${servings} serving${servings > 1 ? 's' : ''} of ${r.name}`,
    }, daysAgo);
    salesQueued++;
  }
  console.log(`  💰  ${salesQueued} sale logs queued`);

  // ── STAFF CONSUMPTION ────────────────────────────────────────────────────────
  const staffDrinks = [
    ['Whiskey (Black Label)', 120, 'Ramesh (Bartender)',  'End of shift drink',       25],
    ['Whiskey (Black Label)',  60, 'Sita (Waitress)',     'Staff party',              19],
    ['Vodka (Smirnoff)',       90, 'Bikash (Bartender)', 'Tasting new cocktail',     22],
    ['Beer (Everest)',          3, 'Kitchen Staff',       'After shift beers',        15],
    ['Beer (Tuborg)',           2, 'Ramesh (Bartender)', 'Staff meal',               12],
    ['Rum (Old Monk)',         60, 'Bikash (Bartender)', 'Bartender tasting',         8],
    ['Chicken Keema',         0.5, 'Kitchen Staff',      'Staff meal — chicken momo', 6],
    ['Rice',                  0.3, 'Kitchen Staff',      'Staff lunch dal bhat',      5],
    ['Dal (Lentils)',          0.2, 'Kitchen Staff',     'Staff lunch dal bhat',      5],
    ['Egg',                     4, 'Kitchen Staff',      'Staff breakfast',           3],
  ];

  for (const [name, qty, consumedBy, note, daysAgo] of staffDrinks) {
    const i = ing[name];
    if (!i) { console.warn(`  ⚠️  Not found: ${name}`); continue; }
    await Ingredient.updateOne({ _id: i._id }, { $inc: { stock: -qty } });
    push('staff_consumption', [{ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: -qty }],
      { consumedBy, note }, daysAgo);
  }
  console.log(`  👨‍🍳  ${staffDrinks.length} staff consumption logs queued`);

  // ── OWNER CONSUMPTION ────────────────────────────────────────────────────────
  const ownerDrinks = [
    ['Whiskey (Black Label)', 180, 'Owner', 'Business meeting drinks',  24],
    ['Whiskey (Black Label)', 120, 'Owner', 'Personal evening drink',   17],
    ['Beer (Everest)',           4, 'Owner', 'Owner evening drinks',     13],
    ['Vodka (Smirnoff)',       60, 'Owner', 'Owner party at home',      10],
    ['Rum (Old Monk)',         90, 'Owner', 'Owner consumption',         7],
    ['Chicken Keema',         0.3, 'Owner', 'Owner family dinner',       4],
  ];

  for (const [name, qty, consumedBy, note, daysAgo] of ownerDrinks) {
    const i = ing[name];
    if (!i) { console.warn(`  ⚠️  Not found: ${name}`); continue; }
    await Ingredient.updateOne({ _id: i._id }, { $inc: { stock: -qty } });
    push('owner_consumption', [{ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: -qty }],
      { consumedBy, note }, daysAgo);
  }
  console.log(`  👔  ${ownerDrinks.length} owner consumption logs queued`);

  // ── WASTAGE ───────────────────────────────────────────────────────────────────
  const wastageEntries = [
    ['Whiskey (Black Label)', 90,  'spillage', 'Bottle knocked over at bar',       23],
    ['Vodka (Smirnoff)',      60,  'spillage', 'Spilled during cocktail prep',     18],
    ['Beer (Everest)',          2, 'breakage', 'Dropped 2 bottles',               16],
    ['Lime Juice',            50,  'expired',  'Lime juice gone sour',             14],
    ['Mint Leaves',           30,  'expired',  'Mint wilted — unusable',           12],
    ['Bread Slice',            6,  'expired',  'Mouldy bread',                      9],
    ['Egg',                    3,  'breakage', 'Dropped tray',                      7],
    ['Rum (Old Monk)',        45,  'spillage', 'Bar spillage during busy night',    5],
    ['Cola (Coca-Cola)',     330,  'other',    'Flat cola — opened cans unused',    3],
    ['Cooking Oil',          0.3,  'other',    'Oil spill in kitchen',              2],
  ];

  for (const [name, qty, consumptionReason, note, daysAgo] of wastageEntries) {
    const i = ing[name];
    if (!i) { console.warn(`  ⚠️  Not found: ${name}`); continue; }
    await Ingredient.updateOne({ _id: i._id }, { $inc: { stock: -qty } });
    push('wastage', [{ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: -qty }],
      { consumptionReason, note }, daysAgo);
  }
  console.log(`  🗑️   ${wastageEntries.length} wastage logs queued`);

  // ── COMPLIMENTARY ─────────────────────────────────────────────────────────────
  const giftEntries = [
    ['Whiskey (Black Label)',  60, 'Welcome drink — VIP guest check-in',         22],
    ['Whiskey (Black Label)', 120, 'Birthday celebration — complimentary round', 15],
    ['Beer (Everest)',           3, 'Complimentary beers — long-stay guest',     11],
    ['Beer (Tuborg)',            2, 'Welcome gift — honeymoon couple',            9],
    ['Vodka (Smirnoff)',       60, 'Farewell drink — repeat guest',               6],
    ['Rum (Old Monk)',         60, 'Anniversary gift drink',                      4],
    ['Chicken Keema',         0.2, 'Complimentary momo — VIP arrival',            2],
  ];

  for (const [name, qty, note, daysAgo] of giftEntries) {
    const i = ing[name];
    if (!i) { console.warn(`  ⚠️  Not found: ${name}`); continue; }
    await Ingredient.updateOne({ _id: i._id }, { $inc: { stock: -qty } });
    push('complimentary', [{ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: -qty }],
      { note }, daysAgo);
  }
  console.log(`  🎁  ${giftEntries.length} complimentary logs queued`);

  // ── STOCKTAKE (yesterday) ─────────────────────────────────────────────────────
  const freshIng = {};
  (await Ingredient.find({})).forEach(i => { freshIng[i.name] = i; });

  const stocktakeLines = [
    ['Whiskey (Black Label)', -45],   // 45ml unaccounted (over-pour)
    ['Vodka (Smirnoff)',      -30],   // 30ml unaccounted
    ['Rum (Old Monk)',        -20],   // 20ml unaccounted
    ['Beer (Everest)',          0],   // exact
    ['Beer (Tuborg)',           0],   // exact
    ['Chicken Keema',        -0.2],   // trim waste
    ['Rice',                   0],   // exact
  ];

  const stLines = [];
  for (const [name, diff] of stocktakeLines) {
    const i = freshIng[name];
    if (!i) continue;
    const actual = Math.max(0, i.stock + diff);
    const variance = actual - i.stock; // negative = deficit
    if (diff !== 0) {
      await Ingredient.updateOne({ _id: i._id }, { $set: { stock: actual } });
    }
    stLines.push({ ingredient: i._id, ingredientName: i.name, unit: i.unit, delta: diff, variance });
  }
  push('stocktake', stLines, { note: 'End-of-month physical count' }, 1);
  console.log(`  📋  1 stocktake log queued\n`);

  // ── INSERT ALL LOGS + BACKDATE ────────────────────────────────────────────────
  console.log(`📝  Inserting ${logs.length} logs with backdated timestamps...`);

  let inserted = 0;
  for (const doc of logs) {
    const backdateMs = doc._backdateMs;
    delete doc._backdateMs;
    const created = await StockLog.create(doc);
    // Force createdAt + updatedAt to the backdated time
    await StockLog.collection.updateOne(
      { _id: created._id },
      { $set: { createdAt: new Date(backdateMs), updatedAt: new Date(backdateMs) } }
    );
    inserted++;
  }

  console.log(`  ✅  ${inserted} logs inserted and backdated\n`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('─'.repeat(45));
  console.log('🎉  Backdated activity seed complete!\n');
  console.log('Now open: Admin → Inventory → Analytics tab');
  console.log('The trend chart should show activity spread across the last 30 days.\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌  Seeder failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
