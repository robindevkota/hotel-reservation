/**
 * 2-Year Full Simulation Seed  (Jan 2024 → Dec 2025)
 * ────────────────────────────────────────────────────
 * Wipes ALL transactional data, then re-creates a realistic 2-year timeline:
 *
 *   Hotel stays        — completed (checked_out), cancelled, no-show
 *   Cancellations      — flexible (free + penalty), non_refundable
 *   No-shows           — confirmed but never checked in, 1-night penalty
 *   Early departures   — actual checkout before scheduled checkout date
 *   Extended stays     — checkout date pushed forward (add nights)
 *   Early arrivals     — same-day early check-in, early-arrival fee on bill
 *   In-house food      — room-service orders added to hotel guest bills
 *   Walk-in food       — external dine-in customers, cash paid
 *   In-house spa       — spa bookings by hotel guests
 *   Walk-in spa        — external spa customers, cash paid
 *   Petty cash         — operational expenses, spread over 2 years
 *   Live guests        — 6 currently checked-in guests for live dashboard
 *
 * Run:  npx ts-node src/seed-simulation.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';

import Room         from './models/Room';
import RoomCategory from './models/RoomCategory';
import MenuItem     from './models/MenuItem';
import SpaService   from './models/SpaService';
import SpaTherapist from './models/SpaTherapist';
import SpaBooking   from './models/SpaBooking';
import Guest        from './models/Guest';
import Bill         from './models/Bill';
import Reservation  from './models/Reservation';
import Order        from './models/Order';
import WalkInCustomer from './models/WalkInCustomer';
import StockLog     from './models/StockLog';
import Ingredient   from './models/Ingredient';
import ExchangeRate from './models/ExchangeRate';
import Payment      from './models/Payment';
import User         from './models/User';
import { generateQRToken, generateQRDataUrl } from './utils/generateQR';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function rnd(min: number, max: number)         { return Math.random() * (max - min) + min; }
function rndInt(min: number, max: number)      { return Math.floor(rnd(min, max + 1)); }
function pick<T>(arr: T[]): T                  { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[]    { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }
function addDays(d: Date, n: number): Date     { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function clampDate(d: Date, lo: Date, hi: Date): Date { return d < lo ? lo : d > hi ? hi : d; }

/** Return a date N days before `base`, with a random hour between 8–22 */
function daysAgo(n: number, base = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  d.setHours(rndInt(8, 22), rndInt(0, 59), 0, 0);
  return d;
}

/** Jan 1 2024 is our timeline start */
const SIM_START = new Date('2024-01-01T00:00:00Z');
const SIM_END   = new Date('2025-12-31T23:59:59Z');
const TODAY     = new Date();

/** Return a random date between two dates */
function randBetween(lo: Date, hi: Date): Date {
  const ms = lo.getTime() + Math.random() * (hi.getTime() - lo.getTime());
  const d  = new Date(ms);
  d.setHours(rndInt(8, 22), rndInt(0, 59), 0, 0);
  return d;
}

