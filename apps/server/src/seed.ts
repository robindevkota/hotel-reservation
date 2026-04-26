import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import Room from './models/Room';
import RoomCategory from './models/RoomCategory';
import MenuItem from './models/MenuItem';
import SpaService from './models/SpaService';
import SpaTherapist from './models/SpaTherapist';
import SpaBooking from './models/SpaBooking';
import Guest from './models/Guest';
import Bill from './models/Bill';
import Order from './models/Order';
import Reservation from './models/Reservation';
import User from './models/User';
import Ingredient from './models/Ingredient';
import Review from './models/Review';
import { generateQRToken, generateQRDataUrl } from './utils/generateQR';

// ─── Image assets ────────────────────────────────────────────────────────────
const ROOM_IMAGES = {
  royal:    ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200','https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1200','https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200'],
  suite:    ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200','https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200'],
  deluxe:   ['https://images.unsplash.com/photo-1587985064135-0366536eab42?w=1200','https://images.unsplash.com/photo-1560185127-6a47d4e4d88b?w=1200'],
  standard: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200','https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=1200'],
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function bookingRef() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  return `RS-${d}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}
function addMin(hhmm: string, mins: number) {
  const [h,m] = hhmm.split(':').map(Number);
  const t = h*60 + m + mins;
  return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}

// ─── Guest name pool ──────────────────────────────────────────────────────────
const GUEST_NAMES = [
  'Amira Hassan','Omar Farouk','Layla Nour','Khaled Ali','Nadia Saleh',
  'Youssef Gamal','Fatima Nasser','Ibrahim Mansour','Sara El-Din','Adel Rashid',
  'Mona Faris','Hassan Zaki','Dina Kamal','Tarek Fouad','Rania Saber',
  'Ahmed Mostafa','Mariam Khalil','Sami Lotfi','Heba Shawki','Wael Badawi',
  'Rana Samir','Magdy Amin','Noha Barakat','Sherif Osman','Dalia Ragab',
  'Mohamed Anwar','Ghada Hamdy','Karim Helmy','Iman Gouda','Bassem Tawfik',
  'Yasmin Sobhi','Fady Aziz','Lamia Naguib','Tarek Mansour','Nour El-Sharif',
  'Ali Zidan','Samar Abdel','Ramy Fawzy','Lobna Selim','Hisham Kamal',
  'Sandra Marcus','James Whitfield','Emma Laurent','Luca Rossi','Sofia Andersen',
  'Carlos Vega','Priya Sharma','Wei Zhang','Elena Popova','Kenji Tanaka',
  'Fatou Diallo','Diego Hernandez','Maria Costa','Henrik Borg','Aisha Patel',
  'Chloe Martin','David Okonkwo','Laura Schmidt','Pavel Novak','Yuki Hayashi',
];

// ─── Feedback pools ───────────────────────────────────────────────────────────
const ROOM_FB_POS = [
  'Absolutely stunning room — the gold accents and hieroglyphic décor made us feel like royalty.',
  'Immaculate room, turned down every evening with fresh petals. Exceeded all expectations.',
  'The private terrace view was breathtaking. Woke up to the most beautiful sunrise.',
  'Best hotel room I have ever stayed in. The marble bathroom alone is worth the price.',
  'Hands down the finest hotel in the region. Every detail is thoughtfully curated.',
  'The suite was enormous and beautifully decorated. Pillows were incredibly soft.',
  'Staff noticed our anniversary and set up champagne and flowers without being asked. Magical.',
  'Room service was lightning-fast and the food arrived piping hot every single time.',
  'The Egyptian-themed décor is authentic and tasteful — never kitschy. Loved every corner.',
  'Bed was the most comfortable I have slept in. Woke up completely refreshed.',
];
const ROOM_FB_MID = [
  'Room was comfortable but the view was of the car park rather than the city.',
  'Good room overall. Minor issue with the AC remote but staff fixed it quickly.',
  'Nice room but we expected more natural light for the price point.',
  'Comfortable stay. The room could benefit from a few more power outlets.',
  'Pleasant enough but the hallway noise was audible late at night.',
  'Room was clean and well-stocked. Housekeeping was a little slow one morning.',
  'Decent room for the price. The minibar selection was limited though.',
];
const ROOM_FB_NEG = [
  'The room had a musty smell and shower pressure was very low — never resolved.',
  'Found a hair in the bathroom on arrival. Cleanliness standards were disappointing.',
  'Air conditioning broke on night two. The replacement room was smaller than booked.',
  'The walls are paper-thin — heard every conversation from the next room.',
  'Far too noisy for a luxury hotel. Construction work started at 7am every day.',
  'Room looked nothing like the photos. Very misleading marketing.',
];
const FOOD_FB_POS = [
  'The Rack of Lamb was transcendent. Every dish arrived beautifully presented.',
  'Best hotel dining I have experienced in years. The Karkade hibiscus drink is divine.',
  "Umm Ali dessert was heavenly — warm, creamy, perfectly spiced. I ordered it twice.",
  'Breakfast spread was extraordinary. Fresh pastries, mezze, and cooked-to-order eggs.',
  'Chef Ibrahim is a genius. The Molokhia was like my grandmother used to make.',
  'Room service arrived in under 20 minutes with food that was still hot. Impressive.',
  'The tasting menu is worth every penny. We lingered at the table for three hours.',
];
const FOOD_FB_MID = [
  'Good variety but the menu is too limited for a longer stay. Needs more options.',
  'Food quality was good but room service took 45 minutes on a quiet evening.',
  'Breakfast buffet could have more local options. The international selection dominates.',
  'The food was decent — not outstanding. Expected more creativity for the price.',
  'Some dishes were exceptional, others merely average. Inconsistent across the week.',
];
const FOOD_FB_NEG = [
  'Room service took 55 minutes for a simple order. Food was cold on arrival.',
  'The Kofta was overcooked and dry. Completely different from what the menu promised.',
  'Ordered the sea bass — arrived undercooked and we had to send it back twice.',
  'Prices are astronomical for the quality delivered. Very disappointed.',
  'Staff forgot half our order and the replacement took another 30 minutes.',
];
const SPA_FB_POS = [
  "Cleopatra's Ritual was a once-in-a-lifetime experience. Nefertari's hands are pure magic.",
  'The hydrotherapy circuit is extraordinary — mineral pools, steam room, jet loungers. Perfect.',
  'Best massage I have ever had. Left feeling completely renewed and tension-free.',
  'The couples golden journey was incredibly romantic. Every detail was perfectly arranged.',
  'Desert Rose Facial left my skin glowing for days. Highly recommend to everyone.',
  'Therapist was professional, intuitive, and deeply knowledgeable. A true expert.',
  'The spa ambiance is incredible — candlelit, scented with oud and jasmine. Perfection.',
];
const SPA_FB_MID = [
  'Spa session was good but the room temperature was slightly too warm for comfort.',
  'Great therapist but the background music was oddly loud during the massage.',
  'Deep tissue massage was effective but the pre-session consultation felt rushed.',
  'Nice spa overall. The waiting area could be more relaxing — too many people.',
  'Good treatment but it ran 15 minutes short of the advertised duration.',
];
const SPA_FB_NEG = [
  'Had to wait 20 minutes past my appointment time with no explanation or apology.',
  'The therapist seemed distracted and the pressure was inconsistent throughout.',
  'The steam room was out of order and nobody told us before the session began.',
  'Products used smelled strongly synthetic — nothing like the natural ingredients listed.',
];

function roomFb(rating: number): string {
  if (rating >= 4) return pick(ROOM_FB_POS);
  if (rating === 3) return pick(ROOM_FB_MID);
  return pick(ROOM_FB_NEG);
}
function foodFb(rating: number): string {
  if (rating >= 4) return pick(FOOD_FB_POS);
  if (rating === 3) return pick(FOOD_FB_MID);
  return pick(FOOD_FB_NEG);
}
function spaFb(rating: number): string {
  if (rating >= 4) return pick(SPA_FB_POS);
  if (rating === 3) return pick(SPA_FB_MID);
  return pick(SPA_FB_NEG);
}

// ─── Weighted random rating: skewed towards higher ratings (realistic hotel) ─
function weightedRating(): number {
  const roll = Math.random();
  if (roll < 0.05) return 1;
  if (roll < 0.12) return 2;
  if (roll < 0.25) return 3;
  if (roll < 0.55) return 4;
  return 5;
}

async function seed() {
  await connectDB();
  console.log('🌱 Seeding 2-year simulation database...');

  // ─── CLEAR ALL DATA ───────────────────────────────────────────────────────
  await Promise.all([
    Room.deleteMany({}),
    RoomCategory.deleteMany({}),
    MenuItem.deleteMany({}),
    SpaService.deleteMany({}),
    SpaTherapist.deleteMany({}),
    SpaBooking.deleteMany({}),
    Review.deleteMany({}),
    Guest.deleteMany({}),
    Reservation.deleteMany({}),
    Bill.deleteMany({}),
    Ingredient.deleteMany({}),
    // Orders model — delete if it exists
    ...(Order ? [Order.deleteMany({})] : []),
  ]);
  console.log('🗑️  All data cleared');

  // ─── ROOM CATEGORIES ──────────────────────────────────────────────────────
  const categories = await RoomCategory.insertMany([
    { name: 'Standard',  slug: 'standard',  icon: 'Bed',      basePrice: 200,  description: 'Comfortable rooms with all essential amenities.' },
    { name: 'Deluxe',    slug: 'deluxe',    icon: 'Star',     basePrice: 360,  description: 'Spacious rooms with premium furnishings and enhanced amenities.' },
    { name: 'Suite',     slug: 'suite',     icon: 'Gem',      basePrice: 580,  description: 'Luxurious suites with separate living areas and panoramic views.' },
    { name: 'Royal',     slug: 'royal',     icon: 'Crown',    basePrice: 950,  description: 'The pinnacle of Egyptian luxury.' },
    { name: 'Penthouse', slug: 'penthouse', icon: 'Sparkles', basePrice: 1500, description: 'Exclusive top-floor retreats with private terraces.' },
  ]);
  console.log(`✅ ${categories.length} room categories seeded`);

  // ─── ROOMS (28 rooms) ─────────────────────────────────────────────────────
  const rooms = await Room.insertMany([
    // Floor 1 — 4 Standard, 2 Deluxe
    { name:'Isis Standard Room',      slug:'isis-standard-room',      type:'standard', categorySlug:'standard', pricePerNight:200, areaSqm:30, capacity:2, floorNumber:1, roomNumber:'101', description:'Blessed by the goddess of home. A well-appointed standard room.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Work Desk','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Ra Standard Room',        slug:'ra-standard-room',        type:'standard', categorySlug:'standard', pricePerNight:200, areaSqm:30, capacity:2, floorNumber:1, roomNumber:'102', description:'Rise with Ra in this sunlit standard room.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Air Conditioning','Wi-Fi','Daily Housekeeping'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Thoth Standard Room',     slug:'thoth-standard-room',     type:'standard', categorySlug:'standard', pricePerNight:210, areaSqm:31, capacity:2, floorNumber:1, roomNumber:'103', description:'Named after the god of wisdom.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Work Desk','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Bastet Standard Room',    slug:'bastet-standard-room',    type:'standard', categorySlug:'standard', pricePerNight:210, areaSqm:32, capacity:2, floorNumber:1, roomNumber:'104', description:'Graced by the goddess of protection.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Horus Deluxe Room',       slug:'horus-deluxe-room',       type:'deluxe',   categorySlug:'deluxe',   pricePerNight:360, areaSqm:45, capacity:2, floorNumber:1, roomNumber:'105', description:'Floor-to-ceiling windows and marble bathroom.', amenities:['Queen Bed','Marble Bathroom','Floor-to-Ceiling Windows','Minibar','Smart TV','Safe','Hair Dryer'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Anubis Deluxe Room',      slug:'anubis-deluxe-room',      type:'deluxe',   categorySlug:'deluxe',   pricePerNight:380, areaSqm:48, capacity:2, floorNumber:1, roomNumber:'106', description:'Guardian of luxury. Hand-carved furnishings.', amenities:['Queen Bed','Rain Shower','City View','Minibar','Smart TV','Work Desk','Premium Toiletries'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    // Floor 2 — 4 Standard, 2 Deluxe
    { name:'Sekhmet Standard Room',   slug:'sekhmet-standard-room',   type:'standard', categorySlug:'standard', pricePerNight:215, areaSqm:31, capacity:2, floorNumber:2, roomNumber:'201', description:'Named after the warrior goddess.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Work Desk','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Nut Standard Room',       slug:'nut-standard-room',       type:'standard', categorySlug:'standard', pricePerNight:215, areaSqm:31, capacity:2, floorNumber:2, roomNumber:'202', description:'Canopied by the sky goddess.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Air Conditioning','Wi-Fi','Daily Housekeeping'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Geb Standard Room',       slug:'geb-standard-room',       type:'standard', categorySlug:'standard', pricePerNight:220, areaSqm:32, capacity:2, floorNumber:2, roomNumber:'203', description:"Grounded in the earth god's stability.", amenities:['Double Bed','En-Suite Bathroom','Smart TV','Work Desk','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Hathor Standard Room',    slug:'hathor-standard-room',    type:'standard', categorySlug:'standard', pricePerNight:220, areaSqm:33, capacity:2, floorNumber:2, roomNumber:'204', description:'Blessed by the goddess of love and music.', amenities:['Double Bed','En-Suite Bathroom','Smart TV','Air Conditioning','Wi-Fi','Hair Dryer'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Seth Deluxe Room',        slug:'seth-deluxe-room',        type:'deluxe',   categorySlug:'deluxe',   pricePerNight:370, areaSqm:46, capacity:2, floorNumber:2, roomNumber:'205', description:'Bold design with premium materials and city views.', amenities:['Queen Bed','Rain Shower','City View','Minibar','Smart TV','Work Desk','Premium Toiletries','Safe'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Nephthys Deluxe Room',    slug:'nephthys-deluxe-room',    type:'deluxe',   categorySlug:'deluxe',   pricePerNight:375, areaSqm:47, capacity:2, floorNumber:2, roomNumber:'206', description:'Protected by the goddess of the night.', amenities:['Queen Bed','Marble Bathroom','Blackout Curtains','Minibar','Smart TV','Espresso Machine','Hair Dryer'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    // Floor 3 — 3 Deluxe, 3 Suite
    { name:'Khnum Deluxe Room',       slug:'khnum-deluxe-room',       type:'deluxe',   categorySlug:'deluxe',   pricePerNight:390, areaSqm:50, capacity:2, floorNumber:3, roomNumber:'301', description:'Artisan-crafted room with bespoke furnishings.', amenities:['Queen Bed','Panoramic Windows','Rain Shower','Minibar','Smart TV','Work Desk','Safe'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Sobek Deluxe Room',       slug:'sobek-deluxe-room',       type:'deluxe',   categorySlug:'deluxe',   pricePerNight:390, areaSqm:50, capacity:2, floorNumber:3, roomNumber:'302', description:'Guarded by the crocodile god of the Nile.', amenities:['Queen Bed','River-Inspired Décor','Rain Shower','Minibar','Smart TV','Premium Toiletries'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Ptah Deluxe Room',        slug:'ptah-deluxe-room',        type:'deluxe',   categorySlug:'deluxe',   pricePerNight:400, areaSqm:52, capacity:2, floorNumber:3, roomNumber:'303', description:'Crafted by the master architect god himself.', amenities:['Queen Bed','Designer Furniture','Marble Bathroom','Minibar','Smart TV','Espresso Machine'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Osiris Suite',            slug:'osiris-suite',            type:'suite',    categorySlug:'suite',    pricePerNight:580, areaSqm:68, capacity:2, floorNumber:3, roomNumber:'304', description:'Dark wood paneling, gold accents, terrace overlooking rooftops.', amenities:['Terrace','King Bed','Living Room','Rain Shower','Minibar','Smart TV','Egyptian Cotton Robes'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Nile Deluxe Suite',       slug:'nile-deluxe-suite',       type:'suite',    categorySlug:'suite',    pricePerNight:620, areaSqm:72, capacity:3, floorNumber:3, roomNumber:'305', description:'Sweeping river views with deep-soaking tub.', amenities:['River View','King Bed','Living Area','Soaking Tub','Rain Shower','Minibar','Nespresso Machine','65" Smart TV'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Amun Suite',              slug:'amun-suite',              type:'suite',    categorySlug:'suite',    pricePerNight:640, areaSqm:74, capacity:3, floorNumber:3, roomNumber:'306', description:'Spacious suite with hidden bar, private office, and double balcony.', amenities:['Double Balcony','King Bed','Hidden Bar','Private Office','Rain Shower','Soaking Tub','Minibar'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    // Floor 4 — 3 Suite, 2 Royal
    { name:'Khepri Suite',            slug:'khepri-suite',            type:'suite',    categorySlug:'suite',    pricePerNight:650, areaSqm:75, capacity:3, floorNumber:4, roomNumber:'401', description:'Sunrise-facing suite with floor-to-ceiling east windows.', amenities:['East-Facing Windows','King Bed','Spa Bath','Living Area','Rain Shower','Minibar','Nespresso Machine'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Aten Suite',              slug:'aten-suite',              type:'suite',    categorySlug:'suite',    pricePerNight:660, areaSqm:76, capacity:3, floorNumber:4, roomNumber:'402', description:'Full-floor corner suite with dual-aspect views.', amenities:['Corner Suite','King Bed','Dual-Aspect Views','Soaking Tub','Rain Shower','Minibar','65" Smart TV'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Montu Suite',             slug:'montu-suite',             type:'suite',    categorySlug:'suite',    pricePerNight:670, areaSqm:78, capacity:3, floorNumber:4, roomNumber:'403', description:'Private dining alcove and premium minibar.', amenities:['Private Dining Alcove','King Bed','Living Room','Rain Shower','Premium Minibar','Smart TV','Espresso Machine'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:"Cleopatra's Royal Suite", slug:'cleopatras-royal-suite',  type:'royal',    categorySlug:'royal',    pricePerNight:950, areaSqm:95, capacity:2, floorNumber:4, roomNumber:'404', description:"Lapis lazuli blues, sunken bath of rose petals, private lounge.", amenities:['Sunken Bath','King Bed','Private Lounge','City View','Champagne Welcome','Walk-in Closet','Marble Bathroom','Espresso Machine'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Thutmose Royal Chamber',  slug:'thutmose-royal-chamber',  type:'royal',    categorySlug:'royal',    pricePerNight:980, areaSqm:100, capacity:2, floorNumber:4, roomNumber:'405', description:"Egypt's greatest warrior pharaoh. Panoramic views.", amenities:['King Bed','Panoramic Views','Jacuzzi','Private Lounge','Walk-in Wardrobe','Butler Service','75" Smart TV','Fireplace'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    // Floor 5 — 2 Royal, 3 Penthouse
    { name:"Pharaoh's Royal Chamber", slug:'pharaohs-royal-chamber',  type:'royal',    categorySlug:'royal',    pricePerNight:1200, areaSqm:120, capacity:2, floorNumber:5, roomNumber:'501', description:'Private pool terrace and 24K gold-leaf accents.', amenities:['Private Pool','King Bed','Butler Service','24K Gold Fixtures','Private Terrace','Jacuzzi','Fireplace','Walk-in Wardrobe','Nespresso Machine','75" Smart TV'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Ramesses Royal Chamber',  slug:'ramesses-royal-chamber',  type:'royal',    categorySlug:'royal',    pricePerNight:1100, areaSqm:110, capacity:2, floorNumber:5, roomNumber:'502', description:'Colossal proportions, opulent décor, private terrace.', amenities:['Private Terrace','King Bed','Butler Service','Jacuzzi','Walk-in Wardrobe','Nespresso Machine','75" Smart TV','Marble Bathroom'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Horizon Penthouse',       slug:'horizon-penthouse',       type:'penthouse', categorySlug:'penthouse', pricePerNight:1500, areaSqm:180, capacity:4, floorNumber:5, roomNumber:'503', description:'Wraparound terrace, private plunge pool, dedicated concierge.', amenities:['Wraparound Terrace','Plunge Pool','King Bed','Separate Living & Dining','Butler','Jacuzzi','Home Cinema','Full Kitchen','Fireplace'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Nile Crown Penthouse',    slug:'nile-crown-penthouse',    type:'penthouse', categorySlug:'penthouse', pricePerNight:1600, areaSqm:200, capacity:4, floorNumber:5, roomNumber:'504', description:'Direct Nile views, personal chef service, rooftop garden.', amenities:['Rooftop Garden','Plunge Pool','King Bed','Personal Chef','Butler','Home Cinema','Full Kitchen','Private Gym','Jacuzzi'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Dynasty Penthouse',       slug:'dynasty-penthouse',       type:'penthouse', categorySlug:'penthouse', pricePerNight:1800, areaSqm:220, capacity:6, floorNumber:5, roomNumber:'505', description:'360° views, two king suites, full entertainment suite.', amenities:['Private Pool Deck','360° Views','2× King Beds','Entertainment Suite','Personal Chef','Butler','Full Kitchen','Private Gym','Wine Cellar'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
  ]);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  await Promise.all(rooms.map(async (room) => {
    const qrCodeUrl = await generateQRDataUrl(room.qrToken, clientUrl);
    await Room.findByIdAndUpdate(room._id, { qrCodeUrl });
  }));
  console.log(`✅ ${rooms.length} rooms seeded`);

  // ─── MENU ITEMS ───────────────────────────────────────────────────────────
  const menuItems = await MenuItem.insertMany([
    { name:'Egyptian Ful Medames',         description:'Slow-cooked fava beans with olive oil, cumin, lemon.',           category:'breakfast', price:18,  image:FOOD_IMAGES.breakfast, preparationTime:15, isVeg:true,  tags:['traditional','vegan'] },
    { name:'Royal Breakfast Platter',      description:'Scrambled eggs, smoked salmon, fresh fruit, assorted pastries.', category:'breakfast', price:35,  image:FOOD_IMAGES.breakfast, preparationTime:20, isVeg:false, tags:['premium','bestseller'] },
    { name:"Pharaoh's Shakshuka",          description:'Poached eggs in spiced tomato and harissa sauce with feta.',      category:'breakfast', price:22,  image:FOOD_IMAGES.breakfast, preparationTime:18, isVeg:true,  tags:['vegetarian','spicy'] },
    { name:'Grilled Sea Bass Nile Style',  description:'Whole sea bass with Egyptian spices and saffron rice.',           category:'lunch',     price:48,  image:FOOD_IMAGES.lunch,     preparationTime:30, isVeg:false, tags:['seafood','premium'] },
    { name:'Kofta Royal Platter',          description:'Minced lamb kofta with tahini sauce and tabbouleh.',              category:'lunch',     price:42,  image:FOOD_IMAGES.lunch,     preparationTime:25, isVeg:false, tags:['lamb','traditional'] },
    { name:'Lentil Soup du Pharaon',       description:'Velvety Egyptian red lentil soup with cumin.',                    category:'lunch',     price:16,  image:FOOD_IMAGES.lunch,     preparationTime:10, isVeg:true,  tags:['vegan','soup'] },
    { name:"Rack of Lamb — Pharaoh's Cut", description:'Premium rack of lamb with pomegranate jus and truffle mash.',    category:'dinner',    price:95,  image:FOOD_IMAGES.dinner,    preparationTime:45, isVeg:false, tags:['premium','signature'] },
    { name:'Hamam Mahshi',                 description:'Whole pigeon stuffed with freekeh grain and pine nuts.',          category:'dinner',    price:78,  image:FOOD_IMAGES.dinner,    preparationTime:50, isVeg:false, tags:['signature','traditional'] },
    { name:'Molokhia with Chicken',        description:'Silky jute leaf stew with slow-cooked chicken.',                 category:'dinner',    price:52,  image:FOOD_IMAGES.dinner,    preparationTime:35, isVeg:false, tags:['traditional','bestseller'] },
    { name:'Mezze Royal',                  description:'Hummus, baba ghanoush, tzatziki, olives, and warm pita.',        category:'snacks',    price:28,  image:FOOD_IMAGES.snacks,    preparationTime:10, isVeg:true,  tags:['vegetarian','sharing'] },
    { name:'Truffle Falafel Bites',        description:'Crispy golden falafel with truffle oil and tahini.',              category:'snacks',    price:20,  image:FOOD_IMAGES.snacks,    preparationTime:12, isVeg:true,  tags:['vegan','crispy'] },
    { name:'Karkade (Hibiscus Elixir)',    description:"Egypt's ancient royal drink, lightly sweetened.",                category:'beverages', price:12,  image:FOOD_IMAGES.beverages, preparationTime:5,  isVeg:true,  tags:['cold','traditional'] },
    { name:'Saffron Mint Tea',             description:'Premium Egyptian mint tea infused with Kashmiri saffron.',        category:'beverages', price:14,  image:FOOD_IMAGES.beverages, preparationTime:5,  isVeg:true,  tags:['hot','traditional'] },
    { name:'Royal Gold Cocktail',          description:'Aged whisky, honey, saffron syrup, and fresh lemon.',            category:'beverages', price:22,  image:FOOD_IMAGES.beverages, preparationTime:7,  isVeg:true,  tags:['cocktail','premium'] },
    { name:'Umm Ali',                      description:"Egypt's beloved warm bread pudding with cream and nuts.",         category:'desserts',  price:24,  image:FOOD_IMAGES.desserts,  preparationTime:20, isVeg:true,  tags:['traditional','warm','bestseller'] },
    { name:'Konafa Royal',                 description:'Crispy shredded pastry with clotted cream and rose water syrup.', category:'desserts', price:22,  image:FOOD_IMAGES.desserts,  preparationTime:15, isVeg:true,  tags:['traditional','sweet'] },
    { name:'Gold Leaf Baklava',            description:'Filo pastry with pistachio and 24K gold leaf.',                  category:'desserts',  price:28,  image:FOOD_IMAGES.desserts,  preparationTime:5,  isVeg:true,  tags:['premium','signature'] },
  ]);
  console.log(`✅ ${menuItems.length} menu items seeded`);

  // ─── SPA SERVICES ─────────────────────────────────────────────────────────
  const TIME_SLOTS = [
    { startTime:'09:00', endTime:'10:00' }, { startTime:'10:00', endTime:'11:00' },
    { startTime:'11:00', endTime:'12:00' }, { startTime:'12:00', endTime:'13:00' },
    { startTime:'14:00', endTime:'15:00' }, { startTime:'15:00', endTime:'16:00' },
    { startTime:'16:00', endTime:'17:00' }, { startTime:'17:00', endTime:'18:00' },
    { startTime:'19:00', endTime:'20:00' }, { startTime:'20:00', endTime:'21:00' },
  ];
  const LONG_SLOTS = [
    { startTime:'09:00', endTime:'11:00' }, { startTime:'11:00', endTime:'13:00' },
    { startTime:'14:00', endTime:'16:00' }, { startTime:'16:00', endTime:'18:00' },
    { startTime:'19:00', endTime:'21:00' },
  ];

  const spaServices = await SpaService.insertMany([
    { name:"Cleopatra's Milk & Honey Ritual", description:'Full-body exfoliation with raw honey scrub and warm milk soak.',       duration:90,  price:320, image:SPA_IMAGES[0], category:'body_wrap',    isAvailable:true, slots:LONG_SLOTS },
    { name:'Nile Stone Hot Therapy',          description:'Smooth basalt stones along energy meridians with aromatic massage.',   duration:75,  price:240, image:SPA_IMAGES[1], category:'massage',      isAvailable:true, slots:LONG_SLOTS },
    { name:"Pharaoh's Deep Tissue Massage",   description:'Powerful deep-tissue massage using ancient Egyptian techniques.',      duration:60,  price:180, image:SPA_IMAGES[2], category:'massage',      isAvailable:true, slots:TIME_SLOTS },
    { name:'Desert Rose Facial',              description:'Desert rose extract, 24K gold serum, Egyptian frankincense facial.',  duration:60,  price:195, image:SPA_IMAGES[3], category:'facial',       isAvailable:true, slots:TIME_SLOTS },
    { name:'Hydrotherapy Ritual',             description:'Mineral pools, hydro-jet loungers, eucalyptus steam rooms.',          duration:90,  price:280, image:SPA_IMAGES[4], category:'hydrotherapy', isAvailable:true, slots:LONG_SLOTS },
    { name:"Couples' Golden Journey",         description:'Synchronized massages with gold and jasmine oils, rose petal bath.',  duration:120, price:680, image:SPA_IMAGES[0], category:'couples',      isAvailable:true, slots:[{startTime:'10:00',endTime:'12:00'},{startTime:'14:00',endTime:'16:00'},{startTime:'18:00',endTime:'20:00'}] },
  ]);
  console.log(`✅ ${spaServices.length} spa services seeded`);

  // ─── SPA THERAPISTS ───────────────────────────────────────────────────────
  const spaByName = Object.fromEntries(spaServices.map(s => [s.name, s._id]));
  const therapists = await SpaTherapist.insertMany([
    { name:'Nefertari Hassan', specializations:[spaByName["Cleopatra's Milk & Honey Ritual"],spaByName['Desert Rose Facial']], breakDuration:15, isActive:true },
    { name:'Ramses Khalil',    specializations:[spaByName['Nile Stone Hot Therapy'],spaByName["Pharaoh's Deep Tissue Massage"]], breakDuration:15, isActive:true },
    { name:'Isis Mostafa',     specializations:[spaByName['Hydrotherapy Ritual'],spaByName["Couples' Golden Journey"]], breakDuration:15, isActive:true },
  ]);
  console.log(`✅ ${therapists.length} spa therapists seeded`);

  // ─── INVENTORY ────────────────────────────────────────────────────────────
  await Ingredient.insertMany([
    { name:'Chicken Breast',   unit:'kg',     stock:15,  costPrice:850,  lowStockThreshold:3,  category:'kitchen' },
    { name:'Beef Tenderloin',  unit:'kg',     stock:8,   costPrice:1800, lowStockThreshold:2,  category:'kitchen' },
    { name:'Salmon Fillet',    unit:'kg',     stock:6,   costPrice:1600, lowStockThreshold:2,  category:'kitchen' },
    { name:'Eggs',             unit:'piece',  stock:120, costPrice:18,   lowStockThreshold:24, category:'kitchen' },
    { name:'Basmati Rice',     unit:'kg',     stock:25,  costPrice:180,  lowStockThreshold:5,  category:'kitchen' },
    { name:'Fava Beans',       unit:'kg',     stock:10,  costPrice:120,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Feta Cheese',      unit:'kg',     stock:4,   costPrice:950,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Pistachio',        unit:'kg',     stock:3,   costPrice:2200, lowStockThreshold:0.5,category:'kitchen' },
    { name:'Filo Pastry',      unit:'packet', stock:12,  costPrice:280,  lowStockThreshold:3,  category:'kitchen' },
    { name:'Saffron',          unit:'g',      stock:50,  costPrice:45,   lowStockThreshold:10, category:'kitchen' },
    { name:'Olive Oil',        unit:'litre',  stock:8,   costPrice:900,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Cumin',            unit:'g',      stock:500, costPrice:2,    lowStockThreshold:100,category:'kitchen' },
    { name:'Orange Juice',     unit:'litre',  stock:20,  costPrice:180,  lowStockThreshold:5,  category:'bar' },
    { name:'Sparkling Water',  unit:'bottle', stock:48,  costPrice:120,  lowStockThreshold:12, category:'bar' },
    { name:'Coffee Beans',     unit:'kg',     stock:4,   costPrice:1800, lowStockThreshold:1,  category:'bar' },
    { name:'Mint Leaves',      unit:'g',      stock:400, costPrice:3,    lowStockThreshold:100,category:'bar' },
    { name:'Honey',            unit:'kg',     stock:5,   costPrice:600,  lowStockThreshold:1,  category:'bar' },
    { name:'Napkins',          unit:'packet', stock:30,  costPrice:120,  lowStockThreshold:5,  category:'general' },
    { name:'Towels (Bath)',    unit:'piece',  stock:80,  costPrice:450,  lowStockThreshold:20, category:'general' },
    { name:'Bed Linen Set',    unit:'piece',  stock:60,  costPrice:1200, lowStockThreshold:10, category:'general' },
    { name:'Shampoo',          unit:'bottle', stock:30,  costPrice:280,  lowStockThreshold:8,  category:'general' },
    { name:'Hand Soap',        unit:'bottle', stock:35,  costPrice:220,  lowStockThreshold:8,  category:'general' },
  ]);
  console.log('✅ 22 inventory ingredients seeded');

  // ─── ADMIN / STAFF USERS ──────────────────────────────────────────────────
  await User.deleteMany({ email: { $in: ['admin@royalsuites.com','superadmin@royalsuites.com','food@royalsuites.com','spa@royalsuites.com','frontdesk@royalsuites.com'] } });
  await User.create({ name:'Royal Super Admin', email:'superadmin@royalsuites.com', password:'RoyalAdmin@123', role:'super_admin', department:null });
  await User.create({ name:'Food & Bar Manager', email:'food@royalsuites.com', password:'Food@1234', role:'admin', department:'food' });
  await User.create({ name:'Spa Manager', email:'spa@royalsuites.com', password:'Spa@12345', role:'admin', department:'spa' });
  await User.create({ name:'Front Desk Manager', email:'frontdesk@royalsuites.com', password:'FrontDesk@123', role:'admin', department:'front_desk' });
  console.log('✅ Admin users seeded');

  // ─── 2-YEAR SIMULATION ────────────────────────────────────────────────────
  // Generate ~700 completed historical stays spread over 730 days (2 years ago → yesterday).
  // Each stay: reservation → guest check-in doc → bill → optional orders → optional spa → review
  // Cover all edge cases:
  //   - Room-only rating (no food/spa)
  //   - Food rating (with delivered order)
  //   - Spa rating (with completed spa booking)
  //   - All-3 rating
  //   - No review submitted (some guests just leave)
  //   - Bad reviews (1–2 stars), good (4–5), mixed (3)
  //   - Hidden reviews (admin hid them)
  //   - Long stays, short stays
  //   - Various room types (standard → penthouse)
  //   - Various sources (website, booking_com, agoda, walk_in)

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const TWO_YEARS_AGO = addDays(today, -730);

  const SOURCES = ['website','website','website','booking_com','booking_com','agoda','other'] as const;
  const POLICIES = ['flexible','flexible','non_refundable'] as const;

  // Review scenario weights (per completed stay):
  // 60% all-3 depts, 15% room+food, 10% room+spa, 10% room-only, 5% no review
  const REVIEW_SCENARIOS: Array<'all'|'room_food'|'room_spa'|'room_only'|'none'> =
    Array(60).fill('all')
      .concat(Array(15).fill('room_food'))
      .concat(Array(10).fill('room_spa'))
      .concat(Array(10).fill('room_only'))
      .concat(Array(5).fill('none'));

  const tBySpecialization: Record<string, any> = {};
  for (const t of therapists) {
    for (const sid of t.specializations) {
      tBySpecialization[sid.toString()] = t;
    }
  }

  let reviewCount = 0;
  let stayCount   = 0;
  const BATCH_SIZE = 50; // process in batches to avoid memory issues

  // We'll generate stays day by day, picking random rooms
  // To keep it fast we won't track per-room conflicts exactly —
  // we just pick rooms randomly from all 28 (history data, conflicts don't matter for past)

  const totalDays = 730;
  // ~2-3 checkouts per day on average → ~1500 stays, but keep to ~700 for speed
  // Use every other day to target ~700
  const stayDefs: Array<{
    guestName: string; guestEmail: string;
    room: any; checkIn: Date; nights: number;
    source: string; policy: string;
    scenario: string;
  }> = [];

  let nameIdx = 0;
  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    // Skip ~30% of days to create realistic gaps
    if (Math.random() < 0.3) continue;
    const checkOut = addDays(TWO_YEARS_AGO, dayOffset);
    // 1–3 checkouts per active day
    const checkoutsToday = rnd(1, 3);
    for (let c = 0; c < checkoutsToday; c++) {
      const nights = rnd(1, 7);
      const checkIn = addDays(checkOut, -nights);
      // Don't use days in the future
      if (checkOut >= today) continue;
      const guestName  = GUEST_NAMES[nameIdx % GUEST_NAMES.length];
      const safeName   = guestName.toLowerCase().replace(/[^a-z0-9]/g,'.');
      const guestEmail = `${safeName}.${nameIdx}@sim.com`;
      nameIdx++;
      stayDefs.push({
        guestName, guestEmail,
        room: pick(rooms),
        checkIn, nights,
        source: pick(SOURCES as any),
        policy: pick(POLICIES as any),
        scenario: pick(REVIEW_SCENARIOS),
      });
    }
  }

  console.log(`📅 Processing ${stayDefs.length} historical stays...`);

  // Also add ~20 currently CHECKED-IN guests (for live dashboard)
  const liveGuestDefs: typeof stayDefs = [];
  for (let i = 0; i < 20; i++) {
    const nights = rnd(1, 5);
    const checkIn = addDays(today, -rnd(0, nights - 1));
    const guestName  = GUEST_NAMES[nameIdx % GUEST_NAMES.length];
    const safeName   = guestName.toLowerCase().replace(/[^a-z0-9]/g,'.');
    const guestEmail = `${safeName}.live${i}@sim.com`;
    nameIdx++;
    liveGuestDefs.push({
      guestName, guestEmail,
      room: rooms[i % rooms.length],
      checkIn, nights,
      source: pick(SOURCES as any),
      policy: pick(POLICIES as any),
      scenario: pick(REVIEW_SCENARIOS),
    });
  }

  // Also add ~10 future reservations
  const futureResDefs: typeof stayDefs = [];
  for (let i = 0; i < 10; i++) {
    const daysAhead = rnd(1, 30);
    const checkIn   = addDays(today, daysAhead);
    const nights    = rnd(2, 7);
    const guestName  = GUEST_NAMES[nameIdx % GUEST_NAMES.length];
    const safeName   = guestName.toLowerCase().replace(/[^a-z0-9]/g,'.');
    const guestEmail = `${safeName}.future${i}@sim.com`;
    nameIdx++;
    futureResDefs.push({
      guestName, guestEmail,
      room: pick(rooms),
      checkIn, nights,
      source: pick(SOURCES as any),
      policy: pick(POLICIES as any),
      scenario: 'none',
    });
  }

  // ── Process historical stays in batches ───────────────────────────────────
  const SPA_SERVICE_IDS = spaServices.map(s => s._id.toString());

  for (let bStart = 0; bStart < stayDefs.length; bStart += BATCH_SIZE) {
    const batch = stayDefs.slice(bStart, bStart + BATCH_SIZE);
    await Promise.all(batch.map(async (def) => {
      const checkOut = addDays(def.checkIn, def.nights);
      const roomCharges = def.room.pricePerNight * def.nights * (def.policy === 'non_refundable' ? 0.9 : 1);

      // Reservation
      const res = await Reservation.create({
        bookingRef: bookingRef(),
        guest: { name: def.guestName, email: def.guestEmail, phone: `+1-555-${String(rnd(1000000,9999999))}`, idProof: '' },
        room: def.room._id,
        checkInDate: def.checkIn,
        checkOutDate: checkOut,
        numberOfGuests: rnd(1, def.room.capacity),
        status: 'checked_out',
        cancellationPolicy: def.policy,
        specialRequests: '',
        totalNights: def.nights,
        roomCharges,
        paidUpfront: def.policy === 'non_refundable',
        source: def.source,
        guestType: 'foreign',
      });

      // Bill
      const bill = await Bill.create({
        guest: new mongoose.Types.ObjectId(),
        reservation: res._id,
        lineItems: [],
        roomCharges,
        foodCharges: 0, spaCharges: 0, otherCharges: 0,
        totalAmount: roomCharges,
        taxAmount: 0, grandTotal: roomCharges,
        status: 'paid',
      });

      // Guest (checked-out, inactive)
      const guest = await Guest.create({
        reservation: res._id,
        room: def.room._id,
        name: def.guestName,
        email: def.guestEmail,
        phone: `+1-555-${String(rnd(1000000,9999999))}`,
        checkInTime: def.checkIn,
        checkOutTime: checkOut,
        qrSessionToken: generateQRToken(),
        qrSessionExpiry: checkOut, // expired
        isActive: false,
        bill: bill._id,
      });
      await Bill.findByIdAndUpdate(bill._id, { guest: guest._id });

      // Scenario determines which depts get order/spa/review
      const scenario = def.scenario;
      if (scenario === 'none') return;

      const wantsFood = scenario === 'all' || scenario === 'room_food';
      const wantsSpa  = scenario === 'all' || scenario === 'room_spa';

      let foodDelivered = false;
      let spaCompleted  = false;

      // Food orders (if scenario requires food rating)
      if (wantsFood) {
        // 1–3 delivered orders during the stay
        const orderCount = rnd(1, 3);
        for (let o = 0; o < orderCount; o++) {
          const item = pick(menuItems);
          const qty  = rnd(1, 3);
          const placedAt = addDays(def.checkIn, rnd(0, Math.max(0, def.nights - 1)));
          await Order.create({
            guest: guest._id,
            room: def.room._id,
            items: [{ menuItem: item._id, quantity: qty, unitPrice: item.price, specialInstructions: '' }],
            totalAmount: item.price * qty,
            status: 'delivered',
            addedToBill: true,
            isAdminOrder: false,
            orderPaymentMethod: 'room_bill',
            placedAt,
            deliveredAt: new Date(placedAt.getTime() + 30 * 60000),
          });
        }
        foodDelivered = true;
      }

      // Spa booking (if scenario requires spa rating)
      if (wantsSpa) {
        const svcId    = pick(SPA_SERVICE_IDS);
        const svc      = spaServices.find(s => s._id.toString() === svcId)!;
        const therapist= tBySpecialization[svcId] ?? therapists[0];
        const spaDate  = addDays(def.checkIn, rnd(0, def.nights - 1));
        const startHHMM = '10:00';
        await SpaBooking.create({
          guest: guest._id,
          service: svc._id,
          therapist: therapist._id,
          date: spaDate,
          scheduledStart: startHHMM,
          scheduledEnd: addMin(startHHMM, svc.duration),
          actualStart: startHHMM,
          actualEnd: addMin(startHHMM, svc.duration),
          durationSnapshot: svc.duration,
          window: 'any',
          status: 'completed',
          price: svc.price,
          addedToBill: true,
          isWalkIn: false,
        });
        spaCompleted = true;
      }

      // Review
      const roomRating = weightedRating();
      const foodRating = foodDelivered ? weightedRating() : undefined;
      const spaRating  = spaCompleted  ? weightedRating() : undefined;

      const submitted = [roomRating, foodRating, spaRating].filter((r): r is number => r !== undefined);
      const overallRating = Math.round((submitted.reduce((a,b) => a+b, 0) / submitted.length) * 10) / 10;

      // ~15% chance a review is hidden by admin (simulates moderation)
      const isHidden = Math.random() < 0.15;

      // Add text feedback ~70% of the time (some guests just click stars)
      const addFeedback = Math.random() < 0.70;

      await Review.create({
        guest:       guest._id,
        reservation: res._id,
        roomRating,
        ...(addFeedback ? { roomFeedback: roomFb(roomRating) } : {}),
        ...(foodRating !== undefined ? { foodRating, ...(addFeedback ? { foodFeedback: foodFb(foodRating) } : {}) } : {}),
        ...(spaRating  !== undefined ? { spaRating,  ...(addFeedback ? { spaFeedback:  spaFb(spaRating)  } : {}) } : {}),
        overallRating,
        isHidden,
        createdAt: checkOut,
      });
      reviewCount++;
      stayCount++;
    }));

    process.stdout.write(`\r  ✍️  ${stayCount}/${stayDefs.length} stays processed...`);
  }
  console.log(`\n✅ ${stayCount} historical stays + ${reviewCount} reviews seeded`);

  // ── Live checked-in guests (for dashboard) ────────────────────────────────
  let liveCount = 0;
  for (const def of liveGuestDefs) {
    const checkOut   = addDays(def.checkIn, def.nights);
    const roomCharges = def.room.pricePerNight * def.nights;
    const res = await Reservation.create({
      bookingRef: bookingRef(),
      guest: { name: def.guestName, email: def.guestEmail, phone: `+1-555-${String(rnd(1000000,9999999))}`, idProof: '' },
      room: def.room._id,
      checkInDate: def.checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 2,
      status: 'checked_in',
      cancellationPolicy: 'flexible',
      specialRequests: '',
      totalNights: def.nights,
      roomCharges,
      source: def.source,
      guestType: 'foreign',
    });
    const bill = await Bill.create({
      guest: new mongoose.Types.ObjectId(),
      reservation: res._id,
      lineItems: [],
      roomCharges,
      foodCharges: 0, spaCharges: 0, otherCharges: 0,
      totalAmount: roomCharges,
      taxAmount: 0, grandTotal: roomCharges,
      status: 'open',
    });
    const guest = await Guest.create({
      reservation: res._id,
      room: def.room._id,
      name: def.guestName,
      email: def.guestEmail,
      phone: `+1-555-${String(rnd(1000000,9999999))}`,
      checkInTime: def.checkIn,
      qrSessionToken: generateQRToken(),
      qrSessionExpiry: addDays(today, 10),
      isActive: true,
      bill: bill._id,
    });
    await Bill.findByIdAndUpdate(bill._id, { guest: guest._id });
    await Room.findByIdAndUpdate(def.room._id, { isAvailable: false });
    liveCount++;
  }
  console.log(`✅ ${liveCount} live checked-in guests seeded`);

  // ── Future reservations ───────────────────────────────────────────────────
  const futureStatuses: Array<'pending'|'confirmed'> = ['pending','pending','confirmed','confirmed','confirmed'];
  let futureCount = 0;
  for (const def of futureResDefs) {
    const checkOut = addDays(def.checkIn, def.nights);
    await Reservation.create({
      bookingRef: bookingRef(),
      guest: { name: def.guestName, email: def.guestEmail, phone: `+1-555-${String(rnd(1000000,9999999))}`, idProof: '' },
      room: def.room._id,
      checkInDate: def.checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 2,
      status: futureStatuses[futureCount % futureStatuses.length],
      cancellationPolicy: def.policy,
      specialRequests: '',
      totalNights: def.nights,
      roomCharges: def.room.pricePerNight * def.nights,
      source: def.source,
      guestType: 'foreign',
    });
    futureCount++;
  }
  console.log(`✅ ${futureCount} future reservations seeded`);

  // ── Today's spa bookings (for live Gantt) ────────────────────────────────
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // We need live guests for today's spa — use the liveGuestDefs list
  const liveGuests = await Guest.find({ isActive: true }).limit(9);
  const sByName    = Object.fromEntries(spaServices.map(s => [s.name, s]));
  const tByName2   = Object.fromEntries(therapists.map(t => [t.name, t]));

  if (liveGuests.length >= 3) {
    const spaDayDefs = [
      { gIdx:0, therapist:tByName2['Nefertari Hassan'], service:sByName["Cleopatra's Milk & Honey Ritual"], scheduledStart:'09:30', status:'completed',  actualStart:'09:30', actualEnd:'11:00', addedToBill:true  },
      { gIdx:1, therapist:tByName2['Nefertari Hassan'], service:sByName['Desert Rose Facial'],              scheduledStart:'11:30', status:'in_progress', actualStart:'11:30', actualEnd:'',      addedToBill:false },
      { gIdx:2, therapist:tByName2['Nefertari Hassan'], service:sByName["Cleopatra's Milk & Honey Ritual"], scheduledStart:'14:00', status:'confirmed',   actualStart:'',      actualEnd:'',      addedToBill:false },
      { gIdx:Math.min(3, liveGuests.length-1), therapist:tByName2['Ramses Khalil'], service:sByName['Nile Stone Hot Therapy'],        scheduledStart:'10:00', status:'completed',  actualStart:'10:00', actualEnd:'11:15', addedToBill:true  },
      { gIdx:Math.min(4, liveGuests.length-1), therapist:tByName2['Ramses Khalil'], service:sByName["Pharaoh's Deep Tissue Massage"], scheduledStart:'13:00', status:'arrived',    actualStart:'13:05', actualEnd:'',      addedToBill:false },
      { gIdx:Math.min(5, liveGuests.length-1), therapist:tByName2['Ramses Khalil'], service:sByName['Nile Stone Hot Therapy'],        scheduledStart:'15:30', status:'pending',    actualStart:'',      actualEnd:'',      addedToBill:false },
      { gIdx:Math.min(6, liveGuests.length-1), therapist:tByName2['Isis Mostafa'],  service:sByName['Hydrotherapy Ritual'],           scheduledStart:'09:00', status:'completed',  actualStart:'09:00', actualEnd:'10:30', addedToBill:true  },
      { gIdx:Math.min(7, liveGuests.length-1), therapist:tByName2['Isis Mostafa'],  service:sByName["Couples' Golden Journey"],       scheduledStart:'11:00', status:'cancelled',  actualStart:'',      actualEnd:'',      addedToBill:false },
      { gIdx:Math.min(8, liveGuests.length-1), therapist:tByName2['Isis Mostafa'],  service:sByName['Hydrotherapy Ritual'],           scheduledStart:'15:00', status:'confirmed',  actualStart:'',      actualEnd:'',      addedToBill:false },
    ];

    const todaySpaBookings = await SpaBooking.insertMany(
      spaDayDefs.map(def => ({
        guest: liveGuests[def.gIdx]._id,
        service: def.service._id,
        therapist: def.therapist._id,
        date: todayDate,
        scheduledStart: def.scheduledStart,
        scheduledEnd: addMin(def.scheduledStart, def.service.duration),
        actualStart: def.actualStart,
        actualEnd: def.actualEnd,
        durationSnapshot: def.service.duration,
        window: 'any',
        status: def.status,
        price: def.service.price,
        addedToBill: def.addedToBill,
        isWalkIn: false,
      }))
    );
    console.log(`✅ ${todaySpaBookings.length} today's spa bookings seeded`);
  }

  console.log('\n🏰 2-Year Simulation Complete!');
  console.log('─────────────────────────────────────────────────');
  console.log(`   Rooms:          ${rooms.length}`);
  console.log(`   Historical stays: ${stayCount}`);
  console.log(`   Reviews:        ${reviewCount}`);
  console.log(`   Live guests:    ${liveCount}`);
  console.log(`   Future res:     ${futureCount}`);
  console.log('─────────────────────────────────────────────────');
  console.log('   superadmin@royalsuites.com / RoyalAdmin@123');
  console.log('─────────────────────────────────────────────────');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
