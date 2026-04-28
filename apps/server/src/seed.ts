import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import Room from './models/Room';
import RoomCategory from './models/RoomCategory';
import MenuItem from './models/MenuItem';
import Recipe from './models/Recipe';
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
  soup:      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600',
  salad:     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
  sandwich:  'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=600',
  maincourse:'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600',
  bar:       'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
let _refCounter = 0;
function bookingRef() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const seq = String(++_refCounter).padStart(4, '0');
  const rand = Math.random().toString(36).substring(2,5).toUpperCase();
  return `RS-${d}-${seq}-${rand}`;
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
    Recipe.deleteMany({}),
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
    { name: 'Superior King Room',   slug: 'superior-king-room',   icon: 'BedDouble', basePrice: 250,  description: 'Elegant rooms featuring a plush king-size bed, refined furnishings, and modern comforts — perfect for couples or solo travellers seeking superior comfort.' },
    { name: 'Superior Twin Room',   slug: 'superior-twin-room',   icon: 'Bed',       basePrice: 230,  description: 'Generously proportioned rooms with two separate double beds, ideal for friends, colleagues, or families travelling together.' },
    { name: 'Executive Suite Twin', slug: 'executive-suite-twin', icon: 'Star',      basePrice: 480,  description: 'A distinguished executive suite with twin double beds, a separate living area, and elevated amenities crafted for the discerning business traveller.' },
    { name: 'Deluxe King Suite',    slug: 'deluxe-king-suite',    icon: 'Gem',       basePrice: 620,  description: 'Opulent suites on the premier floor, each centered on a grand king bed, with sweeping views, a private lounge, and lavish en-suite bathroom.' },
    { name: 'Junior Suite',         slug: 'junior-suite',         icon: 'Sparkles',  basePrice: 390,  description: 'A thoughtfully designed junior suite blending a comfortable sleeping space with a cosy sitting area — an indulgent step up from standard accommodation.' },
    { name: 'Suite with City View', slug: 'suite-city-view',      icon: 'Building2', basePrice: 550,  description: 'Floor-to-ceiling panoramas of the city skyline define this stylish suite, complemented by bespoke furnishings and premium in-room amenities.' },
    { name: 'Presidential Suite',   slug: 'presidential-suite',   icon: 'Crown',     basePrice: 1200, description: 'The crown jewel of Royal Suites — an expansive, museum-quality residence with private dining, a butler, and unparalleled views reserved for heads of state and distinguished guests.' },
  ]);
  console.log(`✅ ${categories.length} room categories seeded`);

  // ─── ROOMS (27 rooms) ─────────────────────────────────────────────────────
  // Superior King Room: 13 total — Floor 1 (5), Floor 2 (4), Floor 3 (2), Floor 4 (2)
  // Superior Twin Room:  7 total — Floor 2 (1), Floor 3 (3), Floor 4 (3)
  // Executive Suite Twin: 1 total — Floor 5 (1)
  // Deluxe King Suite:   3 total — Floor 5 (3)
  // Junior Suite:        1 total — Floor 3 (1)
  // Suite with City View:1 total — Floor 5 (1)
  // Presidential Suite:  1 total — Floor 3 (1)
  const rooms = await Room.insertMany([
    // ── Floor 1: 5 Superior King Rooms (101–105) ──────────────────────────
    { name:'Superior King Room 101', slug:'superior-king-room-101', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:250, areaSqm:32, capacity:2, floorNumber:1, roomNumber:'101', description:'A bright, welcoming first-floor retreat dressed in warm earth tones. The plush king-size bed faces floor-to-ceiling drapes that soften the morning light, while the marble-tiled en-suite and rainfall shower ensure every start to the day feels effortless.', amenities:['King Bed','En-Suite Bathroom','Rainfall Shower','Smart TV','Work Desk','Air Conditioning','Wi-Fi','Daily Housekeeping'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 102', slug:'superior-king-room-102', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:250, areaSqm:32, capacity:2, floorNumber:1, roomNumber:'102', description:'Refined comfort on the ground floor with a garden-facing outlook. Rich walnut furnishings and crisp Egyptian cotton linen set the tone for a restorative stay, complemented by a sleek marble bathroom with a deep-soaking bathtub.', amenities:['King Bed','En-Suite Bathroom','Soaking Tub','Smart TV','Air Conditioning','Wi-Fi','Safe','Hair Dryer'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 103', slug:'superior-king-room-103', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:255, areaSqm:33, capacity:2, floorNumber:1, roomNumber:'103', description:'A serene king room where hand-stitched upholstery and soft gold-accent lighting create an intimate ambiance. The rain shower, premium minibar, and espresso machine make self-care entirely indulgent.', amenities:['King Bed','En-Suite Bathroom','Rainfall Shower','Minibar','Smart TV','Espresso Machine','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 104', slug:'superior-king-room-104', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:255, areaSqm:33, capacity:2, floorNumber:1, roomNumber:'104', description:'Understated elegance anchored by a sumptuous king bed with triple-layer bedding. The private en-suite features dual vanities and a glass-enclosed shower, while the dedicated writing desk makes extended stays equally productive.', amenities:['King Bed','Dual Vanity Bathroom','Glass-Enclosed Shower','Work Desk','Smart TV','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 105', slug:'superior-king-room-105', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:260, areaSqm:34, capacity:2, floorNumber:1, roomNumber:'105', description:'The largest of the first-floor king rooms, offering a corner aspect with extra natural light. Styled with bespoke artwork and locally sourced stone accents, the room delivers a genuinely distinctive sense of place.', amenities:['King Bed','Corner Aspect','En-Suite Bathroom','Rainfall Shower','Minibar','Smart TV','Air Conditioning','Wi-Fi','Premium Toiletries'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },

    // ── Floor 2: 4 Superior King Rooms (201–204) + 1 Superior Twin Room (205) ─
    { name:'Superior King Room 201', slug:'superior-king-room-201', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:265, areaSqm:34, capacity:2, floorNumber:2, roomNumber:'201', description:'An elevated sanctuary on the second floor with calming neutral tones and a king bed dressed in 400-thread-count linen. The spacious marble bathroom, premium amenities kit, and city glimpses make this an ideal urban retreat.', amenities:['King Bed','Marble Bathroom','Rainfall Shower','Smart TV','Work Desk','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 202', slug:'superior-king-room-202', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:265, areaSqm:34, capacity:2, floorNumber:2, roomNumber:'202', description:'Thoughtfully designed with the business traveller in mind — a king-sized bed for deep rest and an ergonomic workstation for peak productivity, all wrapped in warm timber and brushed brass finishes.', amenities:['King Bed','En-Suite Bathroom','Rainfall Shower','Ergonomic Work Desk','Smart TV','Espresso Machine','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 203', slug:'superior-king-room-203', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:270, areaSqm:35, capacity:2, floorNumber:2, roomNumber:'203', description:'A romantic second-floor haven where soft lighting and a king bed with a padded headboard invite complete relaxation. The deep soaking tub, fluffy robes, and curated minibar round out a thoroughly luxurious experience.', amenities:['King Bed','Soaking Tub','Rainfall Shower','Minibar','Smart TV','Cotton Robes','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 204', slug:'superior-king-room-204', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:270, areaSqm:35, capacity:2, floorNumber:2, roomNumber:'204', description:'Rich jewel-tone accents and a statement king headboard set this room apart. The generous wardrobe, in-room safe, and glass rain shower cater to guests who appreciate a polished, detail-focused environment.', amenities:['King Bed','Glass Rain Shower','Walk-in Wardrobe','Safe','Smart TV','Air Conditioning','Wi-Fi','Hair Dryer'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 205', slug:'superior-twin-room-205', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:230, areaSqm:34, capacity:2, floorNumber:2, roomNumber:'205', description:'A versatile second-floor twin room with two plush double beds separated by a handsome bedside console. Neutral linen tones and blackout curtains ensure a peaceful night for pairs travelling together, whether friends or colleagues.', amenities:['2× Double Beds','En-Suite Bathroom','Rainfall Shower','Smart TV','Work Desk','Blackout Curtains','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },

    // ── Floor 3: 2 Superior King (301–302), 3 Superior Twin (303–305), 1 Junior Suite (306), 1 Presidential Suite (307) ─
    { name:'Superior King Room 301', slug:'superior-king-room-301', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:280, areaSqm:36, capacity:2, floorNumber:3, roomNumber:'301', description:'Mid-rise prestige with a king bed, floor-to-ceiling curtains, and a walk-in wardrobe. The marble bathroom features a freestanding basin and premium fragrance amenities, creating a boutique-hotel feel within the hotel.', amenities:['King Bed','Marble Bathroom','Freestanding Basin','Walk-in Wardrobe','Smart TV','Minibar','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 302', slug:'superior-king-room-302', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:280, areaSqm:36, capacity:2, floorNumber:3, roomNumber:'302', description:'Elevated city outlooks frame a king bedroom finished in bespoke joinery and warm stone surfaces. The glass-panel shower, Nespresso station, and plush seating nook make every hour in the room a pleasure.', amenities:['King Bed','Glass-Panel Shower','Nespresso Machine','Plush Seating Nook','Smart TV','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.deluxe, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 303', slug:'superior-twin-room-303', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:245, areaSqm:35, capacity:2, floorNumber:3, roomNumber:'303', description:'Two generously sized double beds anchored by matching bedside tables and individual reading lamps make this twin room an ideal base for companions who value personal space. The shared marble bathroom and ample storage complete the picture.', amenities:['2× Double Beds','Marble Bathroom','Individual Reading Lamps','Smart TV','Work Desk','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 304', slug:'superior-twin-room-304', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:245, areaSqm:35, capacity:2, floorNumber:3, roomNumber:'304', description:'Freshly styled in a palette of sage and cream, this twin room balances restful aesthetics with practical comfort. Dual wardrobes and a generous desk area suit travelling pairs with different schedules and working styles.', amenities:['2× Double Beds','Dual Wardrobes','En-Suite Bathroom','Rainfall Shower','Smart TV','Air Conditioning','Wi-Fi','Safe'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 305', slug:'superior-twin-room-305', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:250, areaSqm:36, capacity:2, floorNumber:3, roomNumber:'305', description:'A corner-facing twin room on the third floor with enhanced natural light and a partial city skyline view. Two premium double beds, plush cotton robes, and a minibar stocked with local selections elevate the twin-share experience.', amenities:['2× Double Beds','Corner Aspect','Minibar','Cotton Robes','Smart TV','Air Conditioning','Wi-Fi','Hair Dryer'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Junior Suite 306',       slug:'junior-suite-306',       type:'junior-suite',        categorySlug:'junior-suite',        pricePerNight:390, areaSqm:55, capacity:2, floorNumber:3, roomNumber:'306', description:'A beautifully appointed junior suite where a king bed occupies its own alcove, separated from a softly furnished sitting room by an artisan room divider. Delicate pendant lighting, a soaking tub, and curated local artwork deliver a genuine upgrade in atmosphere and space.', amenities:['King Bed','Separate Sitting Area','Soaking Tub','Rainfall Shower','Minibar','Smart TV','Espresso Machine','Air Conditioning','Wi-Fi','Cotton Robes'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Presidential Suite 307', slug:'presidential-suite-307', type:'presidential-suite',  categorySlug:'presidential-suite',  pricePerNight:1200, areaSqm:140, capacity:4, floorNumber:3, roomNumber:'307', description:'An extraordinary residence spanning the eastern wing of the third floor, the Presidential Suite commands sweeping panoramic views across the city. A grand entrance foyer leads to an opulent master bedroom with a hand-carved king bed, a formal dining room for eight, a private study, and a decadent spa bathroom with Jacuzzi, steam shower, and heated marble floors. Round-the-clock butler service, a curated wine selection, and bespoke turndown rituals ensure an experience that transcends ordinary hospitality.', amenities:['King Bed','Formal Dining Room','Private Study','Jacuzzi','Steam Shower','Heated Marble Floors','Butler Service','Panoramic Views','Full Kitchen','Wine Selection','Home Cinema','Walk-in Wardrobe','Smart TV','Espresso Machine','Cotton Robes'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },

    // ── Floor 4: 2 Superior King (401–402), 3 Superior Twin (403–405) ──────
    { name:'Superior King Room 401', slug:'superior-king-room-401', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:295, areaSqm:37, capacity:2, floorNumber:4, roomNumber:'401', description:'High-floor serenity with expansive city views framed by floor-to-ceiling windows. A king bed with a tufted leather headboard, dual vanity bathroom, and a dedicated champagne welcome set a celebratory tone from the moment of arrival.', amenities:['King Bed','City Views','Dual Vanity Bathroom','Rainfall Shower','Champagne Welcome','Smart TV','Minibar','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior King Room 402', slug:'superior-king-room-402', type:'superior-king-room', categorySlug:'superior-king-room', pricePerNight:295, areaSqm:37, capacity:2, floorNumber:4, roomNumber:'402', description:'The sky-high ambiance of the fourth floor infuses this king room with an airy, uplifting quality. Blonde oak joinery, silk cushions, and a generous marble bathroom with a standalone soaking tub make for an indulgent mid-stay retreat.', amenities:['King Bed','Standalone Soaking Tub','Blonde Oak Finishes','Smart TV','Nespresso Machine','Air Conditioning','Wi-Fi','Safe','Premium Toiletries'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 403', slug:'superior-twin-room-403', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:260, areaSqm:36, capacity:2, floorNumber:4, roomNumber:'403', description:'An upper-floor twin room with a leafy neighbourhood outlook. Two well-spaced double beds, individually controlled climate settings, and blackout automation make this the go-to choice for light-sensitive travellers sharing a room.', amenities:['2× Double Beds','Individual Climate Control','Blackout Automation','En-Suite Bathroom','Smart TV','Work Desk','Air Conditioning','Wi-Fi'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 404', slug:'superior-twin-room-404', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:260, areaSqm:36, capacity:2, floorNumber:4, roomNumber:'404', description:'Generous proportions and a dual-bed layout with bespoke bedside cabinetry make this fourth-floor twin room stand out. A deep walk-in shower, heated towel rail, and curated minibar cater to guests who expect the small details to be perfect.', amenities:['2× Double Beds','Walk-in Shower','Heated Towel Rail','Minibar','Smart TV','Air Conditioning','Wi-Fi','Hair Dryer'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },
    { name:'Superior Twin Room 405', slug:'superior-twin-room-405', type:'superior-twin-room', categorySlug:'superior-twin-room', pricePerNight:265, areaSqm:37, capacity:2, floorNumber:4, roomNumber:'405', description:'Corner twin room on the fourth floor with a dual-aspect outlook and generous natural light throughout the day. Two double beds with individual reading lights, an espresso station, and a marble bathroom with a separate shower and tub offer a refined twin experience.', amenities:['2× Double Beds','Corner Dual-Aspect','Marble Bathroom','Separate Shower & Tub','Espresso Machine','Smart TV','Air Conditioning','Wi-Fi','Cotton Robes'], images:ROOM_IMAGES.standard, isAvailable:true, qrToken:generateQRToken() },

    // ── Floor 5: 1 Executive Suite Twin (501), 3 Deluxe King Suites (502–504), 1 Suite with City View (505) ─
    { name:'Executive Suite Twin 501', slug:'executive-suite-twin-501', type:'executive-suite-twin', categorySlug:'executive-suite-twin', pricePerNight:480, areaSqm:72, capacity:2, floorNumber:5, roomNumber:'501', description:'A distinguished top-floor executive suite with two separate double beds, a fully equipped work lounge, and a private meeting area — ideal for business travellers who need space to both work and unwind. Premium AV equipment, a curated minibar, and a marble spa bathroom with a rainfall shower complete this impeccably tailored accommodation.', amenities:['2× Double Beds','Private Work Lounge','Meeting Area','Marble Spa Bathroom','Rainfall Shower','Premium AV','Minibar','Espresso Machine','Smart TV','Air Conditioning','Wi-Fi','Butler Service','Cotton Robes'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
    { name:'Deluxe King Suite 502',    slug:'deluxe-king-suite-502',    type:'deluxe-king-suite',    categorySlug:'deluxe-king-suite',    pricePerNight:620, areaSqm:90, capacity:2, floorNumber:5, roomNumber:'502', description:'A premier fifth-floor suite anchored by a grand king bed and opening onto sweeping skyline views through full-height windows. The separate lounge with a statement fireplace, spa bathroom with a Jacuzzi and rain shower, and bespoke Egyptian artwork throughout create an atmosphere of cultivated grandeur.', amenities:['King Bed','Separate Lounge','Fireplace','Jacuzzi','Rainfall Shower','Panoramic Views','Minibar','Nespresso Machine','Smart TV','Walk-in Wardrobe','Butler Service','Wi-Fi'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Deluxe King Suite 503',    slug:'deluxe-king-suite-503',    type:'deluxe-king-suite',    categorySlug:'deluxe-king-suite',    pricePerNight:640, areaSqm:95, capacity:2, floorNumber:5, roomNumber:'503', description:'Understated opulence on the fifth floor defined by a hand-crafted king bed frame, silk wall panels, and a private terrace overlooking the cityscape. The spa bathroom features heated marble floors, a freestanding copper soaking tub, and a dual-head shower system for an at-home spa experience at altitude.', amenities:['King Bed','Private Terrace','Heated Marble Floors','Copper Soaking Tub','Dual-Head Shower','Silk Wall Panels','Minibar','Espresso Machine','Smart TV','Walk-in Wardrobe','Wi-Fi','Cotton Robes'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Deluxe King Suite 504',    slug:'deluxe-king-suite-504',    type:'deluxe-king-suite',    categorySlug:'deluxe-king-suite',    pricePerNight:660, areaSqm:100, capacity:3, floorNumber:5, roomNumber:'504', description:'The most expansive of the Deluxe King Suites, this corner residence on the fifth floor offers dual-aspect views, a master bedroom with a four-poster king bed, a generous sitting room, and a private dining area for intimate in-suite meals. The Jacuzzi suite bathroom and dedicated butler service elevate every moment.', amenities:['Four-Poster King Bed','Dual-Aspect Corner','Private Dining Area','Sitting Room','Jacuzzi','Rainfall Shower','Butler Service','Minibar','Nespresso Machine','Smart TV','Walk-in Wardrobe','Wi-Fi','Premium Toiletries'], images:ROOM_IMAGES.royal, isAvailable:true, qrToken:generateQRToken() },
    { name:'Suite with City View 505', slug:'suite-city-view-505',      type:'suite-city-view',      categorySlug:'suite-city-view',      pricePerNight:550, areaSqm:80, capacity:2, floorNumber:5, roomNumber:'505', description:'Perched on the fifth floor, this suite was designed for those who travel to be inspired. An uninterrupted 180° city panorama fills every corner of the living area and bedroom, where a king bed sits perfectly positioned to greet the sunrise. Italian marble surfaces, a freestanding bath aligned with the view, and a curated cocktail cart complete a room that is as photogenic as it is restful.', amenities:['King Bed','180° City Panorama','Freestanding Bath','Italian Marble Bathroom','Rainfall Shower','Cocktail Cart','Minibar','Smart TV','Espresso Machine','Air Conditioning','Wi-Fi','Cotton Robes'], images:ROOM_IMAGES.suite, isAvailable:true, qrToken:generateQRToken() },
  ]);

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  await Promise.all(rooms.map(async (room) => {
    const qrCodeUrl = await generateQRDataUrl(room.qrToken, clientUrl);
    await Room.findByIdAndUpdate(room._id, { qrCodeUrl });
  }));
  console.log(`✅ ${rooms.length} rooms seeded (27 across 5 floors)`);

  // ─── MENU ITEMS (extracted from actual restaurant menu photos) ─────────────
  // Prices converted from NPR at rate 1 NPR = 0.00663 USD (live rate 2026-04-26)
  const menuItems = await MenuItem.insertMany([
    // ── BREAKFAST MENU (set meals) ────────────────────────────────────────
    { name:'American Breakfast',       description:'2 toast with butter/jam/honey, hash brown potatoes with onion & celery, 2 eggs any style (poached/fried/boiled/scrambled/omelette), 2 fried chicken sausages, tang juice, tea/milk/black coffee.', category:'breakfast', price:4.97, image:FOOD_IMAGES.breakfast, preparationTime:20, isVeg:false, tags:['bestseller','set'] },
    { name:'Healthy Breakfast',        description:'2 toast with butter/jam/honey, hash brown potatoes with onion & celery, 2 eggs any style (poached/fried/boiled/scrambled/omelette), tang juice, tea/milk/black coffee.',                           category:'breakfast', price:3.91, image:FOOD_IMAGES.breakfast, preparationTime:15, isVeg:false, tags:['healthy','set'] },
    { name:'Mirch Breakfast',          description:'2 roasted green chilly, 2 eggs masala, 3 pcs poori, tang juice, tea/milk/black coffee.',                                                                                                             category:'breakfast', price:3.91, image:FOOD_IMAGES.breakfast, preparationTime:20, isVeg:false, tags:['spicy','nepali','set'] },
    { name:'Yoghurt Breakfast',        description:'Aloo gobi, chapati or choice of paratha (plain, vegetable, potato), yogurt (plain/sweet), tang juice, tea/milk/black coffee.',                                                                      category:'breakfast', price:4.97, image:FOOD_IMAGES.breakfast, preparationTime:15, isVeg:true,  tags:['vegetarian','set'] },
    { name:'Sweet Breakfast',          description:'1 Vienna waffle or crepes with sugar powder and topping of your choice (chocolates, fresh fruits, honey), 2 eggs any style, tang juice, tea/milk/black coffee.',                                   category:'breakfast', price:4.97, image:FOOD_IMAGES.breakfast, preparationTime:15, isVeg:true,  tags:['sweet','set'] },
    { name:'Fruit Breakfast',          description:'Fruit salad, muesli or cornflakes with yogurt or hot/cold milk, tang juice, tea/milk/black coffee.',                                                                                                category:'breakfast', price:3.91, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:['healthy','set'] },
    // ── BREAKFAST VARIETIES ───────────────────────────────────────────────
    { name:'Plain Toast with Butter/Jam/Honey',              description:'Plain toast served with butter, jam, or honey.',                                      category:'breakfast', price:0.73, image:FOOD_IMAGES.breakfast, preparationTime:5,  isVeg:true,  tags:[] },
    { name:'Toast with Eggs',                                description:'Toast with eggs (fried/boiled/scrambled/poached/omelette).',                          category:'breakfast', price:1.82, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:false, tags:[] },
    { name:'French Toast',                                   description:'Classic French toast.',                                                               category:'breakfast', price:1.59, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:[] },
    { name:'Grilled Toast with Cheese and Tomato',           description:'Grilled toast topped with cheese and tomato.',                                        category:'breakfast', price:2.06, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:[] },
    { name:'2 Eggs Any Style',                               description:'2 eggs cooked to your style — fried, boiled, scrambled, poached, or omelette.',      category:'breakfast', price:1.13, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:false, tags:[] },
    { name:'Nepali Omelette',                                description:'Traditional Nepali style omelette.',                                                  category:'breakfast', price:1.49, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:false, tags:['nepali'] },
    { name:'Fried Chicken Sausage',                          description:'Pan-fried chicken sausage.',                                                          category:'breakfast', price:2.09, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:false, tags:[] },
    { name:'Honey Banana Porridge',                          description:'Warm porridge with honey and banana.',                                                category:'breakfast', price:1.82, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:['healthy'] },
    { name:'Oats with Milk and Fresh Fruits',                description:'Oats with milk and fresh seasonal fruits.',                                           category:'breakfast', price:1.92, image:FOOD_IMAGES.breakfast, preparationTime:5,  isVeg:true,  tags:['healthy'] },
    { name:'Cornflakes/Muesli with Hot Milk/Cold Milk/Yogurt', description:'Choice of cornflakes or muesli with hot milk, cold milk, or yogurt.',             category:'breakfast', price:1.66, image:FOOD_IMAGES.breakfast, preparationTime:5,  isVeg:true,  tags:['healthy'] },
    { name:'Fresh Fruit Salad',                              description:'Seasonal fresh fruit salad.',                                                         category:'breakfast', price:1.72, image:FOOD_IMAGES.breakfast, preparationTime:5,  isVeg:true,  tags:['healthy','vegan'] },
    { name:'Plain/Sweet Yogurt',                             description:'Plain or sweet yogurt.',                                                              category:'breakfast', price:1.26, image:FOOD_IMAGES.breakfast, preparationTime:2,  isVeg:true,  tags:[] },
    { name:'Vienna Waffle with Chocolate/Honey/Fresh Fruits','description':'Vienna waffle served with chocolate syrup, honey, or fresh fruits.',              category:'breakfast', price:1.82, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:['sweet'] },
    { name:'Crepes with Chocolate/Honey/Fresh Fruits',       description:'Soft crepes with choice of chocolate syrup, honey, or fresh fruits.',               category:'breakfast', price:1.82, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:['sweet'] },
    { name:'Pancake with Chocolate/Honey/Maple Syrup',       description:'Fluffy pancakes with choice of chocolate, honey, or maple syrup.',                  category:'breakfast', price:1.82, image:FOOD_IMAGES.breakfast, preparationTime:10, isVeg:true,  tags:['sweet'] },
    // ── SNACKS ────────────────────────────────────────────────────────────
    { name:'Chicken Drumsticks',             description:'Crispy fried chicken drumsticks.',                           category:'snacks', price:3.65, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['chicken'] },
    { name:'Chicken Satay with Peanut Sauce',description:'Grilled chicken satay served with peanut sauce.',            category:'snacks', price:3.65, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['chicken','bestseller'] },
    { name:'Chicken Chilly with Bone/Boneless','description':'Spicy chicken chilly, choice of bone-in or boneless.',  category:'snacks', price:3.65, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['spicy','chicken'] },
    { name:'Fried Chicken',                  description:'Classic fried chicken.',                                     category:'snacks', price:3.65, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['chicken'] },
    { name:'Chicken Sandeko',                description:'Spiced and tossed chicken sandeko.',                         category:'snacks', price:2.65, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:false, tags:['nepali','spicy'] },
    { name:'Chicken Cashewnuts',             description:'Stir-fried chicken with cashew nuts.',                       category:'snacks', price:3.98, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['chicken'] },
    { name:'Prawn Chilly',                   description:'Spicy prawn chilly.',                                        category:'snacks', price:5.64, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['seafood','spicy'] },
    { name:'Fried Fish',                     description:'Golden fried fish.',                                         category:'snacks', price:2.98, image:FOOD_IMAGES.snacks, preparationTime:20, isVeg:false, tags:['seafood'] },
    { name:'Fish Fingers',                   description:'Crispy fish fingers.',                                       category:'snacks', price:3.98, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:false, tags:['seafood'] },
    { name:'Sukuti Sandeko',                 description:'Dried meat tossed with spices.',                             category:'snacks', price:4.31, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:false, tags:['nepali'] },
    { name:'Sausage Boiled or Chilly',       description:'Sausage served boiled or as chilly preparation.',           category:'snacks', price:2.65, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:false, tags:[] },
    { name:'French Fries',                   description:'Crispy golden french fries.',                                category:'snacks', price:1.99, image:FOOD_IMAGES.snacks, preparationTime:10, isVeg:true,  tags:['vegan','bestseller'] },
    { name:'Peanuts Sandeko / Wafers',       description:'Spiced peanuts sandeko or wafers.',                         category:'snacks', price:2.32, image:FOOD_IMAGES.snacks, preparationTime:5,  isVeg:true,  tags:['vegan','nepali'] },
    { name:'Nepali Hot Garlic Potato',       description:'Garlic-spiced Nepali style potato.',                        category:'snacks', price:2.32, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:true,  tags:['nepali','vegan'] },
    { name:'Mustang Aloo',                   description:'Spiced Mustang-style potato.',                               category:'snacks', price:2.65, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:true,  tags:['nepali','vegan'] },
    { name:'Vegetable Pakoda',               description:'Crispy mixed vegetable pakoda.',                             category:'snacks', price:2.32, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:true,  tags:['vegetarian'] },
    { name:'Cheese Balls',                   description:'Golden fried cheese balls.',                                 category:'snacks', price:2.65, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:true,  tags:['vegetarian'] },
    { name:'Paneer Chilly',                  description:'Spicy paneer chilly.',                                       category:'snacks', price:2.65, image:FOOD_IMAGES.snacks, preparationTime:15, isVeg:true,  tags:['vegetarian','spicy'] },
    { name:'Cashewnuts Plain/Fry',           description:'Plain or fried cashewnuts.',                                 category:'snacks', price:1.99, image:FOOD_IMAGES.snacks, preparationTime:5,  isVeg:true,  tags:['vegan'] },
    // ── SOUP ─────────────────────────────────────────────────────────────
    { name:'Chicken Mushroom Soup',          description:'Creamy chicken mushroom soup.',                              category:'lunch',  price:2.65, image:FOOD_IMAGES.soup, preparationTime:15, isVeg:false, tags:['soup'] },
    { name:'Chicken Noodle Soup',            description:'Classic chicken noodle soup.',                               category:'lunch',  price:2.65, image:FOOD_IMAGES.soup, preparationTime:15, isVeg:false, tags:['soup'] },
    { name:'Hot & Sour Soup',                description:'Spicy hot and sour soup with chicken or prawn.',             category:'lunch',  price:2.65, image:FOOD_IMAGES.soup, preparationTime:15, isVeg:false, tags:['soup','spicy'] },
    { name:'Vegetables Soup',                description:'Fresh garden vegetable soup.',                               category:'lunch',  price:1.99, image:FOOD_IMAGES.soup, preparationTime:15, isVeg:true,  tags:['soup','vegan'] },
    // ── SALADS ────────────────────────────────────────────────────────────
    { name:'Green Salad',                    description:'Fresh vegetable slices salad.',                              category:'lunch',  price:3.31, image:FOOD_IMAGES.salad, preparationTime:10, isVeg:true,  tags:['salad','vegan','healthy'] },
    { name:'Greek Salad',                    description:'Lettuce, tomato, cucumber, onion, bell pepper, Yak cheese, olive oil.',      category:'lunch',  price:3.98, image:FOOD_IMAGES.salad, preparationTime:10, isVeg:true,  tags:['salad'] },
    { name:'Chill-out Salad',                description:'Lettuce, tomato, cucumber, Radicchio, walnut, honey, vinegar, olive oil.',   category:'lunch',  price:3.98, image:FOOD_IMAGES.salad, preparationTime:10, isVeg:true,  tags:['salad'] },
    { name:'Caesar Salad',                   description:'Grilled chicken, lettuce, Yak cheese, egg, lemon juice, garlic, black pepper.', category:'lunch', price:4.64, image:FOOD_IMAGES.salad, preparationTime:10, isVeg:false, tags:['salad'] },
    // ── SANDWICH & BURGER ─────────────────────────────────────────────────
    { name:'Healthy Sandwich',               description:'With cheese, lettuce, cucumber, tomato, boiled egg and mayonnaise.',         category:'lunch',  price:2.98, image:FOOD_IMAGES.sandwich, preparationTime:10, isVeg:false, tags:['sandwich'] },
    { name:'Delight Sandwich',               description:'Delight sandwich with premium fillings.',                                    category:'lunch',  price:3.65, image:FOOD_IMAGES.sandwich, preparationTime:10, isVeg:false, tags:['sandwich'] },
    { name:'Club Sandwich',                  description:'Grilled bacon, fried eggs, lettuce, tomato and mayonnaise.',                category:'lunch',  price:3.98, image:FOOD_IMAGES.sandwich, preparationTime:15, isVeg:false, tags:['sandwich','bestseller'] },
    { name:'Veg Burger',                     description:'Fresh vegetable patty burger.',                                              category:'lunch',  price:2.65, image:FOOD_IMAGES.sandwich, preparationTime:15, isVeg:true,  tags:['burger','vegetarian'] },
    { name:'Chicken Burger',                 description:'Juicy chicken burger.',                                                      category:'lunch',  price:3.65, image:FOOD_IMAGES.sandwich, preparationTime:15, isVeg:false, tags:['burger','chicken','bestseller'] },
    // ── MAIN COURSE ───────────────────────────────────────────────────────
    { name:'Grilled Chicken Wings',          description:'Grilled chicken wings.',                                                     category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['chicken','grilled'] },
    { name:'Grilled Chicken Legs/Breast',    description:'Grilled chicken legs or breast.',                                           category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['chicken','grilled'] },
    { name:'Roasted Chicken Stuffed',        description:'Roasted chicken stuffed with cheese and spinach.',                          category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:35, isVeg:false, tags:['chicken','roasted'] },
    { name:'Royal Penguin Chicken',          description:'Special Royal Penguin style chicken.',                                      category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:30, isVeg:false, tags:['chicken','signature'] },
    { name:'Chicken Sizzler',                description:'Sizzling chicken platter.',                                                 category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['chicken','bestseller'] },
    { name:'Fried Catfish Fillet',           description:'Golden fried catfish fillet.',                                              category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['seafood'] },
    { name:'Grilled Whole Fish',             description:'Whole grilled fish.',                                                       category:'dinner', price:7.96, image:FOOD_IMAGES.maincourse, preparationTime:30, isVeg:false, tags:['seafood','premium'] },
    { name:'Spaghetti Bolognese (Chicken)',  description:'Spaghetti with chicken bolognese sauce.',                                   category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['pasta','chicken'] },
    { name:'Spaghetti in Tomato/White Sauce',description:'Spaghetti in tomato or white sauce.',                                      category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:true,  tags:['pasta','vegetarian'] },
    { name:'Spaghetti Carbonara',            description:'Classic spaghetti carbonara.',                                              category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['pasta'] },
    { name:'Spaghetti Shrimp',               description:'Spaghetti with shrimp.',                                                   category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['pasta','seafood'] },
    { name:'Chicken Biryani',                description:'Aromatic chicken biryani.',                                                 category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:30, isVeg:false, tags:['rice','chicken','bestseller'] },
    { name:'Chicken Curry',                  description:'Classic chicken curry.',                                                    category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['curry','chicken'] },
    { name:'Mutton Biryani',                 description:'Aromatic mutton biryani.',                                                  category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:35, isVeg:false, tags:['rice','mutton'] },
    { name:'Mutton Curry',                   description:'Rich mutton curry.',                                                        category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:35, isVeg:false, tags:['curry','mutton'] },
    { name:'Chicken Butter Masala',          description:'Creamy chicken butter masala.',                                             category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['curry','chicken','bestseller'] },
    { name:'Fish Curry',                     description:'Traditional fish curry.',                                                   category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:25, isVeg:false, tags:['curry','seafood'] },
    { name:'Paneer Butter Masala',           description:'Creamy paneer butter masala.',                                             category:'dinner', price:3.98, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:true,  tags:['curry','vegetarian'] },
    { name:'Veg Curry',                      description:'Mixed vegetable curry.',                                                    category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:true,  tags:['curry','vegan'] },
    { name:'Plain Rice',                     description:'Steamed plain basmati rice.',                                               category:'dinner', price:1.66, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:true,  tags:['rice','vegan'] },
    { name:'Plain Roti',                     description:'Fresh plain roti.',                                                         category:'dinner', price:0.66, image:FOOD_IMAGES.maincourse, preparationTime:10, isVeg:true,  tags:['bread','vegan'] },
    { name:'Papad Fry/Dry',                  description:'Crispy papad fried or dry.',                                               category:'dinner', price:1.33, image:FOOD_IMAGES.maincourse, preparationTime:5,  isVeg:true,  tags:['vegan'] },
    // ── OTHER DISHES ──────────────────────────────────────────────────────
    { name:'Chicken Momo',                   description:'Steamed chicken dumplings.',                                                category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['nepali','bestseller'] },
    { name:'Veg Momo',                       description:'Steamed vegetable dumplings.',                                             category:'dinner', price:2.65, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:true,  tags:['nepali','vegetarian'] },
    { name:'Chicken Chowmein',               description:'Stir-fried chicken chowmein noodles.',                                    category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['nepali','noodles'] },
    { name:'Shrimp Chowmein',                description:'Stir-fried shrimp chowmein.',                                             category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['noodles','seafood'] },
    { name:'Veg / Egg Chowmein',             description:'Vegetable or egg chowmein noodles.',                                      category:'dinner', price:2.65, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['nepali','noodles'] },
    { name:'Chicken Fried Rice',             description:'Stir-fried chicken fried rice.',                                          category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['rice','chicken'] },
    { name:'Shrimp Fried Rice',              description:'Stir-fried shrimp fried rice.',                                           category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['rice','seafood'] },
    { name:'Mixed Fried Rice',               description:'Mixed fried rice with assorted toppings.',                                category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['rice'] },
    { name:'Veg / Egg Fried Rice',           description:'Vegetable or egg fried rice.',                                            category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:15, isVeg:false, tags:['rice','vegetarian'] },
    { name:'Chicken Thukpa',                 description:'Nepali chicken noodle soup.',                                             category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['nepali','soup'] },
    { name:'Shrimp Thukpa',                  description:'Nepali shrimp noodle soup.',                                              category:'dinner', price:4.64, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['nepali','soup','seafood'] },
    { name:'Mixed Thukpa',                   description:'Mixed Nepali noodle soup.',                                               category:'dinner', price:5.30, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['nepali','soup'] },
    { name:'Veg / Egg Thukpa',               description:'Vegetable or egg Nepali noodle soup.',                                   category:'dinner', price:3.31, image:FOOD_IMAGES.maincourse, preparationTime:20, isVeg:false, tags:['nepali','soup','vegetarian'] },
    // ── SOFT DRINKS & COFFEE ──────────────────────────────────────────────
    { name:'Real Juice (Mixed Fruit)',        description:'Real mixed fruit juice.',                                                category:'beverages', price:3.15, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['juice','cold'] },
    { name:'Real Juice (Orange)',             description:'Real orange juice.',                                                     category:'beverages', price:3.12, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['juice','cold'] },
    { name:'Real Juice (Mango)',              description:'Real mango juice.',                                                      category:'beverages', price:3.15, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['juice','cold'] },
    { name:'Real Juice (Apple)',              description:'Real apple juice.',                                                      category:'beverages', price:3.15, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['juice','cold'] },
    { name:'Real Juice (Cranberry)',          description:'Real cranberry juice.',                                                  category:'beverages', price:0.99, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['juice','cold'] },
    { name:'Coke/Fanta/Sprite',               description:'Chilled Coke, Fanta, or Sprite.',                                      category:'beverages', price:0.99, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['cold','soda'] },
    { name:'Water',                           description:'Mineral water.',                                                        category:'beverages', price:0.33, image:FOOD_IMAGES.beverages, preparationTime:2, isVeg:true, tags:['cold'] },
    { name:'Americano',                       description:'Classic Americano coffee.',                                             category:'beverages', price:1.06, image:FOOD_IMAGES.bar, preparationTime:5, isVeg:true, tags:['coffee','hot'] },
    { name:'Espresso',                        description:'Short and strong espresso shot.',                                       category:'beverages', price:0.93, image:FOOD_IMAGES.bar, preparationTime:5, isVeg:true, tags:['coffee','hot'] },
    { name:'Cappuccino',                      description:'Creamy cappuccino.',                                                    category:'beverages', price:1.26, image:FOOD_IMAGES.bar, preparationTime:5, isVeg:true, tags:['coffee','hot','bestseller'] },
    { name:'Ice Black Coffee',                description:'Chilled black coffee over ice.',                                       category:'beverages', price:0.99, image:FOOD_IMAGES.bar, preparationTime:5, isVeg:true, tags:['coffee','cold'] },
    // ── BAR — WHISKEY ─────────────────────────────────────────────────────
    { name:'Glenfiddich 12 Years (30 ml)',    description:'Glenfiddich 12 Years single malt Scotch whisky, 30 ml.',               category:'beverages', price:5.24, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey','scotch'] },
    { name:'Double Black (30 ml)',            description:'Johnnie Walker Double Black, 30 ml.',                                   category:'beverages', price:4.57, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey'] },
    { name:'Red Label (JW) (30 ml)',          description:'Johnnie Walker Red Label, 30 ml.',                                     category:'beverages', price:3.12, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey'] },
    { name:'Black Label (JW) (30 ml)',        description:'Johnnie Walker Black Label, 30 ml.',                                   category:'beverages', price:4.04, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey'] },
    { name:'Jack Daniels (30 ml)',            description:'Jack Daniels Tennessee Whiskey, 30 ml.',                               category:'beverages', price:4.51, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey','bestseller'] },
    { name:'Old Durbar (30 ml)',              description:'Old Durbar whisky, 30 ml.',                                            category:'beverages', price:2.06, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey','nepali'] },
    { name:'Old Durbar Black Chimney (30 ml)','description':'Old Durbar Black Chimney whisky, 30 ml.',                           category:'beverages', price:2.59, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey','nepali'] },
    { name:'Gorkhas & Gun (30 ml)',           description:'Gorkhas & Gun whisky, 30 ml.',                                        category:'beverages', price:2.45, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','whiskey','nepali'] },
    // ── BAR — TEQUILA ─────────────────────────────────────────────────────
    { name:'Agavito Tequila Gold/Silver (30 ml)', description:'Agavito Tequila Gold or Silver, 30 ml.',                         category:'beverages', price:3.68, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','tequila'] },
    // ── BAR — LIQUEUR ─────────────────────────────────────────────────────
    { name:"Bailey's Irish Cream (30 ml)",    description:"Bailey's Irish Cream liqueur, 30 ml.",                                category:'beverages', price:3.12, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','liqueur'] },
    { name:'Kahlua (30 ml)',                  description:'Kahlua coffee liqueur, 30 ml.',                                       category:'beverages', price:3.28, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','liqueur'] },
    // ── BAR — VODKA ───────────────────────────────────────────────────────
    { name:'Absolute Vodka (30 ml)',          description:'Absolut Vodka, 30 ml.',                                               category:'beverages', price:3.48, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','vodka'] },
    { name:'8848 Vodka (30 ml)',              description:'8848 Vodka, 30 ml.',                                                  category:'beverages', price:1.49, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','vodka','nepali'] },
    // ── BAR — RUM ─────────────────────────────────────────────────────────
    { name:'Captain Morgan (30 ml)',          description:'Captain Morgan rum, 30 ml.',                                          category:'beverages', price:3.12, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','rum'] },
    { name:'Khukuri Rum (30 ml)',             description:'Khukuri rum, 30 ml.',                                                 category:'beverages', price:4.31, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','rum','nepali'] },
    // ── BAR — WINES ───────────────────────────────────────────────────────
    { name:'Jacob Creek Red (150 ml)',        description:'Jacob Creek red wine, 150 ml glass.',                                 category:'beverages', price:6.96, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','wine','red'] },
    { name:'Jacob Creek White (150 ml)',      description:'Jacob Creek white wine, 150 ml glass.',                               category:'beverages', price:6.96, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','wine','white'] },
    { name:'Big Master Red (150 ml)',         description:'Big Master red wine, 150 ml glass.',                                  category:'beverages', price:2.98, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','wine','red'] },
    { name:'Big Master White (150 ml)',       description:'Big Master white wine, 150 ml glass.',                                category:'beverages', price:2.98, image:FOOD_IMAGES.bar, preparationTime:3, isVeg:true, tags:['bar','wine','white'] },
    // ── BAR — BEER ────────────────────────────────────────────────────────
    { name:'Tuborg Beer (650 ml)',            description:'Chilled Tuborg beer, 650 ml bottle.',                                 category:'beverages', price:4.97, image:FOOD_IMAGES.bar, preparationTime:2, isVeg:true, tags:['bar','beer'] },
    { name:'Gorkha Beer (650 ml)',            description:'Chilled Gorkha Beer, 650 ml bottle.',                                 category:'beverages', price:4.64, image:FOOD_IMAGES.bar, preparationTime:2, isVeg:true, tags:['bar','beer','bestseller'] },
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
  const ingredients = await Ingredient.insertMany([
    // ── Kitchen — Proteins ───────────────────────────────────────────────
    { name:'Chicken (whole/pieces)', unit:'kg',     stock:20,  costPrice:350,  lowStockThreshold:5,  category:'kitchen' },
    { name:'Mutton',                 unit:'kg',     stock:10,  costPrice:900,  lowStockThreshold:3,  category:'kitchen' },
    { name:'Fish (catfish/fillet)',  unit:'kg',     stock:8,   costPrice:500,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Shrimp/Prawn',           unit:'kg',     stock:5,   costPrice:800,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Eggs',                   unit:'piece',  stock:150, costPrice:18,   lowStockThreshold:30, category:'kitchen' },
    { name:'Paneer',                 unit:'kg',     stock:5,   costPrice:450,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Chicken Sausage',        unit:'piece',  stock:40,  costPrice:80,   lowStockThreshold:10, category:'kitchen' },
    // ── Kitchen — Dry Goods ──────────────────────────────────────────────
    { name:'Basmati Rice',           unit:'kg',     stock:30,  costPrice:180,  lowStockThreshold:5,  category:'kitchen' },
    { name:'Spaghetti / Pasta',      unit:'kg',     stock:10,  costPrice:160,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Noodles (chowmein/thukpa)', unit:'kg',  stock:10,  costPrice:140,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Wheat Flour',            unit:'kg',     stock:20,  costPrice:80,   lowStockThreshold:5,  category:'kitchen' },
    { name:'Bread (loaf/slices)',    unit:'piece',  stock:20,  costPrice:120,  lowStockThreshold:5,  category:'kitchen' },
    { name:'Cornflakes',             unit:'packet', stock:15,  costPrice:220,  lowStockThreshold:3,  category:'kitchen' },
    { name:'Oats',                   unit:'kg',     stock:5,   costPrice:200,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Potato',                 unit:'kg',     stock:15,  costPrice:60,   lowStockThreshold:3,  category:'kitchen' },
    { name:'Onion',                  unit:'kg',     stock:10,  costPrice:50,   lowStockThreshold:2,  category:'kitchen' },
    { name:'Tomato',                 unit:'kg',     stock:8,   costPrice:80,   lowStockThreshold:2,  category:'kitchen' },
    { name:'Mixed Vegetables',       unit:'kg',     stock:10,  costPrice:120,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Cabbage',                unit:'kg',     stock:5,   costPrice:50,   lowStockThreshold:1,  category:'kitchen' },
    { name:'Carrot',                 unit:'kg',     stock:5,   costPrice:60,   lowStockThreshold:1,  category:'kitchen' },
    { name:'Mushroom',               unit:'kg',     stock:3,   costPrice:350,  lowStockThreshold:0.5,category:'kitchen' },
    { name:'Butter',                 unit:'kg',     stock:5,   costPrice:600,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Cheese (block)',         unit:'kg',     stock:3,   costPrice:800,  lowStockThreshold:0.5,category:'kitchen' },
    { name:'Cream',                  unit:'litre',  stock:5,   costPrice:400,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Tomato Sauce',           unit:'kg',     stock:5,   costPrice:250,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Cooking Oil',            unit:'litre',  stock:10,  costPrice:300,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Spice Mix (masala)',     unit:'kg',     stock:5,   costPrice:400,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Salt',                   unit:'kg',     stock:5,   costPrice:50,   lowStockThreshold:1,  category:'kitchen' },
    { name:'Cashewnuts',             unit:'kg',     stock:3,   costPrice:1800, lowStockThreshold:0.5,category:'kitchen' },
    { name:'Peanuts',                unit:'kg',     stock:5,   costPrice:300,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Banana',                 unit:'piece',  stock:30,  costPrice:20,   lowStockThreshold:5,  category:'kitchen' },
    { name:'Fresh Fruits (mixed)',   unit:'kg',     stock:10,  costPrice:250,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Milk',                   unit:'litre',  stock:15,  costPrice:120,  lowStockThreshold:3,  category:'kitchen' },
    { name:'Yogurt',                 unit:'kg',     stock:5,   costPrice:180,  lowStockThreshold:1,  category:'kitchen' },
    { name:'Honey',                  unit:'kg',     stock:3,   costPrice:600,  lowStockThreshold:0.5,category:'kitchen' },
    { name:'Jam',                    unit:'bottle', stock:10,  costPrice:250,  lowStockThreshold:2,  category:'kitchen' },
    { name:'Papad',                  unit:'piece',  stock:50,  costPrice:10,   lowStockThreshold:10, category:'kitchen' },
    { name:'Roti Dough',             unit:'kg',     stock:5,   costPrice:80,   lowStockThreshold:1,  category:'kitchen' },
    { name:'Wonton / Momo Wrapper',  unit:'packet', stock:20,  costPrice:120,  lowStockThreshold:5,  category:'kitchen' },
    { name:'Sukuti (dried meat)',    unit:'kg',     stock:2,   costPrice:1200, lowStockThreshold:0.5,category:'kitchen' },
    // ── Bar ──────────────────────────────────────────────────────────────
    { name:'Whiskey (bottle)',       unit:'bottle', stock:20,  costPrice:2800, lowStockThreshold:3,  category:'bar' },
    { name:'Vodka (bottle)',         unit:'bottle', stock:10,  costPrice:2200, lowStockThreshold:2,  category:'bar' },
    { name:'Rum (bottle)',           unit:'bottle', stock:10,  costPrice:2500, lowStockThreshold:2,  category:'bar' },
    { name:'Tequila (bottle)',       unit:'bottle', stock:5,   costPrice:4500, lowStockThreshold:1,  category:'bar' },
    { name:'Liqueur (bottle)',       unit:'bottle', stock:5,   costPrice:3500, lowStockThreshold:1,  category:'bar' },
    { name:'Red Wine (bottle)',      unit:'bottle', stock:10,  costPrice:3000, lowStockThreshold:2,  category:'bar' },
    { name:'White Wine (bottle)',    unit:'bottle', stock:8,   costPrice:2800, lowStockThreshold:2,  category:'bar' },
    { name:'Gorkha Beer (650 ml)',   unit:'bottle', stock:48,  costPrice:350,  lowStockThreshold:12, category:'bar' },
    { name:'Coke / Fanta / Sprite',  unit:'bottle', stock:48,  costPrice:80,   lowStockThreshold:12, category:'bar' },
    { name:'Mineral Water',          unit:'bottle', stock:60,  costPrice:40,   lowStockThreshold:15, category:'bar' },
    { name:'Real Juice (tetra pack)',unit:'piece',  stock:30,  costPrice:180,  lowStockThreshold:8,  category:'bar' },
    { name:'Coffee Beans',           unit:'kg',     stock:4,   costPrice:1800, lowStockThreshold:1,  category:'bar' },
    { name:'Milk (bar)',             unit:'litre',  stock:8,   costPrice:120,  lowStockThreshold:2,  category:'bar' },
    // ── General / Housekeeping ───────────────────────────────────────────
    { name:'Napkins',                unit:'packet', stock:30,  costPrice:120,  lowStockThreshold:5,  category:'general' },
    { name:'Towels (Bath)',          unit:'piece',  stock:80,  costPrice:450,  lowStockThreshold:20, category:'general' },
    { name:'Bed Linen Set',          unit:'piece',  stock:60,  costPrice:1200, lowStockThreshold:10, category:'general' },
    { name:'Shampoo',                unit:'bottle', stock:30,  costPrice:280,  lowStockThreshold:8,  category:'general' },
    { name:'Hand Soap',              unit:'bottle', stock:35,  costPrice:220,  lowStockThreshold:8,  category:'general' },
  ]);
  console.log(`✅ ${ingredients.length} inventory ingredients seeded`);

  // ─── RECIPES (ingredient → menu item linkage for inventory tracking) ──────
  const ingByName = Object.fromEntries(ingredients.map(i => [i.name, i._id]));
  await Recipe.insertMany([
    // ── Breakfast ─────────────────────────────────────────────────────────
    { name:'American Breakfast',          servingLabel:'full set', sellingPrice:750,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Bread (loaf/slices)'],  qtyPerServing:3  },{ ingredient:ingByName['Eggs'],                  qtyPerServing:2  },{ ingredient:ingByName['Chicken Sausage'],        qtyPerServing:2  },{ ingredient:ingByName['Butter'],                qtyPerServing:0.02 },{ ingredient:ingByName['Tomato'],               qtyPerServing:0.1 }] },
    { name:'French Toast',                servingLabel:'2 slices', sellingPrice:240,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Bread (loaf/slices)'],  qtyPerServing:2  },{ ingredient:ingByName['Eggs'],                  qtyPerServing:2  },{ ingredient:ingByName['Butter'],                qtyPerServing:0.02 },{ ingredient:ingByName['Honey'],                qtyPerServing:0.02 }] },
    { name:'Honey Banana Porridge',       servingLabel:'bowl',     sellingPrice:275,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Oats'],                qtyPerServing:0.1 },{ ingredient:ingByName['Banana'],                qtyPerServing:1  },{ ingredient:ingByName['Honey'],                 qtyPerServing:0.02 },{ ingredient:ingByName['Milk'],                 qtyPerServing:0.2 }] },
    { name:'Oats with Milk and Fresh Fruits', servingLabel:'bowl', sellingPrice:250,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Oats'],                qtyPerServing:0.1 },{ ingredient:ingByName['Milk'],                  qtyPerServing:0.2 },{ ingredient:ingByName['Fresh Fruits (mixed)'],  qtyPerServing:0.1 }] },
    { name:'Pancake with Chocolate/Honey/Maple Syrup', servingLabel:'3 pancakes', sellingPrice:275, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Wheat Flour'], qtyPerServing:0.1 },{ ingredient:ingByName['Eggs'], qtyPerServing:1 },{ ingredient:ingByName['Milk'], qtyPerServing:0.1 },{ ingredient:ingByName['Butter'], qtyPerServing:0.02 },{ ingredient:ingByName['Honey'], qtyPerServing:0.02 }] },
    // ── Snacks ────────────────────────────────────────────────────────────
    { name:'Chicken Drumsticks',          servingLabel:'plate of 4', sellingPrice:550, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.4 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.02 },{ ingredient:ingByName['Cooking Oil'], qtyPerServing:0.05 }] },
    { name:'Chicken Satay with Peanut Sauce', servingLabel:'plate of 6', sellingPrice:550, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.3 },{ ingredient:ingByName['Peanuts'], qtyPerServing:0.05 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.02 }] },
    { name:'French Fries',                servingLabel:'plate',    sellingPrice:350,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Potato'],              qtyPerServing:0.3 },{ ingredient:ingByName['Cooking Oil'],            qtyPerServing:0.05 },{ ingredient:ingByName['Salt'],                  qtyPerServing:0.005 }] },
    { name:'Chicken Cashewnuts',          servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.25 },{ ingredient:ingByName['Cashewnuts'],           qtyPerServing:0.05 },{ ingredient:ingByName['Cooking Oil'],           qtyPerServing:0.03 }] },
    { name:'Vegetable Pakoda',            servingLabel:'plate',    sellingPrice:360,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Mixed Vegetables'],   qtyPerServing:0.2 },{ ingredient:ingByName['Wheat Flour'],            qtyPerServing:0.1 },{ ingredient:ingByName['Cooking Oil'],            qtyPerServing:0.05 }] },
    { name:'Cheese Balls',                servingLabel:'plate of 6', sellingPrice:400, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Cheese (block)'],    qtyPerServing:0.1 },{ ingredient:ingByName['Wheat Flour'],            qtyPerServing:0.05 },{ ingredient:ingByName['Cooking Oil'],            qtyPerServing:0.05 }] },
    { name:'Paneer Chilly',               servingLabel:'plate',    sellingPrice:400,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Paneer'],             qtyPerServing:0.2 },{ ingredient:ingByName['Onion'],                  qtyPerServing:0.1 },{ ingredient:ingByName['Tomato'],                 qtyPerServing:0.05 },{ ingredient:ingByName['Cooking Oil'], qtyPerServing:0.03 }] },
    // ── Soup ─────────────────────────────────────────────────────────────
    { name:'Chicken Mushroom Soup',       servingLabel:'bowl',     sellingPrice:400,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.1 },{ ingredient:ingByName['Mushroom'],             qtyPerServing:0.05 },{ ingredient:ingByName['Cream'],                 qtyPerServing:0.05 }] },
    { name:'Chicken Noodle Soup',         servingLabel:'bowl',     sellingPrice:400,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.1 },{ ingredient:ingByName['Noodles (chowmein/thukpa)'], qtyPerServing:0.08 },{ ingredient:ingByName['Carrot'], qtyPerServing:0.03 }] },
    { name:'Vegetables Soup',             servingLabel:'bowl',     sellingPrice:300,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Mixed Vegetables'],   qtyPerServing:0.15 },{ ingredient:ingByName['Tomato'],                 qtyPerServing:0.05 },{ ingredient:ingByName['Onion'],                  qtyPerServing:0.05 }] },
    // ── Salads ────────────────────────────────────────────────────────────
    { name:'Caesar Salad',                servingLabel:'plate',    sellingPrice:700,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Cheese (block)'],       qtyPerServing:0.05 },{ ingredient:ingByName['Eggs'],                  qtyPerServing:1  },{ ingredient:ingByName['Tomato'], qtyPerServing:0.05 }] },
    // ── Sandwich & Burger ─────────────────────────────────────────────────
    { name:'Club Sandwich',               servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Bread (loaf/slices)'],  qtyPerServing:3  },{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.1 },{ ingredient:ingByName['Eggs'],                  qtyPerServing:1  },{ ingredient:ingByName['Tomato'], qtyPerServing:0.05 },{ ingredient:ingByName['Butter'], qtyPerServing:0.02 }] },
    { name:'Chicken Burger',              servingLabel:'piece',    sellingPrice:490,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Bread (loaf/slices)'], qtyPerServing:1  },{ ingredient:ingByName['Tomato'],               qtyPerServing:0.05 },{ ingredient:ingByName['Butter'], qtyPerServing:0.02 }] },
    // ── Main Course ───────────────────────────────────────────────────────
    { name:'Chicken Biryani',             servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.25 },{ ingredient:ingByName['Basmati Rice'],         qtyPerServing:0.15 },{ ingredient:ingByName['Spice Mix (masala)'],    qtyPerServing:0.02 },{ ingredient:ingByName['Onion'], qtyPerServing:0.05 }] },
    { name:'Mutton Biryani',              servingLabel:'plate',    sellingPrice:800,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Mutton'],              qtyPerServing:0.25 },{ ingredient:ingByName['Basmati Rice'],         qtyPerServing:0.15 },{ ingredient:ingByName['Spice Mix (masala)'],    qtyPerServing:0.02 },{ ingredient:ingByName['Onion'], qtyPerServing:0.05 }] },
    { name:'Chicken Butter Masala',       servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.2 },{ ingredient:ingByName['Tomato Sauce'],         qtyPerServing:0.1 },{ ingredient:ingByName['Cream'],                 qtyPerServing:0.05 },{ ingredient:ingByName['Butter'], qtyPerServing:0.03 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.02 }] },
    { name:'Mutton Curry',                servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Mutton'],              qtyPerServing:0.2 },{ ingredient:ingByName['Onion'],               qtyPerServing:0.08 },{ ingredient:ingByName['Tomato'],                 qtyPerServing:0.08 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.02 }] },
    { name:'Paneer Butter Masala',        servingLabel:'plate',    sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Paneer'],             qtyPerServing:0.2 },{ ingredient:ingByName['Tomato Sauce'],         qtyPerServing:0.1 },{ ingredient:ingByName['Cream'],                 qtyPerServing:0.05 },{ ingredient:ingByName['Butter'], qtyPerServing:0.03 }] },
    { name:'Fish Curry',                  servingLabel:'plate',    sellingPrice:700,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Fish (catfish/fillet)'], qtyPerServing:0.2 },{ ingredient:ingByName['Tomato'],             qtyPerServing:0.08 },{ ingredient:ingByName['Onion'],                  qtyPerServing:0.05 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.02 }] },
    { name:'Spaghetti Bolognese (Chicken)', servingLabel:'plate',  sellingPrice:600,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Spaghetti / Pasta'],  qtyPerServing:0.15 },{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Tomato Sauce'],          qtyPerServing:0.1 }] },
    { name:'Spaghetti in Tomato / White Sauce', servingLabel:'plate', sellingPrice:500, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Spaghetti / Pasta'], qtyPerServing:0.15 },{ ingredient:ingByName['Tomato Sauce'],         qtyPerServing:0.1 },{ ingredient:ingByName['Cream'],                 qtyPerServing:0.05 }] },
    { name:'Grilled Whole Fish',          servingLabel:'whole',    sellingPrice:1200, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Fish (catfish/fillet)'], qtyPerServing:0.5 },{ ingredient:ingByName['Spice Mix (masala)'],   qtyPerServing:0.02 },{ ingredient:ingByName['Cooking Oil'],            qtyPerServing:0.03 }] },
    { name:'Plain Rice',                  servingLabel:'plate',    sellingPrice:250,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Basmati Rice'],        qtyPerServing:0.15 }] },
    { name:'Plain Roti',                  servingLabel:'2 pieces', sellingPrice:100,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Wheat Flour'],         qtyPerServing:0.08 },{ ingredient:ingByName['Butter'],                qtyPerServing:0.01 }] },
    // ── Other Dishes (Nepali) ─────────────────────────────────────────────
    { name:'Chicken Momo',                servingLabel:'plate of 10', sellingPrice:500, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.2 },{ ingredient:ingByName['Wonton / Momo Wrapper'], qtyPerServing:1 },{ ingredient:ingByName['Onion'], qtyPerServing:0.05 },{ ingredient:ingByName['Spice Mix (masala)'], qtyPerServing:0.01 }] },
    { name:'Veg Momo',                    servingLabel:'plate of 10', sellingPrice:400, section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Mixed Vegetables'],   qtyPerServing:0.2 },{ ingredient:ingByName['Wonton / Momo Wrapper'], qtyPerServing:1 },{ ingredient:ingByName['Spice Mix (masala)'],    qtyPerServing:0.01 }] },
    { name:'Chicken Chowmein',            servingLabel:'plate',    sellingPrice:500,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Noodles (chowmein/thukpa)'], qtyPerServing:0.15 },{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Cabbage'], qtyPerServing:0.05 },{ ingredient:ingByName['Carrot'], qtyPerServing:0.03 }] },
    { name:'Chicken Fried Rice',          servingLabel:'plate',    sellingPrice:500,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Basmati Rice'],        qtyPerServing:0.15 },{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Eggs'],                  qtyPerServing:1  },{ ingredient:ingByName['Mixed Vegetables'], qtyPerServing:0.05 }] },
    { name:'Shrimp Fried Rice',           servingLabel:'plate',    sellingPrice:700,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Basmati Rice'],        qtyPerServing:0.15 },{ ingredient:ingByName['Shrimp/Prawn'],            qtyPerServing:0.1 },{ ingredient:ingByName['Eggs'],                   qtyPerServing:1  }] },
    { name:'Chicken Thukpa',              servingLabel:'bowl',     sellingPrice:500,  section:'kitchen', isActive:true, ingredients:[{ ingredient:ingByName['Noodles (chowmein/thukpa)'], qtyPerServing:0.12 },{ ingredient:ingByName['Chicken (whole/pieces)'], qtyPerServing:0.15 },{ ingredient:ingByName['Mixed Vegetables'], qtyPerServing:0.08 }] },
    // ── Bar ──────────────────────────────────────────────────────────────
    { name:'Whiskey (30 ml)',             servingLabel:'30 ml peg', sellingPrice:280,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Whiskey (bottle)'],     qtyPerServing:0.03 }] },
    { name:'Whiskey (60 ml)',             servingLabel:'60 ml peg', sellingPrice:555,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Whiskey (bottle)'],     qtyPerServing:0.06 }] },
    { name:'Vodka (30 ml)',               servingLabel:'30 ml',     sellingPrice:225,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Vodka (bottle)'],       qtyPerServing:0.03 }] },
    { name:'Rum (30 ml)',                 servingLabel:'30 ml',     sellingPrice:450,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Rum (bottle)'],         qtyPerServing:0.03 }] },
    { name:'Tequila (30 ml)',             servingLabel:'30 ml',     sellingPrice:940,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Tequila (bottle)'],     qtyPerServing:0.03 }] },
    { name:'Liqueur (30 ml)',             servingLabel:'30 ml',     sellingPrice:455,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Liqueur (bottle)'],     qtyPerServing:0.03 }] },
    { name:'Wine (Glass)',                servingLabel:'150 ml',    sellingPrice:1050, section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Red Wine (bottle)'],    qtyPerServing:0.15 }] },
    { name:'Gorkha Beer (650 ml)',        servingLabel:'bottle',    sellingPrice:750,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Gorkha Beer (650 ml)'], qtyPerServing:1    }] },
    { name:'Cappuccino',                  servingLabel:'cup',       sellingPrice:470,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Coffee Beans'],         qtyPerServing:0.02 },{ ingredient:ingByName['Milk (bar)'],             qtyPerServing:0.15 }] },
    { name:'Americano',                   servingLabel:'cup',       sellingPrice:410,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Coffee Beans'],         qtyPerServing:0.018 }] },
    { name:'Espresso',                    servingLabel:'shot',      sellingPrice:410,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Coffee Beans'],         qtyPerServing:0.015 }] },
    { name:'Coke/Fanta/Sprite',           servingLabel:'bottle',    sellingPrice:150,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Coke / Fanta / Sprite'], qtyPerServing:1   }] },
    { name:'Water',                       servingLabel:'bottle',    sellingPrice:100,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Mineral Water'],        qtyPerServing:1    }] },
    { name:'Real Juice (Mixed Fruit)',    servingLabel:'pack',      sellingPrice:470,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Real Juice (tetra pack)'], qtyPerServing:1 }] },
    { name:'Real Juice (Mango)',          servingLabel:'pack',      sellingPrice:470,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Real Juice (tetra pack)'], qtyPerServing:1 }] },
    { name:'Real Juice (Apple)',          servingLabel:'pack',      sellingPrice:470,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Real Juice (tetra pack)'], qtyPerServing:1 }] },
    { name:'Real Juice (Orange)',         servingLabel:'pack',      sellingPrice:470,  section:'bar', isActive:true, ingredients:[{ ingredient:ingByName['Real Juice (tetra pack)'], qtyPerServing:1 }] },
  ]);
  console.log('✅ Recipes seeded (inventory linked to menu items)');

  // ─── LINK MenuItem → Recipe by name ──────────────────────────────────────
  // For every MenuItem whose name exactly matches a Recipe name, set recipe field.
  const allRecipes = await Recipe.find({}).lean();
  const recipeByName = Object.fromEntries(allRecipes.map(r => [r.name, r._id]));
  let linkedCount = 0;
  for (const mi of menuItems) {
    const recipeId = recipeByName[mi.name];
    if (recipeId) {
      await MenuItem.findByIdAndUpdate(mi._id, { recipe: recipeId });
      linkedCount++;
    }
  }
  console.log(`✅ ${linkedCount}/${menuItems.length} menu items linked to recipes`);

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
  //   - Various room types (superior king → presidential suite)
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
  // we just pick rooms randomly from all 27 (history data, conflicts don't matter for past)

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
