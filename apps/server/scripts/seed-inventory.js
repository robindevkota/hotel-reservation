const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ── Sheet 1: Ingredients ──────────────────────────────────────────────────────
const ingredients = [
  // Kitchen
  { Name: 'Chicken Keema',    Unit: 'kg',     Stock: 5,     'Cost Price': 450,  'Low Alert': 0.5,  Category: 'kitchen' },
  { Name: 'Momo Dough',       Unit: 'kg',     Stock: 4,     'Cost Price': 80,   'Low Alert': 0.5,  Category: 'kitchen' },
  { Name: 'Mixed Spices',     Unit: 'g',      Stock: 500,   'Cost Price': 2,    'Low Alert': 50,   Category: 'kitchen' },
  { Name: 'Cooking Oil',      Unit: 'litre',  Stock: 6,     'Cost Price': 180,  'Low Alert': 1,    Category: 'kitchen' },
  { Name: 'Onion',            Unit: 'kg',     Stock: 3,     'Cost Price': 40,   'Low Alert': 0.5,  Category: 'kitchen' },
  { Name: 'Tomato',           Unit: 'kg',     Stock: 2,     'Cost Price': 60,   'Low Alert': 0.3,  Category: 'kitchen' },
  { Name: 'Garlic',           Unit: 'g',      Stock: 300,   'Cost Price': 1.5,  'Low Alert': 50,   Category: 'kitchen' },
  { Name: 'Butter',           Unit: 'g',      Stock: 1000,  'Cost Price': 0.6,  'Low Alert': 100,  Category: 'kitchen' },
  { Name: 'Egg',              Unit: 'piece',  Stock: 30,    'Cost Price': 15,   'Low Alert': 6,    Category: 'kitchen' },
  { Name: 'Bread Slice',      Unit: 'piece',  Stock: 40,    'Cost Price': 8,    'Low Alert': 10,   Category: 'kitchen' },
  { Name: 'Cheese Slice',     Unit: 'piece',  Stock: 20,    'Cost Price': 25,   'Low Alert': 5,    Category: 'kitchen' },
  { Name: 'Rice',             Unit: 'kg',     Stock: 10,    'Cost Price': 70,   'Low Alert': 1,    Category: 'kitchen' },
  { Name: 'Dal (Lentils)',    Unit: 'kg',     Stock: 5,     'Cost Price': 90,   'Low Alert': 0.5,  Category: 'kitchen' },
  // Bar
  { Name: 'Whiskey (Black Label)', Unit: 'ml', Stock: 750,  'Cost Price': 6,    'Low Alert': 120,  Category: 'bar' },
  { Name: 'Vodka (Smirnoff)',      Unit: 'ml', Stock: 700,  'Cost Price': 4,    'Low Alert': 120,  Category: 'bar' },
  { Name: 'Rum (Old Monk)',        Unit: 'ml', Stock: 0,    'Cost Price': 3,    'Low Alert': 120,  Category: 'bar' },
  { Name: 'Beer (Everest)',        Unit: 'piece', Stock: 24, 'Cost Price': 150, 'Low Alert': 6,    Category: 'bar' },
  { Name: 'Beer (Tuborg)',         Unit: 'piece', Stock: 3,  'Cost Price': 180, 'Low Alert': 6,    Category: 'bar' },
  { Name: 'Tonic Water',          Unit: 'ml', Stock: 2000, 'Cost Price': 0.5,  'Low Alert': 330,  Category: 'bar' },
  { Name: 'Cola (Coca-Cola)',      Unit: 'ml', Stock: 3000, 'Cost Price': 0.3,  'Low Alert': 330,  Category: 'bar' },
  { Name: 'Lime Juice',           Unit: 'ml', Stock: 500,  'Cost Price': 0.8,  'Low Alert': 60,   Category: 'bar' },
  { Name: 'Sugar Syrup',          Unit: 'ml', Stock: 400,  'Cost Price': 0.5,  'Low Alert': 60,   Category: 'bar' },
  { Name: 'Mint Leaves',          Unit: 'g',  Stock: 80,   'Cost Price': 3,    'Low Alert': 20,   Category: 'bar' },
];