let _refCounter = 0;
function bookingRef(date: Date): string {
  _refCounter++;
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `RS-${ymd}-${String(_refCounter).padStart(4, '0')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exchange rate history — realistic NPR/USD drift over 2 years (2024–2025)
// Rate bands keyed by days-ago from TODAY so `rateAtDate` stays consistent
// ─────────────────────────────────────────────────────────────────────────────

interface RateBand { from: Date; to: Date; rate: number; }

const RATE_BANDS: RateBand[] = [
  // 2024 Q1  — Rs.128–130
  { from: new Date('2024-01-01'), to: new Date('2024-02-15'), rate: 128 },
  { from: new Date('2024-02-16'), to: new Date('2024-03-31'), rate: 130 },
  // 2024 Q2  — Rs.131–133
  { from: new Date('2024-04-01'), to: new Date('2024-05-15'), rate: 131 },
  { from: new Date('2024-05-16'), to: new Date('2024-06-30'), rate: 133 },
  // 2024 Q3  — Rs.133–136, peak tourism
  { from: new Date('2024-07-01'), to: new Date('2024-07-31'), rate: 134 },
  { from: new Date('2024-08-01'), to: new Date('2024-08-31'), rate: 136 },
  { from: new Date('2024-09-01'), to: new Date('2024-09-30'), rate: 135 },
  // 2024 Q4  — slight dip then recovery
  { from: new Date('2024-10-01'), to: new Date('2024-10-31'), rate: 134 },
  { from: new Date('2024-11-01'), to: new Date('2024-11-30'), rate: 135 },
  { from: new Date('2024-12-01'), to: new Date('2024-12-31'), rate: 136 },
  // 2025 Q1  — Rs.136–138
  { from: new Date('2025-01-01'), to: new Date('2025-02-28'), rate: 137 },
  { from: new Date('2025-03-01'), to: new Date('2025-03-31'), rate: 138 },
  // 2025 Q2  — Rs.138–140
  { from: new Date('2025-04-01'), to: new Date('2025-05-31'), rate: 139 },
  { from: new Date('2025-06-01'), to: new Date('2025-06-30'), rate: 140 },
  // 2025 Q3  — Rs.140–141
  { from: new Date('2025-07-01'), to: new Date('2025-08-31'), rate: 141 },
  { from: new Date('2025-09-01'), to: new Date('2025-09-30'), rate: 140 },
  // 2025 Q4  — Rs.141–142 current
  { from: new Date('2025-10-01'), to: new Date('2025-11-30'), rate: 141 },
  { from: new Date('2025-12-01'), to: new Date('2025-12-31'), rate: 142 },
];

function rateAtDate(d: Date): number {
  for (const b of RATE_BANDS) {
    if (d >= b.from && d <= b.to) return b.rate;
  }
  return 135;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest roster — 10 nationalities, 40 profiles, allow repeats across 2 years
// ─────────────────────────────────────────────────────────────────────────────

const HOTEL_GUESTS = [
  // Nepali (home market — pay in NPR)
  { name: 'Aarav Sharma',       email: 'aarav.sharma@sim.com',       phone: '+977-9841100001', nationality: 'nepali'  as const },
  { name: 'Priya Thapa',        email: 'priya.thapa@sim.com',        phone: '+977-9841100002', nationality: 'nepali'  as const },
  { name: 'Bikash Rai',         email: 'bikash.rai@sim.com',         phone: '+977-9841100003', nationality: 'nepali'  as const },
  { name: 'Sita Karki',         email: 'sita.karki@sim.com',         phone: '+977-9841100004', nationality: 'nepali'  as const },
  { name: 'Rajan Poudel',       email: 'rajan.poudel@sim.com',       phone: '+977-9841100005', nationality: 'nepali'  as const },
  { name: 'Anita Gurung',       email: 'anita.gurung@sim.com',       phone: '+977-9841100006', nationality: 'nepali'  as const },
  { name: 'Dipak Tamang',       email: 'dipak.tamang@sim.com',       phone: '+977-9841100007', nationality: 'nepali'  as const },
  { name: 'Sunita Magar',       email: 'sunita.magar@sim.com',       phone: '+977-9841100008', nationality: 'nepali'  as const },
  { name: 'Kamal Basnet',       email: 'kamal.basnet@sim.com',       phone: '+977-9841100009', nationality: 'nepali'  as const },
  { name: 'Nirmala Shrestha',   email: 'nirmala.shrestha@sim.com',   phone: '+977-9841100010', nationality: 'nepali'  as const },
  // Indian
  { name: 'Rahul Mehta',        email: 'rahul.mehta@sim.com',        phone: '+91-9800000001',  nationality: 'foreign' as const },
  { name: 'Kavya Iyer',         email: 'kavya.iyer@sim.com',         phone: '+91-9800000002',  nationality: 'foreign' as const },
  { name: 'Arjun Singh',        email: 'arjun.singh@sim.com',        phone: '+91-9800000003',  nationality: 'foreign' as const },
  { name: 'Deepa Nair',         email: 'deepa.nair@sim.com',         phone: '+91-9800000004',  nationality: 'foreign' as const },
  // Chinese
  { name: 'Wei Zhang',          email: 'wei.zhang@sim.com',          phone: '+86-13800000001', nationality: 'foreign' as const },
  { name: 'Lin Xu',             email: 'lin.xu@sim.com',             phone: '+86-13800000002', nationality: 'foreign' as const },
  { name: 'Fang Liu',           email: 'fang.liu@sim.com',           phone: '+86-13800000003', nationality: 'foreign' as const },
  // American
  { name: 'James Harrison',     email: 'james.harrison@sim.com',     phone: '+1-5551000001',   nationality: 'foreign' as const },
  { name: 'Emily Carter',       email: 'emily.carter@sim.com',       phone: '+1-5551000002',   nationality: 'foreign' as const },
  { name: 'Michael Brooks',     email: 'michael.brooks@sim.com',     phone: '+1-5551000003',   nationality: 'foreign' as const },
  // British
  { name: 'Oliver Whitfield',   email: 'oliver.whitfield@sim.com',   phone: '+44-7000000001',  nationality: 'foreign' as const },
  { name: 'Charlotte Hughes',   email: 'charlotte.hughes@sim.com',   phone: '+44-7000000002',  nationality: 'foreign' as const },
  // German
  { name: 'Lukas Müller',       email: 'lukas.muller@sim.com',       phone: '+49-1700000001',  nationality: 'foreign' as const },
  { name: 'Hannah Schmidt',     email: 'hannah.schmidt@sim.com',     phone: '+49-1700000002',  nationality: 'foreign' as const },
  // Japanese
  { name: 'Kenji Tanaka',       email: 'kenji.tanaka@sim.com',       phone: '+81-9000000001',  nationality: 'foreign' as const },
  { name: 'Yuki Yamamoto',      email: 'yuki.yamamoto@sim.com',      phone: '+81-9000000002',  nationality: 'foreign' as const },
  // Australian
  { name: "Liam O'Brien",       email: 'liam.obrien@sim.com',        phone: '+61-4000000001',  nationality: 'foreign' as const },
  { name: 'Sophie Wilson',      email: 'sophie.wilson@sim.com',      phone: '+61-4000000002',  nationality: 'foreign' as const },
  // UAE
  { name: 'Khalid Al-Rashid',   email: 'khalid.alrashid@sim.com',   phone: '+971-500000001',  nationality: 'foreign' as const },
  { name: 'Fatima Al-Zaabi',    email: 'fatima.alzaabi@sim.com',     phone: '+971-500000002',  nationality: 'foreign' as const },
  // French
  { name: 'Pierre Dubois',      email: 'pierre.dubois@sim.com',      phone: '+33-6000000001',  nationality: 'foreign' as const },
  { name: 'Marie Lefebvre',     email: 'marie.lefebvre@sim.com',     phone: '+33-6000000002',  nationality: 'foreign' as const },
  // Korean (extra for 2025)
  { name: 'Ji-ho Park',         email: 'jiho.park@sim.com',          phone: '+82-1000000001',  nationality: 'foreign' as const },
  { name: 'Soo-yeon Kim',       email: 'sooyeon.kim@sim.com',        phone: '+82-1000000002',  nationality: 'foreign' as const },
  // Italian (extra for 2025)
  { name: 'Marco Bianchi',      email: 'marco.bianchi@sim.com',      phone: '+39-3000000001',  nationality: 'foreign' as const },
  { name: 'Giulia Ferrari',     email: 'giulia.ferrari@sim.com',     phone: '+39-3000000002',  nationality: 'foreign' as const },
  // Canadian
  { name: 'Noah Tremblay',      email: 'noah.tremblay@sim.com',      phone: '+1-6470000001',   nationality: 'foreign' as const },
  { name: 'Emma Gagnon',        email: 'emma.gagnon@sim.com',        phone: '+1-6470000002',   nationality: 'foreign' as const },
  // Spanish
  { name: 'Carlos García',      email: 'carlos.garcia@sim.com',      phone: '+34-6000000001',  nationality: 'foreign' as const },
  { name: 'Lucía Martínez',     email: 'lucia.martinez@sim.com',     phone: '+34-6000000002',  nationality: 'foreign' as const },
];

const WALKIN_NAMES_FOREIGN = [
  'Tom Walker','Sarah Chen','Alex Kim','Nina Patel','Marco Rossi','Julia Braun',
  'Amara Diallo','Lucas Moreau','Yuna Park','Ben Nguyen','Chloe Martin','Ivan Petrov',
  'Sofia Reyes','Dan Brown','Ella Ford','Ravi Kapoor','Nadia Johansson','Carlos Lima',
  'Amy Chen','Max Richter','Isabella Scott','Diego Torres','Elena Popova','Hiroshi Ito',
  'Fatou Diop','Andrei Volkov','Mei Lin','Omar Hassan','Aaliya Khan','Felix Wagner',
];
const WALKIN_NAMES_NEPALI = [
  'Suresh Basnet','Kamala Shrestha','Roshan KC','Gita Adhikari','Mohan Bhandari',
  'Pratima Pokhrel','Nabin Dahal','Suman Rijal','Laxmi Dhakal','Bishnu Acharya',
  'Prabha Subedi','Hari Bhattarai','Nirmala Joshi','Tek Bahadur','Sarita Ghimire',
  'Dinesh Parajuli','Meena Pandey','Santosh Chaudhary','Binita Yadav','Ram Prasad Oli',
];

const PETTY_CASH_VENDORS = [
  { vendor: 'City Mart Supermarket',   items: 'Kitchen supplies'         },
  { vendor: 'Bhat-Bhateni Store',      items: 'Cleaning & hygiene items' },
  { vendor: 'Banasthali Hardware',     items: 'Maintenance parts'        },
  { vendor: 'Mediciti Pharmacy',       items: 'First aid & medical kit'  },
  { vendor: 'Chaudhary Stationery',    items: 'Office stationery'        },
  { vendor: 'Hotel Linen Co.',         items: 'Linen & bath towels'      },
  { vendor: 'Sagar Electricals',       items: 'Electrical parts'         },
  { vendor: 'Annapurna Flowers',       items: 'Lobby floral arrangement' },
  { vendor: 'Himalayan Tea House',     items: 'Tea & coffee stock'       },
  { vendor: 'Fresh Produce Market',    items: 'Emergency produce top-up' },
  { vendor: 'Nepal Paper Mart',        items: 'Printer paper & toner'    },
  { vendor: 'Clean Pro Services',      items: 'Industrial cleaning agent'},
];
const PETTY_CASH_STAFF = [
  'Ram Kumar (Front Desk)', 'Samir Karki (Kitchen)', 'Priya Rai (Manager)',
  'Anil Tamang (Maintenance)', 'Deepa Magar (Spa)', 'Sujan Thapa (F&B)',
];

// ─────────────────────────────────────────────────────────────────────────────
// Asset images
// ─────────────────────────────────────────────────────────────────────────────

const ROOM_IMAGES = {
  standard:  ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200'],
  deluxe:    ['https://images.unsplash.com/photo-1587985064135-0366536eab42?w=1200'],
  suite:     ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200'],
  royal:     ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200'],
  penthouse: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200'],
};
const SPA_IMAGES = [
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
  'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800',
];
const FOOD_IMAGES = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600',
  lunch:     'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  dinner:    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  snacks:    'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600',
  beverages: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600',
  desserts:  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main seed
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();
  console.log('\n🌱 Starting 2-Year Simulation Seed  (Jan 2024 → Dec 2025)…\n');

  // ── 1. Wipe ───────────────────────────────────────────────────────────────
  await Promise.all([
    Room.deleteMany({}),
    RoomCategory.deleteMany({}),
    MenuItem.deleteMany({}),
    SpaService.deleteMany({}),
    SpaTherapist.deleteMany({}),
    SpaBooking.deleteMany({}),
    Guest.deleteMany({}),
    Bill.deleteMany({}),
    Reservation.deleteMany({}),
    Order.deleteMany({}),
    WalkInCustomer.deleteMany({}),
    StockLog.deleteMany({}),
    Ingredient.deleteMany({}),
    ExchangeRate.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  console.log('🗑️  All data wiped\n');

  // ── 2. Exchange rate — set current (end of 2025) ──────────────────────────
  const superAdmin = await User.findOne({ role: 'super_admin' });
  const adminId = superAdmin?._id ?? new mongoose.Types.ObjectId();
  await ExchangeRate.create({ usdToNpr: 142, updatedBy: 'seed-simulation' });
  console.log('💱 Exchange rate set: 1 USD = Rs. 142 (current)\n');

  // ── 3. Room categories ────────────────────────────────────────────────────
  const categories = await RoomCategory.insertMany([
    { name: 'Standard',  slug: 'standard',  icon: 'Bed',      basePrice: 200,  description: 'Comfortable rooms with all essential amenities.' },
    { name: 'Deluxe',    slug: 'deluxe',    icon: 'Star',     basePrice: 360,  description: 'Spacious rooms with premium furnishings.' },
    { name: 'Suite',     slug: 'suite',     icon: 'Gem',      basePrice: 580,  description: 'Luxurious suites with separate living areas.' },
    { name: 'Royal',     slug: 'royal',     icon: 'Crown',    basePrice: 950,  description: 'The pinnacle of Egyptian luxury.' },
    { name: 'Penthouse', slug: 'penthouse', icon: 'Sparkles', basePrice: 1500, description: 'Exclusive top-floor retreats.' },
  ]);
  console.log(`✅ ${categories.length} room categories`);

  // ── 4. Rooms (28 rooms) ───────────────────────────────────────────────────
  const roomDefs = [
    { name: 'Isis Standard Room',       type: 'standard',  price: 200,  room: '101', floor: 1 },
    { name: 'Ra Standard Room',         type: 'standard',  price: 200,  room: '102', floor: 1 },
    { name: 'Thoth Standard Room',      type: 'standard',  price: 210,  room: '103', floor: 1 },
    { name: 'Bastet Standard Room',     type: 'standard',  price: 210,  room: '104', floor: 1 },
    { name: 'Horus Deluxe Room',        type: 'deluxe',    price: 360,  room: '105', floor: 1 },
    { name: 'Anubis Deluxe Room',       type: 'deluxe',    price: 380,  room: '106', floor: 1 },
    { name: 'Sekhmet Standard Room',    type: 'standard',  price: 215,  room: '201', floor: 2 },
    { name: 'Nut Standard Room',        type: 'standard',  price: 215,  room: '202', floor: 2 },
    { name: 'Geb Standard Room',        type: 'standard',  price: 220,  room: '203', floor: 2 },
    { name: 'Hathor Standard Room',     type: 'standard',  price: 220,  room: '204', floor: 2 },
    { name: 'Seth Deluxe Room',         type: 'deluxe',    price: 370,  room: '205', floor: 2 },
    { name: 'Nephthys Deluxe Room',     type: 'deluxe',    price: 375,  room: '206', floor: 2 },
    { name: 'Khnum Deluxe Room',        type: 'deluxe',    price: 390,  room: '301', floor: 3 },
    { name: 'Sobek Deluxe Room',        type: 'deluxe',    price: 390,  room: '302', floor: 3 },
    { name: 'Ptah Deluxe Room',         type: 'deluxe',    price: 400,  room: '303', floor: 3 },
    { name: 'Osiris Suite',             type: 'suite',     price: 580,  room: '304', floor: 3 },
    { name: 'Nile Deluxe Suite',        type: 'suite',     price: 620,  room: '305', floor: 3 },
    { name: 'Amun Suite',               type: 'suite',     price: 640,  room: '306', floor: 3 },
    { name: 'Khepri Suite',             type: 'suite',     price: 650,  room: '401', floor: 4 },
    { name: 'Aten Suite',               type: 'suite',     price: 660,  room: '402', floor: 4 },
    { name: 'Montu Suite',              type: 'suite',     price: 670,  room: '403', floor: 4 },
    { name: "Cleopatra's Royal Suite",  type: 'royal',     price: 950,  room: '404', floor: 4 },
    { name: 'Thutmose Royal Chamber',   type: 'royal',     price: 980,  room: '405', floor: 4 },
    { name: "Pharaoh's Royal Chamber",  type: 'royal',     price: 1200, room: '501', floor: 5 },
    { name: 'Ramesses Royal Chamber',   type: 'royal',     price: 1100, room: '502', floor: 5 },
    { name: 'Horizon Penthouse',        type: 'penthouse', price: 1500, room: '503', floor: 5 },
    { name: 'Nile Crown Penthouse',     type: 'penthouse', price: 1600, room: '504', floor: 5 },
    { name: 'Dynasty Penthouse',        type: 'penthouse', price: 1800, room: '505', floor: 5 },
  ] as const;

  const rooms = await Room.insertMany(roomDefs.map(r => ({
    name: r.name,
    slug: r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    type: r.type,
    categorySlug: r.type,
    pricePerNight: r.price,
    areaSqm: r.type === 'standard' ? 32 : r.type === 'deluxe' ? 48 : r.type === 'suite' ? 72 : r.type === 'royal' ? 105 : 200,
    capacity: r.type === 'penthouse' ? 4 : r.type === 'suite' ? 3 : 2,
    floorNumber: r.floor,
    roomNumber: r.room,
    description: `${r.name} — an Egyptian-themed room on floor ${r.floor}.`,
    amenities: ['King Bed', 'Smart TV', 'Wi-Fi', 'Air Conditioning', 'En-Suite Bathroom', 'Minibar'],
    images: ROOM_IMAGES[r.type as keyof typeof ROOM_IMAGES] ?? ROOM_IMAGES.standard,
    isAvailable: true,
    qrToken: generateQRToken(),
  })));

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  await Promise.all(rooms.map(async room => {
    const qrCodeUrl = await generateQRDataUrl(room.qrToken, clientUrl);
    await Room.findByIdAndUpdate(room._id, { qrCodeUrl });
  }));
  console.log(`✅ ${rooms.length} rooms`);

  // ── 5. Menu items ─────────────────────────────────────────────────────────
  const menuItems = await MenuItem.insertMany([
    { name: 'Egyptian Ful Medames',        description: 'Slow-cooked fava beans with olive oil, cumin and lemon.',                            category: 'breakfast', price: 18, image: FOOD_IMAGES.breakfast, preparationTime: 15, isVeg: true  },
    { name: 'Royal Breakfast Platter',     description: 'Scrambled eggs, smoked salmon, fresh fruit and assorted pastries.',                   category: 'breakfast', price: 35, image: FOOD_IMAGES.breakfast, preparationTime: 20, isVeg: false },
    { name: "Pharaoh's Shakshuka",         description: 'Poached eggs in spiced tomato and harissa sauce with feta cheese.',                   category: 'breakfast', price: 22, image: FOOD_IMAGES.breakfast, preparationTime: 18, isVeg: true  },
    { name: 'Continental Spread',          description: 'Selection of breads, pastries, cold cuts, cheese, and fresh fruit.',                  category: 'breakfast', price: 28, image: FOOD_IMAGES.breakfast, preparationTime: 10, isVeg: true  },
    { name: 'Grilled Sea Bass Nile Style', description: 'Whole sea bass grilled with Egyptian spices, saffron rice and charred vegetables.',   category: 'lunch',     price: 48, image: FOOD_IMAGES.lunch,     preparationTime: 30, isVeg: false },
    { name: 'Kofta Royal Platter',         description: 'Tender minced lamb kofta skewers with tahini sauce, tabbouleh and pita.',             category: 'lunch',     price: 42, image: FOOD_IMAGES.lunch,     preparationTime: 25, isVeg: false },
    { name: 'Lentil Soup du Pharaon',      description: 'Velvety Egyptian red lentil soup with cumin and crispy fried onions.',                category: 'lunch',     price: 16, image: FOOD_IMAGES.lunch,     preparationTime: 10, isVeg: true  },
    { name: 'Falafel & Hummus Bowl',       description: 'Crispy falafel served over creamy hummus with pickled vegetables.',                   category: 'lunch',     price: 24, image: FOOD_IMAGES.lunch,     preparationTime: 12, isVeg: true  },
    { name: "Rack of Lamb — Pharaoh's",    description: "Rack of lamb marinated in Egyptian dukkah, slow-roasted with truffle mash.",          category: 'dinner',    price: 95, image: FOOD_IMAGES.dinner,    preparationTime: 45, isVeg: false },
    { name: 'Hamam Mahshi',                description: 'Whole pigeon stuffed with freekeh grain, pine nuts and aromatic spices.',             category: 'dinner',    price: 78, image: FOOD_IMAGES.dinner,    preparationTime: 50, isVeg: false },
    { name: 'Molokhia with Chicken',       description: 'Silky jute leaf stew with tender slow-cooked chicken, the dish of Egyptian royalty.', category: 'dinner',    price: 52, image: FOOD_IMAGES.dinner,    preparationTime: 35, isVeg: false },
    { name: 'Vegetarian Tagine',           description: 'Slow-braised seasonal vegetables in aromatic Moroccan spices with couscous.',         category: 'dinner',    price: 44, image: FOOD_IMAGES.dinner,    preparationTime: 30, isVeg: true  },
    { name: 'Mezze Royal',                 description: 'Selection of hummus, baba ghanoush, tzatziki, olives and warm pita triangles.',       category: 'snacks',    price: 28, image: FOOD_IMAGES.snacks,    preparationTime: 10, isVeg: true  },
    { name: 'Truffle Falafel Bites',       description: 'Crispy golden falafel with truffle oil and tahini dipping sauce.',                    category: 'snacks',    price: 20, image: FOOD_IMAGES.snacks,    preparationTime: 12, isVeg: true  },
    { name: 'Karkade (Hibiscus Elixir)',   description: "Chilled hibiscus flower tea — Egypt's ancient royal drink, lightly sweetened.",       category: 'beverages', price: 12, image: FOOD_IMAGES.beverages, preparationTime: 5,  isVeg: true  },
    { name: 'Saffron Mint Tea',            description: 'Hot premium Egyptian mint tea infused with Kashmiri saffron strands.',                category: 'beverages', price: 14, image: FOOD_IMAGES.beverages, preparationTime: 5,  isVeg: true  },
    { name: 'Royal Gold Cocktail',         description: 'Aged whisky, honey, saffron syrup and fresh lemon.',                                  category: 'beverages', price: 22, image: FOOD_IMAGES.beverages, preparationTime: 7,  isVeg: true  },
    { name: 'Fresh Juice Selection',       description: 'Choice of orange, mango, guava or watermelon — freshly pressed.',                    category: 'beverages', price: 16, image: FOOD_IMAGES.beverages, preparationTime: 5,  isVeg: true  },
    { name: 'Umm Ali',                     description: "Egypt's beloved warm bread pudding with cream, nuts and coconut.",                    category: 'desserts',  price: 24, image: FOOD_IMAGES.desserts,  preparationTime: 20, isVeg: true  },
    { name: 'Konafa Royal',                description: 'Crispy shredded pastry filled with clotted cream and rose water sugar syrup.',        category: 'desserts',  price: 22, image: FOOD_IMAGES.desserts,  preparationTime: 15, isVeg: true  },
    { name: 'Gold Leaf Baklava',           description: 'Filo pastry with pistachio and walnut, finished with edible 24K gold leaf.',          category: 'desserts',  price: 28, image: FOOD_IMAGES.desserts,  preparationTime: 5,  isVeg: true  },
  ]);
  console.log(`✅ ${menuItems.length} menu items`);

  // ── 6. Spa services ───────────────────────────────────────────────────────
  const SLOTS_1H = [
    { startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '12:00' }, { startTime: '14:00', endTime: '15:00' },
    { startTime: '15:00', endTime: '16:00' }, { startTime: '16:00', endTime: '17:00' },
    { startTime: '17:00', endTime: '18:00' }, { startTime: '19:00', endTime: '20:00' },
  ];
  const SLOTS_90 = [
    { startTime: '09:00', endTime: '10:30' }, { startTime: '11:00', endTime: '12:30' },
    { startTime: '14:00', endTime: '15:30' }, { startTime: '16:00', endTime: '17:30' },
    { startTime: '19:00', endTime: '20:30' },
  ];
  const SLOTS_2H = [
    { startTime: '10:00', endTime: '12:00' }, { startTime: '14:00', endTime: '16:00' },
    { startTime: '17:00', endTime: '19:00' },
  ];

  const spaServices = await SpaService.insertMany([
    { name: "Cleopatra's Milk & Honey Ritual", description: 'Full-body ritual with raw honey scrub and gold-infused wrap.',  duration: 90,  price: 320, image: SPA_IMAGES[0], category: 'body_wrap',   isAvailable: true, slots: SLOTS_90 },
    { name: 'Nile Stone Hot Therapy',          description: 'Basalt stone massage along energy meridians.',                   duration: 75,  price: 240, image: SPA_IMAGES[1], category: 'massage',      isAvailable: true, slots: SLOTS_90 },
    { name: "Pharaoh's Deep Tissue Massage",   description: 'Deep-tissue massage using ancient Egyptian pressure techniques.', duration: 60,  price: 180, image: SPA_IMAGES[2], category: 'massage',      isAvailable: true, slots: SLOTS_1H },
    { name: 'Desert Rose Facial',              description: 'Rejuvenating facial with desert rose extract and 24K gold serum.',duration: 60,  price: 195, image: SPA_IMAGES[3], category: 'facial',       isAvailable: true, slots: SLOTS_1H },
    { name: 'Hydrotherapy Ritual',             description: 'Mineral pools, hydro-jet loungers, and eucalyptus steam rooms.',  duration: 90,  price: 280, image: SPA_IMAGES[4], category: 'hydrotherapy', isAvailable: true, slots: SLOTS_90 },
    { name: "Couples' Golden Journey",         description: 'Synchronized full-body massages with gold and jasmine oils.',    duration: 120, price: 680, image: SPA_IMAGES[0], category: 'couples',      isAvailable: true, slots: SLOTS_2H },
  ]);
  console.log(`✅ ${spaServices.length} spa services`);

  // ── 7. Therapists ─────────────────────────────────────────────────────────
  const therapists = await SpaTherapist.insertMany([
    { name: 'Nefertari Hassan', specializations: [spaServices[0]._id, spaServices[3]._id], breakDuration: 15, isActive: true },
    { name: 'Ramses Khalil',    specializations: [spaServices[1]._id, spaServices[2]._id], breakDuration: 15, isActive: true },
    { name: 'Isis Mostafa',     specializations: [spaServices[4]._id, spaServices[5]._id], breakDuration: 15, isActive: true },
  ]);
  console.log(`✅ ${therapists.length} spa therapists`);

  // ── 8. Ingredients ────────────────────────────────────────────────────────
  await Ingredient.insertMany([
    { name: 'Chicken Breast',  unit: 'kg',     stock: 15,  costPrice: 850,  lowStockThreshold: 3,   category: 'kitchen' },
    { name: 'Beef Tenderloin', unit: 'kg',     stock: 8,   costPrice: 1800, lowStockThreshold: 2,   category: 'kitchen' },
    { name: 'Salmon Fillet',   unit: 'kg',     stock: 6,   costPrice: 1600, lowStockThreshold: 2,   category: 'kitchen' },
    { name: 'Eggs',            unit: 'piece',  stock: 120, costPrice: 18,   lowStockThreshold: 24,  category: 'kitchen' },
    { name: 'Olive Oil',       unit: 'litre',  stock: 8,   costPrice: 900,  lowStockThreshold: 2,   category: 'kitchen' },
    { name: 'Basmati Rice',    unit: 'kg',     stock: 25,  costPrice: 180,  lowStockThreshold: 5,   category: 'kitchen' },
    { name: 'Tomatoes',        unit: 'kg',     stock: 10,  costPrice: 80,   lowStockThreshold: 3,   category: 'kitchen' },
    { name: 'Cumin',           unit: 'g',      stock: 500, costPrice: 2,    lowStockThreshold: 100, category: 'kitchen' },
    { name: 'Saffron',         unit: 'g',      stock: 50,  costPrice: 45,   lowStockThreshold: 10,  category: 'kitchen' },
    { name: 'Fava Beans',      unit: 'kg',     stock: 10,  costPrice: 120,  lowStockThreshold: 2,   category: 'kitchen' },
    { name: 'Coffee Beans',    unit: 'kg',     stock: 4,   costPrice: 1800, lowStockThreshold: 1,   category: 'bar'     },
    { name: 'Orange Juice',    unit: 'litre',  stock: 20,  costPrice: 180,  lowStockThreshold: 5,   category: 'bar'     },
    { name: 'Sparkling Water', unit: 'bottle', stock: 48,  costPrice: 120,  lowStockThreshold: 12,  category: 'bar'     },
    { name: 'Mint Leaves',     unit: 'g',      stock: 400, costPrice: 3,    lowStockThreshold: 100, category: 'bar'     },
    { name: 'Napkins',         unit: 'packet', stock: 30,  costPrice: 120,  lowStockThreshold: 5,   category: 'general' },
    { name: 'Towels (Bath)',   unit: 'piece',  stock: 80,  costPrice: 450,  lowStockThreshold: 20,  category: 'general' },
    { name: 'Hand Soap',       unit: 'bottle', stock: 35,  costPrice: 220,  lowStockThreshold: 8,   category: 'general' },
    { name: 'Bed Linen Set',   unit: 'piece',  stock: 60,  costPrice: 1200, lowStockThreshold: 10,  category: 'general' },
  ]);
  console.log('✅ 18 ingredients');

  // ─────────────────────────────────────────────────────────────────────────
  // 9. HOTEL STAYS — realistic flow from Jan 2024 to Dec 2025
  //
  //  Each stay is one of these real-world scenarios:
  //    A. Normal stay          — confirmed → checked_in → checked_out, bill paid
  //    B. Early departure      — guest leaves N days before scheduled checkout
  //    C. Extended stay        — checkout pushed forward (add nights)
  //    D. Early arrival        — arrives same day, early-check-in fee on bill
  //    E. Cancelled (flexible) — inside free window, no charge
  //    F. Cancelled (penalty)  — past free window, 1-night penalty
  //    G. No-show              — confirmed but never arrived, 1-night penalty
  //
  //  Volumes (approx):
  //    ~180 completed stays, ~25 cancellations, ~15 no-shows, ~12 early
  //    departures, ~10 extended stays, ~8 early arrivals
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🏨 Simulating 2 years of hotel stays…');

  const guestPool = [...HOTEL_GUESTS, ...HOTEL_GUESTS, ...HOTEL_GUESTS, ...HOTEL_GUESTS];
  let stayCount = 0, cancelCount = 0, noShowCount = 0;
  let earlyDeptCount = 0, extendedCount = 0, earlyArrivalCount = 0;
  const paidBillsData: { billId: mongoose.Types.ObjectId; guestId: mongoose.Types.ObjectId; amount: number; method: string; paidAt: Date }[] = [];

  // Helper to create a full completed stay (the main path)
  async function createCompletedStay(opts: {
    guestDef: typeof HOTEL_GUESTS[number];
    room: typeof rooms[number];
    checkIn: Date;
    nights: number;
    policy: 'flexible' | 'non_refundable';
    scenario: 'normal' | 'early_departure' | 'extended' | 'early_arrival';
  }) {
    const { guestDef, room, checkIn, policy, scenario } = opts;
    let nights = opts.nights;
    let actualCheckOut = addDays(checkIn, nights);
    actualCheckOut.setHours(rndInt(10, 12), 0, 0, 0);

    // Scenario adjustments
    let earlyArrivalFee = 0;
    let extendedNightsAdded = 0;
    let earlyDepartureNightsSaved = 0;

    if (scenario === 'early_arrival') {
      // Guest arrives 3–5 hours before standard 14:00 check-in
      checkIn.setHours(rndInt(9, 12), 0, 0, 0);
      earlyArrivalFee = parseFloat((room.pricePerNight * 0.3).toFixed(2)); // 30% surcharge
    }
    if (scenario === 'extended') {
      extendedNightsAdded = rndInt(1, 3);
      nights += extendedNightsAdded;
      actualCheckOut = addDays(checkIn, nights);
      actualCheckOut.setHours(rndInt(10, 12), 0, 0, 0);
    }
    if (scenario === 'early_departure') {
      earlyDepartureNightsSaved = rndInt(1, Math.max(1, nights - 1));
      const actualNights = nights - earlyDepartureNightsSaved;
      actualCheckOut = addDays(checkIn, actualNights);
      actualCheckOut.setHours(rndInt(10, 12), 0, 0, 0);
      nights = actualNights;
    }

    // Clamp to simulation window
    actualCheckOut = clampDate(actualCheckOut, SIM_START, TODAY);
    if (actualCheckOut <= checkIn) return; // degenerate — skip

    const rate = rateAtDate(actualCheckOut);
    const roomCharges = parseFloat((room.pricePerNight * nights).toFixed(2));
    const prepaidAmount = policy === 'non_refundable' ? roomCharges : 0;

    // Build reservation
    const res = await Reservation.create({
      bookingRef: bookingRef(checkIn),
      guest: { name: guestDef.name, email: guestDef.email, phone: guestDef.phone, idProof: 'passport' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: actualCheckOut,
      numberOfGuests: rndInt(1, 2),
      status: 'checked_out',
      cancellationPolicy: policy,
      totalNights: nights,
      roomCharges,
      paidUpfront: policy === 'non_refundable',
      prepaidAmount,
      guestType: guestDef.nationality,
      source: pick(['website', 'booking_com', 'agoda', 'other'] as const),
      createdAt: addDays(checkIn, -rndInt(3, 30)), // booked days before arrival
    });

    // Line items
    const lineItems: any[] = [];
    let totalAmount = 0;

    // Room charge (chargeable portion after upfront deduction)
    const chargeableRoom = parseFloat(Math.max(0, roomCharges - prepaidAmount).toFixed(2));
    lineItems.push({ type: 'room', description: `Room ${room.roomNumber} × ${nights} night${nights !== 1 ? 's' : ''}`, amount: roomCharges, date: checkIn });

    if (earlyArrivalFee > 0) {
      lineItems.push({ type: 'other', description: 'Early arrival surcharge', amount: earlyArrivalFee, date: checkIn });
    }

    // In-house food orders (during stay)
    let foodCharges = 0;
    if (Math.random() > 0.35) {
      const orderCount = rndInt(1, 4);
      for (let o = 0; o < orderCount; o++) {
        const orderItems = pickN(menuItems, rndInt(1, 4));
        const orderTotal = parseFloat(orderItems.reduce((s, m) => s + m.price, 0).toFixed(2));
        const orderDate  = addDays(checkIn, rndInt(0, nights - 1 > 0 ? nights - 1 : 0));
        foodCharges += orderTotal;
        lineItems.push({ type: 'food_order', description: `Room service — ${orderItems.map(i => i.name).slice(0, 2).join(', ')}`, amount: orderTotal, date: orderDate });
      }
    }

    // In-house spa (during stay)
    let spaCharges = 0;
    if (Math.random() > 0.55) {
      const svc = pick(spaServices as any[]);
      spaCharges = svc.price;
      lineItems.push({ type: 'spa', description: svc.name, amount: spaCharges, date: addDays(checkIn, rndInt(0, Math.max(0, nights - 1))) });
    }

    // Misc minibar / laundry charges (~20% of stays)
    let otherCharges = earlyArrivalFee;
    if (Math.random() > 0.8) {
      const misc = parseFloat(rnd(10, 80).toFixed(2));
      otherCharges += misc;
      lineItems.push({ type: 'other', description: 'Minibar & laundry', amount: misc, date: actualCheckOut });
    }

    const vatEnabled = Math.random() > 0.4;
    totalAmount = parseFloat((chargeableRoom + foodCharges + spaCharges + otherCharges).toFixed(2));
    const taxAmount = vatEnabled ? parseFloat((totalAmount * 0.13).toFixed(2)) : 0;
    const grandTotal = parseFloat((totalAmount + taxAmount).toFixed(2));
    const payMethod  = Math.random() > 0.45 ? 'stripe' : 'cash';

    const guestDoc = await Guest.create({
      reservation: res._id,
      room: room._id,
      name: guestDef.name, email: guestDef.email, phone: guestDef.phone,
      nationality: guestDef.nationality,
      checkInTime:  checkIn,
      checkOutTime: actualCheckOut,
      qrSessionToken:  generateQRToken(),
      qrSessionExpiry: addDays(checkIn, 14),
      isActive: false,
    });

    const bill = await Bill.create({
      guest: guestDoc._id,
      reservation: res._id,
      lineItems,
      roomCharges,
      foodCharges:  parseFloat(foodCharges.toFixed(2)),
      spaCharges:   parseFloat(spaCharges.toFixed(2)),
      otherCharges: parseFloat(otherCharges.toFixed(2)),
      totalAmount,
      taxAmount,
      grandTotal,
      vatEnabled,
      prepaidAmount,
      status: 'paid',
      paidAt: actualCheckOut,
      paymentMethod: payMethod,
      exchangeRateAtPayment: rate,
    });

    await Guest.findByIdAndUpdate(guestDoc._id, { bill: bill._id });
    paidBillsData.push({ billId: bill._id, guestId: guestDoc._id, amount: grandTotal, method: payMethod, paidAt: actualCheckOut });
    stayCount++;

    return { guestDoc, bill, res };
  }

  // Helper to create a cancelled reservation
  async function createCancelledReservation(opts: {
    guestDef: typeof HOTEL_GUESTS[number];
    room: typeof rooms[number];
    checkIn: Date;
    nights: number;
    policy: 'flexible' | 'non_refundable';
    withPenalty: boolean;
  }) {
    const { guestDef, room, checkIn, nights, policy, withPenalty } = opts;
    const cancelledAt = addDays(checkIn, withPenalty ? -1 : -rndInt(5, 30));
    const penaltyCharged = withPenalty ? parseFloat(room.pricePerNight.toFixed(2)) : 0;

    await Reservation.create({
      bookingRef: bookingRef(checkIn),
      guest: { name: guestDef.name, email: guestDef.email, phone: guestDef.phone, idProof: 'passport' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: addDays(checkIn, nights),
      numberOfGuests: 1,
      status: 'cancelled',
      cancellationPolicy: policy,
      totalNights: nights,
      roomCharges: room.pricePerNight * nights,
      guestType: guestDef.nationality,
      source: pick(['website', 'booking_com', 'agoda', 'other'] as const),
      cancelledAt,
      penaltyCharged,
      createdAt: addDays(checkIn, -rndInt(7, 45)),
    });
    cancelCount++;
  }

  // Helper to create a no-show
  async function createNoShow(opts: {
    guestDef: typeof HOTEL_GUESTS[number];
    room: typeof rooms[number];
    checkIn: Date;
    nights: number;
  }) {
    const { guestDef, room, checkIn, nights } = opts;
    const penalty = parseFloat(room.pricePerNight.toFixed(2));

    await Reservation.create({
      bookingRef: bookingRef(checkIn),
      guest: { name: guestDef.name, email: guestDef.email, phone: guestDef.phone, idProof: 'passport' },
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: addDays(checkIn, nights),
      numberOfGuests: 1,
      status: 'no_show',
      cancellationPolicy: 'flexible',
      totalNights: nights,
      roomCharges: room.pricePerNight * nights,
      guestType: guestDef.nationality,
      source: pick(['website', 'booking_com', 'agoda'] as const),
      penaltyCharged: penalty,
      createdAt: addDays(checkIn, -rndInt(3, 20)),
    });
    noShowCount++;
  }

  // ── Generate 2 years of stays month by month ──────────────────────────────
  // Jan 2024 → Dec 2025 = 24 months
  // Each month: 7–12 completed stays + occasional edge cases

  const MONTHS: { year: number; month: number }[] = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      // Skip future months beyond today
      const monthStart = new Date(y, m - 1, 1);
      if (monthStart > TODAY) break;
      MONTHS.push({ year: y, month: m });
    }
  }

  // Seasonal occupancy multiplier — higher in tourist season (Oct–Dec, Mar–May)
  function occupancyMultiplier(month: number): number {
    if ([3, 4, 5, 10, 11, 12].includes(month)) return 1.4;  // peak
    if ([6, 7, 8].includes(month))              return 0.8;  // low
    return 1.0;                                               // shoulder
  }

  for (const { year, month } of MONTHS) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0); // last day of month
    const mul = occupancyMultiplier(month);
    const staysThisMonth = Math.round(rndInt(7, 12) * mul);

    for (let i = 0; i < staysThisMonth; i++) {
      const checkIn = randBetween(monthStart, monthEnd);
      if (checkIn >= TODAY) continue; // don't create future completed stays

      const nights  = rndInt(1, 7);
      const room    = pick(rooms);
      const guestDef = pick(guestPool);
      const policy  = Math.random() > 0.35 ? 'flexible' : 'non_refundable';

      // Roll scenario probabilities
      const roll = Math.random();
      if (roll < 0.07) {
        // ~7% cancelled (free window)
        await createCancelledReservation({ guestDef, room, checkIn, nights, policy, withPenalty: false });
      } else if (roll < 0.12) {
        // ~5% cancelled with penalty (late cancel)
        await createCancelledReservation({ guestDef, room, checkIn, nights, policy, withPenalty: true });
        cancelCount++; // already counted inside but penalty variant
      } else if (roll < 0.17) {
        // ~5% no-show
        await createNoShow({ guestDef, room, checkIn, nights });
      } else if (roll < 0.22 && nights >= 3) {
        // ~5% early departure (only meaningful for 3+ night stays)
        await createCompletedStay({ guestDef, room, checkIn, nights, policy, scenario: 'early_departure' });
        earlyDeptCount++;
      } else if (roll < 0.27 && nights <= 5) {
        // ~5% extended stay
        await createCompletedStay({ guestDef, room, checkIn, nights, policy, scenario: 'extended' });
        extendedCount++;
      } else if (roll < 0.31) {
        // ~4% early arrival
        await createCompletedStay({ guestDef, room, checkIn, nights, policy, scenario: 'early_arrival' });
        earlyArrivalCount++;
      } else {
        // ~69% normal completed stay
        await createCompletedStay({ guestDef, room, checkIn, nights, policy, scenario: 'normal' });
      }
    }
  }

  // Payment records for all paid bills
  if (paidBillsData.length > 0) {
    await Payment.insertMany(paidBillsData.map(p => ({
      bill: p.billId, guest: p.guestId, amount: p.amount,
      method: p.method, status: 'succeeded', createdAt: p.paidAt,
    })));
  }

  console.log(`✅ ${stayCount} completed stays (includes ${earlyDeptCount} early departures, ${extendedCount} extended, ${earlyArrivalCount} early arrivals)`);
  console.log(`✅ ${cancelCount} cancellations`);
  console.log(`✅ ${noShowCount} no-shows`);

  // ── 10. Live checked-in guests (6 currently staying for dashboard) ─────────
  console.log('\n🔴 Creating 6 live checked-in guests…');
  const liveGuestDefs = pickN(HOTEL_GUESTS, 6);
  const liveRooms     = pickN(rooms, 6);
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  let liveCount = 0;

  for (let i = 0; i < 6; i++) {
    const gd = liveGuestDefs[i];
    const rm = liveRooms[i];
    const checkIn  = daysAgo(rndInt(1, 4));
    const checkOut = addDays(today0, rndInt(1, 5));
    const nights   = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);

    const res = await Reservation.create({
      bookingRef: bookingRef(checkIn),
      guest: { name: gd.name, email: gd.email, phone: gd.phone, idProof: 'passport' },
      room: rm._id,
      checkInDate: checkIn, checkOutDate: checkOut,
      numberOfGuests: 1, status: 'checked_in',
      cancellationPolicy: 'flexible',
      totalNights: nights,
      roomCharges: rm.pricePerNight * nights,
      guestType: gd.nationality, source: 'website',
    });

    const tmpGuestId = new mongoose.Types.ObjectId();
    const bill = await Bill.create({
      guest: tmpGuestId, reservation: res._id,
      lineItems: [{ type: 'room', description: `Room ${rm.roomNumber}`, amount: rm.pricePerNight, date: checkIn }],
      roomCharges: rm.pricePerNight, foodCharges: 0, spaCharges: 0, otherCharges: 0,
      totalAmount: rm.pricePerNight, taxAmount: 0, grandTotal: rm.pricePerNight,
      vatEnabled: Math.random() > 0.5, status: 'open',
    });

    const guestDoc = await Guest.create({
      reservation: res._id, room: rm._id,
      name: gd.name, email: gd.email, phone: gd.phone,
      nationality: gd.nationality,
      checkInTime: checkIn,
      qrSessionToken: generateQRToken(),
      qrSessionExpiry: addDays(today0, 7),
      isActive: true, bill: bill._id,
    });

    await Bill.findByIdAndUpdate(bill._id, { guest: guestDoc._id });
    await Room.findByIdAndUpdate(rm._id, { isAvailable: false });
    liveCount++;
  }
  console.log(`✅ ${liveCount} live guests checked in`);

  // ─────────────────────────────────────────────────────────────────────────
  // 11. WALK-IN FOOD ORDERS — 2 years, week by week
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🍽️  Simulating 2 years of food orders…');

  const totalWeeks = MONTHS.length * 4; // approx 4 weeks/month
  let walkInFoodCount = 0;
  let inHouseFoodCount = 0;

  // Walk-in dine-in customers (~6–14/week, seasonal)
  for (let weekIdx = 0; weekIdx < totalWeeks; weekIdx++) {
    const weekStartMs = SIM_START.getTime() + weekIdx * 7 * 86400000;
    const weekStart   = new Date(weekStartMs);
    if (weekStart > TODAY) break;

    const month = weekStart.getMonth() + 1;
    const mul   = occupancyMultiplier(month);
    const cnt   = Math.round(rndInt(6, 14) * mul);

    for (let j = 0; j < cnt; j++) {
      const orderDate = randBetween(weekStart, addDays(weekStart, 6));
      if (orderDate > TODAY) continue;

      const isNepali = Math.random() > 0.55;
      const custName = isNepali ? pick(WALKIN_NAMES_NEPALI) : pick(WALKIN_NAMES_FOREIGN);

      const wic = await WalkInCustomer.create({
        name: custName,
        phone: isNepali ? `+977-98${rndInt(10000000, 99999999)}` : `+1-555${rndInt(1000000, 9999999)}`,
        type: 'dine_in',
        nationality: isNepali ? 'nepali' : 'foreign',
        createdBy: adminId,
        createdAt: orderDate,
      });

      const items       = pickN(menuItems, rndInt(1, 5));
      const totalAmount = parseFloat(items.reduce((s, m) => s + m.price, 0).toFixed(2));
      const deliveredAt = new Date(orderDate.getTime() + rndInt(15, 50) * 60000);

      // Small chance order was cancelled before being accepted
      const cancelled = Math.random() < 0.06;
      await Order.create({
        walkInCustomer: wic._id,
        items: items.map(m => ({ menuItem: m._id, quantity: 1, unitPrice: m.price, specialInstructions: '' })),
        status: cancelled ? 'cancelled' : 'delivered',
        totalAmount,
        orderPaymentMethod: 'cash',
        isAdminOrder: false,
        addedToBill: false,
        placedAt: orderDate,
        deliveredAt: cancelled ? undefined : deliveredAt,
        cancelReason: cancelled ? 'Customer left before order was ready' : '',
        notes: '',
        createdAt: orderDate,
        updatedAt: cancelled ? orderDate : deliveredAt,
      });
      walkInFoodCount++;
    }

    // In-house hotel guest room-service orders (~2–5/week)
    const inHouseCnt = rndInt(2, 5);
    for (let j = 0; j < inHouseCnt; j++) {
      const orderDate = randBetween(weekStart, addDays(weekStart, 6));
      if (orderDate > TODAY) continue;

      const rm      = pick(rooms);
      const items   = pickN(menuItems, rndInt(1, 4));
      const total   = parseFloat(items.reduce((s, m) => s + m.price, 0).toFixed(2));
      const delAt   = new Date(orderDate.getTime() + rndInt(20, 60) * 60000);

      await Order.create({
        room: rm._id,
        items: items.map(m => ({ menuItem: m._id, quantity: 1, unitPrice: m.price, specialInstructions: '' })),
        status: 'delivered',
        totalAmount: total,
        orderPaymentMethod: 'cash',
        isAdminOrder: false,
        addedToBill: false,
        placedAt: orderDate,
        deliveredAt: delAt,
        notes: '', cancelReason: '',
        createdAt: orderDate,
        updatedAt: delAt,
      });
      inHouseFoodCount++;
    }
  }
  console.log(`✅ ${walkInFoodCount} walk-in food orders (incl. ~6% cancelled)`);
  console.log(`✅ ${inHouseFoodCount} in-house cash food orders`);

  // ─────────────────────────────────────────────────────────────────────────
  // 12. SPA BOOKINGS — 2 years, walk-in + in-house
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n💆 Simulating 2 years of spa bookings…');

  const therapistList = therapists as any[];
  let walkInSpaCount  = 0;
  let inHouseSpaCount = 0;

  for (let weekIdx = 0; weekIdx < totalWeeks; weekIdx++) {
    const weekStartMs = SIM_START.getTime() + weekIdx * 7 * 86400000;
    const weekStart   = new Date(weekStartMs);
    if (weekStart > TODAY) break;

    const month = weekStart.getMonth() + 1;
    const mul   = occupancyMultiplier(month);

    // Walk-in spa (~3–8/week)
    const walkInCnt = Math.round(rndInt(3, 8) * mul);
    for (let j = 0; j < walkInCnt; j++) {
      const bookDate = randBetween(weekStart, addDays(weekStart, 6));
      if (bookDate > TODAY) continue;

      const isNepali = Math.random() > 0.6;
      const custName = isNepali ? pick(WALKIN_NAMES_NEPALI) : pick(WALKIN_NAMES_FOREIGN);
      const svc      = pick(spaServices as any[]);
      const therapist = pick(therapistList);

      const wic = await WalkInCustomer.create({
        name: custName,
        phone: isNepali ? `+977-98${rndInt(10000000, 99999999)}` : `+44-700${rndInt(1000000, 9999999)}`,
        type: 'spa',
        nationality: isNepali ? 'nepali' : 'foreign',
        createdBy: adminId,
        createdAt: bookDate,
      });

      const startHour      = rndInt(9, 18);
      const scheduledStart = `${String(startHour).padStart(2, '0')}:00`;
      const endH           = startHour + Math.ceil(svc.duration / 60);
      const scheduledEnd   = `${String(endH).padStart(2, '0')}:${String(svc.duration % 60).padStart(2, '0')}`;

      // ~8% spa walk-in cancellations
      const cancelled = Math.random() < 0.08;
      await SpaBooking.create({
        walkInCustomer: wic._id,
        service: svc._id,
        therapist: therapist._id,
        date: bookDate,
        scheduledStart, scheduledEnd,
        actualStart: cancelled ? undefined : scheduledStart,
        actualEnd:   cancelled ? undefined : scheduledEnd,
        durationSnapshot: svc.duration,
        window: 'any',
        status: cancelled ? 'cancelled' : 'completed',
        spaPaymentMethod: 'cash',
        price: svc.price,
        addedToBill: false,
        isWalkIn: true,
        createdAt: bookDate,
        updatedAt: bookDate,
      });
      walkInSpaCount++;
    }

    // In-house hotel guest spa (~2–4/week)
    const inHouseCnt = Math.round(rndInt(2, 4) * mul);
    for (let j = 0; j < inHouseCnt; j++) {
      const bookDate = randBetween(weekStart, addDays(weekStart, 6));
      if (bookDate > TODAY) continue;

      const svc       = pick(spaServices as any[]);
      const therapist = pick(therapistList);
      const guestDef  = pick(HOTEL_GUESTS);

      const startHour      = rndInt(9, 18);
      const scheduledStart = `${String(startHour).padStart(2, '0')}:00`;
      const endH           = startHour + Math.ceil(svc.duration / 60);
      const scheduledEnd   = `${String(endH).padStart(2, '0')}:${String(svc.duration % 60).padStart(2, '0')}`;

      const uniqueEmail = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}@sim-spa.com`;
      const stubRoom    = pick(rooms);
      const stubRes     = await Reservation.create({
        bookingRef: bookingRef(bookDate),
        guest: { name: guestDef.name, email: uniqueEmail, phone: guestDef.phone, idProof: 'passport' },
        room: stubRoom._id,
        checkInDate: bookDate, checkOutDate: addDays(bookDate, 2),
        numberOfGuests: 1, status: 'checked_out', cancellationPolicy: 'flexible',
        totalNights: 2, roomCharges: 0,
        guestType: guestDef.nationality, source: 'website',
      });
      const stubGuest = await Guest.create({
        reservation: stubRes._id, room: stubRoom._id,
        name: guestDef.name, email: uniqueEmail, phone: guestDef.phone,
        nationality: guestDef.nationality,
        checkInTime: bookDate, checkOutTime: addDays(bookDate, 2),
        qrSessionToken: generateQRToken(), qrSessionExpiry: addDays(bookDate, 14),
        isActive: false,
      });

      await SpaBooking.create({
        guest: stubGuest._id,
        service: svc._id, therapist: therapist._id,
        date: bookDate,
        scheduledStart, scheduledEnd,
        actualStart: scheduledStart, actualEnd: scheduledEnd,
        durationSnapshot: svc.duration, window: 'any',
        status: 'completed',
        spaPaymentMethod: 'cash',
        price: svc.price, addedToBill: false, isWalkIn: false,
        createdAt: bookDate, updatedAt: bookDate,
      });
      inHouseSpaCount++;
    }
  }
  console.log(`✅ ${walkInSpaCount} walk-in spa bookings (incl. ~8% cancelled)`);
  console.log(`✅ ${inHouseSpaCount} in-house spa bookings`);

  // ─────────────────────────────────────────────────────────────────────────
  // 13. PETTY CASH — 2 years, ~3–5 expenses/week
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n💵 Simulating 2 years of petty cash expenses…');
  let pcCount = 0;

  for (let weekIdx = 0; weekIdx < totalWeeks; weekIdx++) {
    const weekStartMs = SIM_START.getTime() + weekIdx * 7 * 86400000;
    const weekStart   = new Date(weekStartMs);
    if (weekStart > TODAY) break;

    const cnt = rndInt(3, 6);
    for (let j = 0; j < cnt; j++) {
      const expDate     = randBetween(weekStart, addDays(weekStart, 6));
      if (expDate > TODAY) continue;

      const vendor      = pick(PETTY_CASH_VENDORS);
      const cashAmount  = parseFloat(rnd(10, 200).toFixed(2));

      await StockLog.create({
        type: 'petty_cash_purchase',
        purchasedBy: pick(PETTY_CASH_STAFF),
        vendor: vendor.vendor,
        note: vendor.items,
        lines: [],
        cashAmount,
        createdAt: expDate,
        updatedAt: expDate,
      });
      pcCount++;
    }
  }
  console.log(`✅ ${pcCount} petty cash expenses`);

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Ensure admin users exist
  // ─────────────────────────────────────────────────────────────────────────
  const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
  if (!existingSuperAdmin) {
    await User.create({ name: 'Royal Super Admin', email: 'superadmin@royalsuites.com', password: 'RoyalAdmin@123', role: 'super_admin', department: null });
    console.log('\n✅ Super admin created');
  }
  for (const u of [
    { name: 'Food & Bar Manager', email: 'food@royalsuites.com',     password: 'Food@1234',     department: 'food'       },
    { name: 'Spa Manager',        email: 'spa@royalsuites.com',       password: 'Spa@12345',     department: 'spa'        },
    { name: 'Front Desk Manager', email: 'frontdesk@royalsuites.com', password: 'FrontDesk@123', department: 'front_desk' },
  ]) {
    if (!(await User.findOne({ email: u.email }))) {
      await User.create({ ...u, role: 'admin' });
      console.log(`✅ ${u.department} admin created`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  const totalHotelEvents = stayCount + cancelCount + noShowCount;
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('🏰 2-YEAR SIMULATION COMPLETE  (Jan 2024 → Dec 2025)');
  console.log('──────────────────────────────────────────────────────────────────');
  console.log(`  Completed stays:              ${stayCount}`);
  console.log(`    ↳ Normal check-out:         ${stayCount - earlyDeptCount - extendedCount - earlyArrivalCount}`);
  console.log(`    ↳ Early departures:         ${earlyDeptCount}`);
  console.log(`    ↳ Extended stays:           ${extendedCount}`);
  console.log(`    ↳ Early arrivals:           ${earlyArrivalCount}`);
  console.log(`  Cancellations:                ${cancelCount}`);
  console.log(`  No-shows:                     ${noShowCount}`);
  console.log(`  Total hotel events:           ${totalHotelEvents}`);
  console.log(`  Live checked-in guests:       ${liveCount}`);
  console.log(`──────────────────────────────────────────────────────────────────`);
  console.log(`  Walk-in food orders:          ${walkInFoodCount}`);
  console.log(`  In-house food orders:         ${inHouseFoodCount}`);
  console.log(`  Walk-in spa bookings:         ${walkInSpaCount}`);
  console.log(`  In-house spa bookings:        ${inHouseSpaCount}`);
  console.log(`  Petty cash expenses:          ${pcCount}`);
  console.log(`──────────────────────────────────────────────────────────────────`);
  console.log(`  Exchange rate bands used:     ${RATE_BANDS.length}  (Rs.128 → 142 NPR/USD)`);
  console.log(`  Nationalities simulated:      10 (NP,IN,CN,US,GB,DE,JP,AU,AE,FR,KR,IT,CA,ES)`);
  console.log(`──────────────────────────────────────────────────────────────────`);
  console.log('  Login: superadmin@royalsuites.com / RoyalAdmin@123');
  console.log('══════════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Simulation seed failed:', err);
  process.exit(1);
});