// ── Sheet 2: Recipes ──────────────────────────────────────────────────────────
// Columns: Dish/Drink Name | Serving Label | Selling Price | Section | Ingredient 1 | Qty 1 | Ingredient 2 | Qty 2 ...
const recipes = [
  // Kitchen
  {
    'Dish/Drink Name': 'Chicken Momo',   'Serving Label': 'plate of 10', 'Selling Price': 250,  Section: 'kitchen',
    'Ingredient 1': 'Chicken Keema',  'Qty 1': 0.2,
    'Ingredient 2': 'Momo Dough',     'Qty 2': 0.15,
    'Ingredient 3': 'Mixed Spices',   'Qty 3': 10,
    'Ingredient 4': 'Garlic',         'Qty 4': 5,
  },
  {
    'Dish/Drink Name': 'Dal Bhat',        'Serving Label': '1 plate', 'Selling Price': 180,  Section: 'kitchen',
    'Ingredient 1': 'Rice',           'Qty 1': 0.15,
    'Ingredient 2': 'Dal (Lentils)',  'Qty 2': 0.08,
    'Ingredient 3': 'Cooking Oil',    'Qty 3': 0.02,
    'Ingredient 4': 'Onion',          'Qty 4': 0.05,
    'Ingredient 5': 'Tomato',         'Qty 5': 0.05,
    'Ingredient 6': 'Mixed Spices',   'Qty 6': 5,
  },
  {
    'Dish/Drink Name': 'Egg Omelette',    'Serving Label': '2 eggs', 'Selling Price': 120,  Section: 'kitchen',
    'Ingredient 1': 'Egg',            'Qty 1': 2,
    'Ingredient 2': 'Cooking Oil',    'Qty 2': 0.01,
    'Ingredient 3': 'Mixed Spices',   'Qty 3': 2,
    'Ingredient 4': 'Onion',          'Qty 4': 0.03,
  },
  {
    'Dish/Drink Name': 'Butter Toast',    'Serving Label': '2 slices', 'Selling Price': 80,   Section: 'kitchen',
    'Ingredient 1': 'Bread Slice',    'Qty 1': 2,
    'Ingredient 2': 'Butter',         'Qty 2': 15,
  },
  {
    'Dish/Drink Name': 'Cheese Toast',    'Serving Label': '2 slices', 'Selling Price': 130,  Section: 'kitchen',
    'Ingredient 1': 'Bread Slice',    'Qty 1': 2,
    'Ingredient 2': 'Butter',         'Qty 2': 10,
    'Ingredient 3': 'Cheese Slice',   'Qty 3': 2,
  },
  // Bar
  {
    'Dish/Drink Name': 'Whiskey Peg',     'Serving Label': '60 ml peg', 'Selling Price': 350,  Section: 'bar',
    'Ingredient 1': 'Whiskey (Black Label)', 'Qty 1': 60,
  },
  {
    'Dish/Drink Name': 'Whiskey Soda',    'Serving Label': '60 ml + mixer', 'Selling Price': 400,  Section: 'bar',
    'Ingredient 1': 'Whiskey (Black Label)', 'Qty 1': 60,
    'Ingredient 2': 'Tonic Water',          'Qty 2': 150,
  },
  {
    'Dish/Drink Name': 'Vodka Lime',      'Serving Label': '60 ml + lime', 'Selling Price': 320,  Section: 'bar',
    'Ingredient 1': 'Vodka (Smirnoff)',  'Qty 1': 60,
    'Ingredient 2': 'Lime Juice',        'Qty 2': 30,
    'Ingredient 3': 'Sugar Syrup',       'Qty 3': 20,
  },
  {
    'Dish/Drink Name': 'Mojito',          'Serving Label': '1 glass', 'Selling Price': 280,  Section: 'bar',
    'Ingredient 1': 'Vodka (Smirnoff)',  'Qty 1': 45,
    'Ingredient 2': 'Lime Juice',        'Qty 2': 30,
    'Ingredient 3': 'Sugar Syrup',       'Qty 3': 20,
    'Ingredient 4': 'Mint Leaves',       'Qty 4': 8,
    'Ingredient 5': 'Cola (Coca-Cola)',  'Qty 5': 100,
  },
  {
    'Dish/Drink Name': 'Rum & Coke',      'Serving Label': '60 ml + cola', 'Selling Price': 300,  Section: 'bar',
    'Ingredient 1': 'Rum (Old Monk)',    'Qty 1': 60,
    'Ingredient 2': 'Cola (Coca-Cola)', 'Qty 2': 150,
  },
  {
    'Dish/Drink Name': 'Everest Beer',    'Serving Label': '1 bottle', 'Selling Price': 400,  Section: 'bar',
    'Ingredient 1': 'Beer (Everest)',    'Qty 1': 1,
  },
  {
    'Dish/Drink Name': 'Tuborg Beer',     'Serving Label': '1 bottle', 'Selling Price': 450,  Section: 'bar',
    'Ingredient 1': 'Beer (Tuborg)',     'Qty 1': 1,
  },
];

// ── Build workbook ─────────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingredients), 'Ingredients');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recipes),     'Recipes');

const outPath = path.join(__dirname, '..', 'inventory-seed.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`✅  Saved: ${outPath}`);
console.log(`   ${ingredients.length} ingredients, ${recipes.length} recipes`);
console.log('');
console.log('Notes:');
console.log('  - Rum (Old Monk) stock = 0  →  "Rum & Coke" will show OUT status');
console.log('  - Beer (Tuborg)  stock = 3  →  "Tuborg Beer" will show LOW status');
console.log('  - All others have healthy stock levels');
