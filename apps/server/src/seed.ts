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
import Reservation from './models/Reservation';
import User from './models/User';
import Ingredient from './models/Ingredient';
import { generateQRToken, generateQRDataUrl } from './utils/generateQR';

// Egyptian-themed Unsplash images (luxury hotel / Egyptian aesthetic)
const ROOM_IMAGES = {
  royal: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200',
    'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1200',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200',
  ],
  suite: [
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200',
  ],
  deluxe: [
    'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=1200',
    'https://images.unsplash.com/photo-1560185127-6a47d4e4d88b?w=1200',
  ],
  standard: [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200',
    'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=1200',
  ],
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
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  dinner: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  snacks: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600',
  beverages: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600',
  desserts: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600',
};

async function seed() {
  await connectDB();

  console.log('🌱 Seeding database...');

  // Clear existing data
  await Promise.all([
    Room.deleteMany({}),
    RoomCategory.deleteMany({}),
    MenuItem.deleteMany({}),
    SpaService.deleteMany({}),
    SpaTherapist.deleteMany({}),
    SpaBooking.deleteMany({}),
    Guest.deleteMany({ email: { $in: ['amira.hassan@guest.com','omar.farouk@guest.com','layla.nour@guest.com','khaled.ali@guest.com','nadia.saleh@guest.com'] } }),
  ]);

  // ─── ROOM CATEGORIES ─────────────────────────────────────────────────
  const categories = await RoomCategory.insertMany([
    { name: 'Standard',    slug: 'standard',    icon: 'Bed',       basePrice: 200,  description: 'Comfortable rooms with all essential amenities for a pleasant stay.' },
    { name: 'Deluxe',      slug: 'deluxe',      icon: 'Star',      basePrice: 360,  description: 'Spacious rooms with premium furnishings and enhanced amenities.' },
    { name: 'Suite',       slug: 'suite',       icon: 'Gem',       basePrice: 580,  description: 'Luxurious suites with separate living areas and panoramic views.' },
    { name: 'Royal',       slug: 'royal',       icon: 'Crown',     basePrice: 950,  description: 'The pinnacle of Egyptian luxury — lavish chambers fit for a pharaoh.' },
    { name: 'Penthouse',   slug: 'penthouse',   icon: 'Sparkles',  basePrice: 1500, description: 'Exclusive top-floor retreats with private terraces and butler service.' },
  ]);
  console.log(`✅ ${categories.length} room categories seeded`);

  // ─── ROOMS (28 rooms — 5 types × 5 floors + 3 penthouses) ───────────
  // Layout:
  //   Floor 1: 101–106  (4 Standard, 2 Deluxe)
  //   Floor 2: 201–206  (4 Standard, 2 Deluxe)
  //   Floor 3: 301–306  (3 Deluxe, 3 Suite)
  //   Floor 4: 401–406  (3 Suite, 3 Royal)
  //   Floor 5: 501–504  (2 Royal, 2 Penthouse)
  //   Floor 6: 601–606  (2 Suite, 2 Royal, 2 Penthouse) — 6 more → total 28
  // Actual layout (6+6+6+5+5 = 28):
  //   Floor 1: 101–106 (4 Standard, 2 Deluxe)      = 6
  //   Floor 2: 201–206 (4 Standard, 2 Deluxe)      = 6
  //   Floor 3: 301–306 (3 Deluxe, 3 Suite)         = 6
  //   Floor 4: 401–405 (2 Suite, 2 Royal, 1 Penthouse) = 5
  //   Floor 5: 501–505 (1 Suite, 2 Royal, 2 Penthouse) = 5
  // Total: 6+6+6+5+5 = 28
  const rooms = await Room.insertMany([
    // ── Floor 1: 4 Standard, 2 Deluxe ──────────────────────────────────
    {
      name: 'Isis Standard Room',
      slug: 'isis-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 200, areaSqm: 30,
      capacity: 2, floorNumber: 1, roomNumber: '101',
      description: 'Blessed by the goddess of home. A well-appointed standard room with all essentials for a pleasant stay.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Work Desk', 'Air Conditioning', 'Wi-Fi'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Ra Standard Room',
      slug: 'ra-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 200, areaSqm: 30,
      capacity: 2, floorNumber: 1, roomNumber: '102',
      description: 'Rise with Ra in this sunlit standard room. Bright and perfectly equipped for the modern traveler.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Air Conditioning', 'Wi-Fi', 'Daily Housekeeping'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Thoth Standard Room',
      slug: 'thoth-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 210, areaSqm: 31,
      capacity: 2, floorNumber: 1, roomNumber: '103',
      description: 'Named after the god of wisdom. Clean, comfortable, and ideal for the thoughtful traveler.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Work Desk', 'Air Conditioning', 'Wi-Fi'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Bastet Standard Room',
      slug: 'bastet-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 210, areaSqm: 32,
      capacity: 2, floorNumber: 1, roomNumber: '104',
      description: 'Graced by the goddess of protection. A cozy retreat with everything you need.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Air Conditioning', 'Wi-Fi', 'Safe'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Horus Deluxe Room',
      slug: 'horus-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 360, areaSqm: 45,
      capacity: 2, floorNumber: 1, roomNumber: '105',
      description: 'The all-seeing eye watches over your comfort. Floor-to-ceiling windows and marble bathroom.',
      amenities: ['Queen Bed', 'Marble Bathroom', 'Floor-to-Ceiling Windows', 'Minibar', 'Smart TV', 'Safe', 'Hair Dryer'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Anubis Deluxe Room',
      slug: 'anubis-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 380, areaSqm: 48,
      capacity: 2, floorNumber: 1, roomNumber: '106',
      description: 'Guardian of luxury. Hand-carved furnishings and warm gold lighting evoking desert sunsets.',
      amenities: ['Queen Bed', 'Rain Shower', 'City View', 'Minibar', 'Smart TV', 'Work Desk', 'Premium Toiletries'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },

    // ── Floor 2: 4 Standard, 2 Deluxe ──────────────────────────────────
    {
      name: 'Sekhmet Standard Room',
      slug: 'sekhmet-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 215, areaSqm: 31,
      capacity: 2, floorNumber: 2, roomNumber: '201',
      description: 'Named after the warrior goddess. Bold, reliable, and comfortable for every guest.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Work Desk', 'Air Conditioning', 'Wi-Fi'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Nut Standard Room',
      slug: 'nut-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 215, areaSqm: 31,
      capacity: 2, floorNumber: 2, roomNumber: '202',
      description: 'Canopied by the sky goddess. Light-filled and serene — a sanctuary above the city.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Air Conditioning', 'Wi-Fi', 'Daily Housekeeping'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Geb Standard Room',
      slug: 'geb-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 220, areaSqm: 32,
      capacity: 2, floorNumber: 2, roomNumber: '203',
      description: 'Grounded in the earth god\'s stability. Solid, comfortable, and reliably excellent.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Work Desk', 'Air Conditioning', 'Wi-Fi', 'Safe'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Hathor Standard Room',
      slug: 'hathor-standard-room',
      type: 'standard', categorySlug: 'standard',
      pricePerNight: 220, areaSqm: 33,
      capacity: 2, floorNumber: 2, roomNumber: '204',
      description: 'Blessed by the goddess of love and music. Warm, inviting, and elegantly furnished.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Air Conditioning', 'Wi-Fi', 'Hair Dryer'],
      images: ROOM_IMAGES.standard, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Seth Deluxe Room',
      slug: 'seth-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 370, areaSqm: 46,
      capacity: 2, floorNumber: 2, roomNumber: '205',
      description: 'Named after the god of storms and power. Bold design with premium materials and city views.',
      amenities: ['Queen Bed', 'Rain Shower', 'City View', 'Minibar', 'Smart TV', 'Work Desk', 'Premium Toiletries', 'Safe'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Nephthys Deluxe Room',
      slug: 'nephthys-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 375, areaSqm: 47,
      capacity: 2, floorNumber: 2, roomNumber: '206',
      description: 'Protected by the goddess of the night. Sophisticated décor with blackout curtains and spa-grade bath.',
      amenities: ['Queen Bed', 'Marble Bathroom', 'Blackout Curtains', 'Minibar', 'Smart TV', 'Espresso Machine', 'Hair Dryer'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },

    // ── Floor 3: 3 Deluxe, 3 Suite ─────────────────────────────────────
    {
      name: 'Khnum Deluxe Room',
      slug: 'khnum-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 390, areaSqm: 50,
      capacity: 2, floorNumber: 3, roomNumber: '301',
      description: 'The creator god inspires this artisan-crafted room. Bespoke furnishings and panoramic windows.',
      amenities: ['Queen Bed', 'Panoramic Windows', 'Rain Shower', 'Minibar', 'Smart TV', 'Work Desk', 'Safe'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Sobek Deluxe Room',
      slug: 'sobek-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 390, areaSqm: 50,
      capacity: 2, floorNumber: 3, roomNumber: '302',
      description: 'Guarded by the crocodile god of the Nile. Strong, sleek, and unapologetically luxurious.',
      amenities: ['Queen Bed', 'River-Inspired Décor', 'Rain Shower', 'Minibar', 'Smart TV', 'Premium Toiletries'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Ptah Deluxe Room',
      slug: 'ptah-deluxe-room',
      type: 'deluxe', categorySlug: 'deluxe',
      pricePerNight: 400, areaSqm: 52,
      capacity: 2, floorNumber: 3, roomNumber: '303',
      description: 'Crafted by the master architect god himself. Precision design, fine materials, perfect comfort.',
      amenities: ['Queen Bed', 'Designer Furniture', 'Marble Bathroom', 'Minibar', 'Smart TV', 'Espresso Machine'],
      images: ROOM_IMAGES.deluxe, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Osiris Suite',
      slug: 'osiris-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 580, areaSqm: 68,
      capacity: 2, floorNumber: 3, roomNumber: '304',
      description: 'Named after the god of rebirth. Dark wood paneling, gold accents, terrace overlooking rooftops.',
      amenities: ['Terrace', 'King Bed', 'Living Room', 'Rain Shower', 'Minibar', 'Smart TV', 'Egyptian Cotton Robes'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Nile Deluxe Suite',
      slug: 'nile-deluxe-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 620, areaSqm: 72,
      capacity: 3, floorNumber: 3, roomNumber: '305',
      description: 'Sweeping river views from a luxury suite with separate living area and deep-soaking tub.',
      amenities: ['River View', 'King Bed', 'Living Area', 'Soaking Tub', 'Rain Shower', 'Minibar', 'Nespresso Machine', '65" Smart TV'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Amun Suite',
      slug: 'amun-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 640, areaSqm: 74,
      capacity: 3, floorNumber: 3, roomNumber: '306',
      description: 'The king of gods lends his grandeur. A spacious suite with hidden bar, private office, and double balcony.',
      amenities: ['Double Balcony', 'King Bed', 'Hidden Bar', 'Private Office', 'Rain Shower', 'Soaking Tub', 'Minibar'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },

    // ── Floor 4: 3 Suite, 2 Royal ───────────────────────────────────────
    {
      name: 'Khepri Suite',
      slug: 'khepri-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 650, areaSqm: 75,
      capacity: 3, floorNumber: 4, roomNumber: '401',
      description: 'The scarab god of renewal blesses this sunrise-facing suite. Floor-to-ceiling east windows and a spa bath.',
      amenities: ['East-Facing Windows', 'King Bed', 'Spa Bath', 'Living Area', 'Rain Shower', 'Minibar', 'Nespresso Machine'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Aten Suite',
      slug: 'aten-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 660, areaSqm: 76,
      capacity: 3, floorNumber: 4, roomNumber: '402',
      description: 'Named for the sun disk — radiant, warm, and enveloping. A full-floor corner suite with dual-aspect views.',
      amenities: ['Corner Suite', 'King Bed', 'Dual-Aspect Views', 'Soaking Tub', 'Rain Shower', 'Minibar', '65" Smart TV'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Montu Suite',
      slug: 'montu-suite',
      type: 'suite', categorySlug: 'suite',
      pricePerNight: 670, areaSqm: 78,
      capacity: 3, floorNumber: 4, roomNumber: '403',
      description: 'The war god commands this bold suite. Dramatic décor, private dining alcove, and premium minibar.',
      amenities: ['Private Dining Alcove', 'King Bed', 'Living Room', 'Rain Shower', 'Premium Minibar', 'Smart TV', 'Espresso Machine'],
      images: ROOM_IMAGES.suite, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: "Cleopatra's Royal Suite",
      slug: 'cleopatras-royal-suite',
      type: 'royal', categorySlug: 'royal',
      pricePerNight: 950, areaSqm: 95,
      capacity: 2, floorNumber: 4, roomNumber: '404',
      description: 'Inspired by Egypt\'s most legendary queen. Lapis lazuli blues, sunken bath of rose petals, private lounge.',
      amenities: ['Sunken Bath', 'King Bed', 'Private Lounge', 'City View', 'Champagne Welcome', 'Walk-in Closet', 'Marble Bathroom', 'Espresso Machine'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Thutmose Royal Chamber',
      slug: 'thutmose-royal-chamber',
      type: 'royal', categorySlug: 'royal',
      pricePerNight: 980, areaSqm: 100,
      capacity: 2, floorNumber: 4, roomNumber: '405',
      description: 'Bearing the name of Egypt\'s greatest warrior pharaoh. A majestic royal chamber with battle-inspired art and panoramic views.',
      amenities: ['King Bed', 'Panoramic Views', 'Jacuzzi', 'Private Lounge', 'Walk-in Wardrobe', 'Butler Service', '75" Smart TV', 'Fireplace'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },

    // ── Floor 5: 2 Royal, 3 Penthouse ──────────────────────────────────
    {
      name: "Pharaoh's Royal Chamber",
      slug: 'pharaohs-royal-chamber',
      type: 'royal', categorySlug: 'royal',
      pricePerNight: 1200, areaSqm: 120,
      capacity: 2, floorNumber: 5, roomNumber: '501',
      description: 'The crown jewel of Royal Suites. 120 sqm with hand-painted hieroglyphics, private pool terrace, and 24K gold-leaf accents.',
      amenities: ['Private Pool', 'King Bed', 'Butler Service', '24K Gold Fixtures', 'Private Terrace', 'Jacuzzi', 'Fireplace', 'Walk-in Wardrobe', 'Nespresso Machine', '75" Smart TV'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Ramesses Royal Chamber',
      slug: 'ramesses-royal-chamber',
      type: 'royal', categorySlug: 'royal',
      pricePerNight: 1100, areaSqm: 110,
      capacity: 2, floorNumber: 5, roomNumber: '502',
      description: 'Named for Ramesses the Great. Colossal proportions, opulent décor, and a private terrace with unmatched city views.',
      amenities: ['Private Terrace', 'King Bed', 'Butler Service', 'Jacuzzi', 'Walk-in Wardrobe', 'Nespresso Machine', '75" Smart TV', 'Marble Bathroom'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Horizon Penthouse',
      slug: 'horizon-penthouse',
      type: 'penthouse', categorySlug: 'penthouse',
      pricePerNight: 1500, areaSqm: 180,
      capacity: 4, floorNumber: 5, roomNumber: '503',
      description: 'Where the sky meets the city. A sweeping 180 sqm penthouse with wraparound terrace, private plunge pool, and dedicated concierge.',
      amenities: ['Wraparound Terrace', 'Plunge Pool', 'King Bed', 'Separate Living & Dining', 'Butler', 'Jacuzzi', 'Home Cinema', 'Full Kitchen', 'Fireplace'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Nile Crown Penthouse',
      slug: 'nile-crown-penthouse',
      type: 'penthouse', categorySlug: 'penthouse',
      pricePerNight: 1600, areaSqm: 200,
      capacity: 4, floorNumber: 5, roomNumber: '504',
      description: 'The pinnacle of Egyptian luxury. 200 sqm of absolute opulence with direct Nile views, personal chef service, and a rooftop garden.',
      amenities: ['Rooftop Garden', 'Plunge Pool', 'King Bed', 'Personal Chef', 'Butler', 'Home Cinema', 'Full Kitchen', 'Private Gym', 'Jacuzzi'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
    {
      name: 'Dynasty Penthouse',
      slug: 'dynasty-penthouse',
      type: 'penthouse', categorySlug: 'penthouse',
      pricePerNight: 1800, areaSqm: 220,
      capacity: 6, floorNumber: 5, roomNumber: '505',
      description: 'Built for dynasties. A sprawling 220 sqm penthouse with private pool deck, 360° views, two king suites, and full entertainment suite.',
      amenities: ['Private Pool Deck', '360° Views', '2× King Beds', 'Entertainment Suite', 'Personal Chef', 'Butler', 'Full Kitchen', 'Private Gym', 'Wine Cellar'],
      images: ROOM_IMAGES.royal, isAvailable: true, qrToken: generateQRToken(),
    },
  ]);

  // Generate qrCodeUrl for each seeded room
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  await Promise.all(rooms.map(async (room) => {
    const qrCodeUrl = await generateQRDataUrl(room.qrToken, clientUrl);
    await Room.findByIdAndUpdate(room._id, { qrCodeUrl });
  }));

  console.log(`✅ ${rooms.length} rooms seeded`);

  // ─── MENU ITEMS ───────────────────────────────────────────────────────
  const menuItems = await MenuItem.insertMany([
    // Breakfast
    {
      name: 'Egyptian Ful Medames',
      description: 'Slow-cooked fava beans with olive oil, cumin, lemon, and fresh herbs. Served with warm baladi bread.',
      category: 'breakfast',
      price: 18,
      image: FOOD_IMAGES.breakfast,
      preparationTime: 15,
      isVeg: true,
      tags: ['traditional', 'vegan', 'gluten-free'],
    },
    {
      name: 'Royal Breakfast Platter',
      description: 'A lavish spread of scrambled eggs, smoked salmon, fresh fruit, assorted pastries, and Egyptian cheese.',
      category: 'breakfast',
      price: 35,
      image: FOOD_IMAGES.breakfast,
      preparationTime: 20,
      isVeg: false,
      tags: ['premium', 'bestseller'],
    },
    {
      name: 'Pharaoh\'s Shakshuka',
      description: 'Poached eggs in spiced tomato and harissa sauce with feta cheese. Served with sourdough toast.',
      category: 'breakfast',
      price: 22,
      image: FOOD_IMAGES.breakfast,
      preparationTime: 18,
      isVeg: true,
      tags: ['vegetarian', 'spicy'],
    },
    // Lunch
    {
      name: 'Grilled Sea Bass Nile Style',
      description: 'Whole sea bass grilled with Egyptian spices, served with saffron rice and charred vegetables.',
      category: 'lunch',
      price: 48,
      image: FOOD_IMAGES.lunch,
      preparationTime: 30,
      isVeg: false,
      tags: ['seafood', 'premium'],
    },
    {
      name: 'Kofta Royal Platter',
      description: 'Tender minced lamb kofta skewers with tahini sauce, tabbouleh, and freshly baked pita.',
      category: 'lunch',
      price: 42,
      image: FOOD_IMAGES.lunch,
      preparationTime: 25,
      isVeg: false,
      tags: ['lamb', 'traditional'],
    },
    {
      name: 'Lentil Soup du Pharaon',
      description: 'Velvety Egyptian red lentil soup with cumin and crispy fried onions. Served with lemon wedge.',
      category: 'lunch',
      price: 16,
      image: FOOD_IMAGES.lunch,
      preparationTime: 10,
      isVeg: true,
      tags: ['vegan', 'soup', 'traditional'],
    },
    // Dinner
    {
      name: 'Rack of Lamb — Pharaoh\'s Cut',
      description: 'Premium rack of lamb marinated in Egyptian dukkah, slow-roasted to perfection. Served with pomegranate jus and truffle mashed potato.',
      category: 'dinner',
      price: 95,
      image: FOOD_IMAGES.dinner,
      preparationTime: 45,
      isVeg: false,
      tags: ['premium', 'signature', 'lamb'],
    },
    {
      name: 'Hamam Mahshi',
      description: 'Whole pigeon stuffed with freekeh grain, pine nuts, and aromatic spices — a classic Egyptian royal dish.',
      category: 'dinner',
      price: 78,
      image: FOOD_IMAGES.dinner,
      preparationTime: 50,
      isVeg: false,
      tags: ['signature', 'traditional', 'premium'],
    },
    {
      name: 'Molokhia with Chicken',
      description: 'Silky jute leaf stew with tender slow-cooked chicken. The dish of Egyptian royalty for millennia.',
      category: 'dinner',
      price: 52,
      image: FOOD_IMAGES.dinner,
      preparationTime: 35,
      isVeg: false,
      tags: ['traditional', 'bestseller'],
    },
    // Snacks
    {
      name: 'Mezze Royal',
      description: 'Selection of hummus, baba ghanoush, tzatziki, olives, and warm pita triangles.',
      category: 'snacks',
      price: 28,
      image: FOOD_IMAGES.snacks,
      preparationTime: 10,
      isVeg: true,
      tags: ['vegetarian', 'sharing', 'cold'],
    },
    {
      name: 'Truffle Falafel Bites',
      description: 'Crispy golden falafel with truffle oil and tahini dipping sauce.',
      category: 'snacks',
      price: 20,
      image: FOOD_IMAGES.snacks,
      preparationTime: 12,
      isVeg: true,
      tags: ['vegan', 'crispy'],
    },
    // Beverages
    {
      name: 'Karkade (Hibiscus Elixir)',
      description: 'Chilled hibiscus flower tea — Egypt\'s ancient royal drink, lightly sweetened with cane sugar.',
      category: 'beverages',
      price: 12,
      image: FOOD_IMAGES.beverages,
      preparationTime: 5,
      isVeg: true,
      tags: ['cold', 'traditional', 'no-caffeine'],
    },
    {
      name: 'Saffron Mint Tea',
      description: 'Hot premium Egyptian mint tea infused with Kashmiri saffron strands.',
      category: 'beverages',
      price: 14,
      image: FOOD_IMAGES.beverages,
      preparationTime: 5,
      isVeg: true,
      tags: ['hot', 'traditional', 'premium'],
    },
    {
      name: 'Royal Gold Cocktail',
      description: 'Aged whisky, honey, saffron syrup, and fresh lemon. Non-alcoholic version available on request.',
      category: 'beverages',
      price: 22,
      image: FOOD_IMAGES.beverages,
      preparationTime: 7,
      isVeg: true,
      tags: ['cocktail', 'premium', 'signature'],
    },
    // Desserts
    {
      name: "Umm Ali",
      description: 'Egypt\'s beloved warm bread pudding with cream, nuts, and coconut. Served fresh from the oven.',
      category: 'desserts',
      price: 24,
      image: FOOD_IMAGES.desserts,
      preparationTime: 20,
      isVeg: true,
      tags: ['traditional', 'warm', 'bestseller'],
    },
    {
      name: 'Konafa Royal',
      description: 'Crispy shredded pastry filled with clotted cream and drizzled with rose water sugar syrup.',
      category: 'desserts',
      price: 22,
      image: FOOD_IMAGES.desserts,
      preparationTime: 15,
      isVeg: true,
      tags: ['traditional', 'crispy', 'sweet'],
    },
    {
      name: 'Gold Leaf Baklava',
      description: 'Layers of filo pastry with pistachio and walnut, finished with edible 24K gold leaf and orange blossom honey.',
      category: 'desserts',
      price: 28,
      image: FOOD_IMAGES.desserts,
      preparationTime: 5,
      isVeg: true,
      tags: ['premium', 'signature', 'gold'],
    },
  ]);

  console.log(`✅ ${menuItems.length} menu items seeded`);

  // ─── SPA SERVICES ─────────────────────────────────────────────────────
  const TIME_SLOTS = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '12:00' },
    { startTime: '12:00', endTime: '13:00' },
    { startTime: '14:00', endTime: '15:00' },
    { startTime: '15:00', endTime: '16:00' },
    { startTime: '16:00', endTime: '17:00' },
    { startTime: '17:00', endTime: '18:00' },
    { startTime: '19:00', endTime: '20:00' },
    { startTime: '20:00', endTime: '21:00' },
  ];

  const LONG_SLOTS = [
    { startTime: '09:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '13:00' },
    { startTime: '14:00', endTime: '16:00' },
    { startTime: '16:00', endTime: '18:00' },
    { startTime: '19:00', endTime: '21:00' },
  ];

  const spaServices = await SpaService.insertMany([
    {
      name: "Cleopatra's Milk & Honey Ritual",
      description: 'The legendary beauty ritual of ancient Egypt. A full-body exfoliation with raw honey scrub followed by a warm milk and essential oils soak, ending with a gold-infused moisturizing wrap.',
      duration: 90,
      price: 320,
      image: SPA_IMAGES[0],
      category: 'body_wrap',
      isAvailable: true,
      slots: LONG_SLOTS,
    },
    {
      name: 'Nile Stone Hot Therapy',
      description: 'Smooth basalt stones heated in Nile-inspired mineral water, placed along energy meridians to release deep muscle tension. Combined with aromatic essential oil massage.',
      duration: 75,
      price: 240,
      image: SPA_IMAGES[1],
      category: 'massage',
      isAvailable: true,
      slots: LONG_SLOTS,
    },
    {
      name: 'Pharaoh\'s Deep Tissue Massage',
      description: 'A powerful deep-tissue massage using ancient Egyptian pressure techniques, targeting chronic tension and restoring the body\'s natural flow of energy.',
      duration: 60,
      price: 180,
      image: SPA_IMAGES[2],
      category: 'massage',
      isAvailable: true,
      slots: TIME_SLOTS,
    },
    {
      name: 'Desert Rose Facial',
      description: 'A rejuvenating facial using desert rose extract, 24K gold serum, and Egyptian frankincense. Leaves skin luminous, toned, and worthy of royalty.',
      duration: 60,
      price: 195,
      image: SPA_IMAGES[3],
      category: 'facial',
      isAvailable: true,
      slots: TIME_SLOTS,
    },
    {
      name: 'Hydrotherapy Ritual',
      description: 'A therapeutic water journey through mineral pools, hydro-jet loungers, and steam rooms infused with eucalyptus and oud. A complete sensory reset.',
      duration: 90,
      price: 280,
      image: SPA_IMAGES[4],
      category: 'hydrotherapy',
      isAvailable: true,
      slots: LONG_SLOTS,
    },
    {
      name: "Couples' Golden Journey",
      description: 'For two souls. Begin with champagne and Egyptian dates in your private suite, followed by synchronized full-body massages with gold and jasmine oils, concluding with a shared rose petal bath.',
      duration: 120,
      price: 680,
      image: SPA_IMAGES[0],
      category: 'couples',
      isAvailable: true,
      slots: [
        { startTime: '10:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '16:00' },
        { startTime: '18:00', endTime: '20:00' },
      ],
    },
  ]);

  console.log(`✅ ${spaServices.length} spa services seeded`);

  // ─── SPA THERAPISTS ───────────────────────────────────────────────────
  // Map services by name for easy reference
  const spaByName = Object.fromEntries(spaServices.map(s => [s.name, s._id]));

  // Each therapist specialises in a subset of services
  // One therapist per service so a single booking fills the slot (enables slot-conflict E2E tests).
  // Admin can add more therapists via the UI after seed.
  const therapists = await SpaTherapist.insertMany([
    {
      name: 'Nefertari Hassan',
      specializations: [
        spaByName["Cleopatra's Milk & Honey Ritual"],
        spaByName['Desert Rose Facial'],
      ],
      breakDuration: 15,
      isActive: true,
    },
    {
      name: 'Ramses Khalil',
      specializations: [
        spaByName['Nile Stone Hot Therapy'],
        spaByName["Pharaoh's Deep Tissue Massage"],
      ],
      breakDuration: 15,
      isActive: true,
    },
    {
      name: 'Isis Mostafa',
      specializations: [
        spaByName['Hydrotherapy Ritual'],
        spaByName["Couples' Golden Journey"],
      ],
      breakDuration: 15,
      isActive: true,
    },
  ]);
  console.log(`✅ ${therapists.length} spa therapists seeded`);

  // ─── SPA DEMO BOOKINGS ───────────────────────────────────────────────
  // Create 5 lightweight guest stubs so the Schedule / All Bookings tabs
  // show realistic data immediately after seed. Each guest gets a stub
  // reservation + bill (no real payment), then spa bookings spread across
  // today with varied statuses so every Gantt colour + live tracker is visible.

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helpers
  function todayISO() { return today.toISOString().split('T')[0]; }
  function addMin(hhmm: string, mins: number) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + mins;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  const guestDefs = [
    { name: 'Amira Hassan',  email: 'amira.hassan@guest.com',  phone: '+977-9841000001' },
    { name: 'Omar Farouk',   email: 'omar.farouk@guest.com',   phone: '+977-9841000002' },
    { name: 'Layla Nour',    email: 'layla.nour@guest.com',    phone: '+977-9841000003' },
    { name: 'Khaled Ali',    email: 'khaled.ali@guest.com',    phone: '+977-9841000004' },
    { name: 'Nadia Saleh',   email: 'nadia.saleh@guest.com',   phone: '+977-9841000005' },
  ];

  // Seed guests with stub reservations + bills
  const seededGuests = await Promise.all(guestDefs.map(async (gd, i) => {
    const stubRoom = rooms[i % rooms.length];
    const res = await Reservation.create({
      guest: { name: gd.name, email: gd.email, phone: gd.phone, idProof: '' },
      room: stubRoom._id,
      checkInDate: today,
      checkOutDate: new Date(today.getTime() + 3 * 86400000),
      numberOfGuests: 1,
      status: 'checked_in',
      specialRequests: '',
      totalNights: 3,
      roomCharges: stubRoom.pricePerNight * 3,
    });
    const bill = await Bill.create({
      guest: new mongoose.Types.ObjectId(), // temp placeholder; updated below
      reservation: res._id,
      lineItems: [],
      roomCharges: stubRoom.pricePerNight * 3,
      foodCharges: 0, spaCharges: 0, otherCharges: 0,
      totalAmount: stubRoom.pricePerNight * 3,
      taxAmount: 0, grandTotal: stubRoom.pricePerNight * 3,
      status: 'open',
    });
    const guest = await Guest.create({
      reservation: res._id,
      room: stubRoom._id,
      name: gd.name,
      email: gd.email,
      phone: gd.phone,
      checkInTime: today,
      qrSessionToken: generateQRToken(),
      qrSessionExpiry: new Date(today.getTime() + 7 * 86400000),
      isActive: true,
      bill: bill._id,
    });
    // patch bill.guest
    await Bill.findByIdAndUpdate(bill._id, { guest: guest._id });
    // mark room occupied so isAvailable matches the checked-in state
    await Room.findByIdAndUpdate(stubRoom._id, { isAvailable: false });
    return guest;
  }));

  // Map therapist by name for easy lookup
  const tByName = Object.fromEntries(therapists.map((t: any) => [t.name, t]));
  // Map service by name
  const sByName = Object.fromEntries(spaServices.map((s: any) => [s.name, s]));

  // Build bookings: spread across today's timeline so the Gantt looks populated
  // Layout (therapist → service → slot → status):
  //   Nefertari Hassan  | Cleopatra Ritual  | 09:30 completed
  //   Nefertari Hassan  | Desert Rose Facial| 11:30 in_progress (live right now)
  //   Nefertari Hassan  | Cleopatra Ritual  | 14:00 confirmed
  //   Ramses Khalil     | Nile Stone Hot    | 10:00 completed
  //   Ramses Khalil     | Deep Tissue       | 13:00 arrived
  //   Ramses Khalil     | Nile Stone Hot    | 15:30 pending
  //   Isis Mostafa      | Hydrotherapy      | 09:00 completed
  //   Isis Mostafa      | Couples Golden    | 11:00 cancelled
  //   Isis Mostafa      | Hydrotherapy      | 15:00 confirmed
  const bookingDefs = [
    // Nefertari Hassan — completed earlier, in_progress now, confirmed later
    {
      guest: seededGuests[0], therapist: tByName['Nefertari Hassan'],
      service: sByName["Cleopatra's Milk & Honey Ritual"],
      scheduledStart: '09:30', status: 'completed',
      actualStart: '09:30', actualEnd: '10:30', addedToBill: true,
    },
    {
      guest: seededGuests[1], therapist: tByName['Nefertari Hassan'],
      service: sByName['Desert Rose Facial'],
      scheduledStart: '11:30', status: 'in_progress',
      actualStart: '11:30', actualEnd: '',
    },
    {
      guest: seededGuests[2], therapist: tByName['Nefertari Hassan'],
      service: sByName["Cleopatra's Milk & Honey Ritual"],
      scheduledStart: '14:00', status: 'confirmed',
    },

    // Ramses Khalil — completed, arrived, pending
    {
      guest: seededGuests[3], therapist: tByName['Ramses Khalil'],
      service: sByName['Nile Stone Hot Therapy'],
      scheduledStart: '10:00', status: 'completed',
      actualStart: '10:00', actualEnd: '11:30', addedToBill: true,
    },
    {
      guest: seededGuests[4], therapist: tByName['Ramses Khalil'],
      service: sByName["Pharaoh's Deep Tissue Massage"],
      scheduledStart: '13:00', status: 'arrived',
      actualStart: '13:05', actualEnd: '',
    },
    {
      guest: seededGuests[0], therapist: tByName['Ramses Khalil'],
      service: sByName['Nile Stone Hot Therapy'],
      scheduledStart: '15:30', status: 'pending',
    },

    // Isis Mostafa — completed, cancelled, confirmed
    {
      guest: seededGuests[1], therapist: tByName['Isis Mostafa'],
      service: sByName['Hydrotherapy Ritual'],
      scheduledStart: '09:00', status: 'completed',
      actualStart: '09:00', actualEnd: '10:00', addedToBill: true,
    },
    {
      guest: seededGuests[2], therapist: tByName['Isis Mostafa'],
      service: sByName["Couples' Golden Journey"],
      scheduledStart: '11:00', status: 'cancelled',
    },
    {
      guest: seededGuests[3], therapist: tByName['Isis Mostafa'],
      service: sByName['Hydrotherapy Ritual'],
      scheduledStart: '15:00', status: 'confirmed',
    },
  ];

  const spaBookings = await SpaBooking.insertMany(
    bookingDefs.map(def => ({
      guest: def.guest._id,
      service: def.service._id,
      therapist: def.therapist._id,
      date: today,
      scheduledStart: def.scheduledStart,
      scheduledEnd: addMin(def.scheduledStart, def.service.duration),
      actualStart: (def as any).actualStart ?? '',
      actualEnd: (def as any).actualEnd ?? '',
      durationSnapshot: def.service.duration,
      window: 'any',
      status: def.status,
      price: def.service.price,
      addedToBill: (def as any).addedToBill ?? false,
      isWalkIn: false,
    }))
  );
  console.log(`✅ ${spaBookings.length} demo spa bookings seeded`);

  // ─── DROP OLD ADMIN ───────────────────────────────────────────────────
  const deleted = await User.deleteMany({ email: 'admin@royalsuites.com' });
  if (deleted.deletedCount > 0) console.log('🗑️  Old admin user removed');

  // ─── SUPER ADMIN (seeded once, no department) ─────────────────────────
  const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
  if (!existingSuperAdmin) {
    await User.create({
      name: 'Royal Super Admin',
      email: 'superadmin@royalsuites.com',
      password: 'RoyalAdmin@123',
      role: 'super_admin',
      department: null,
    });
    console.log('✅ Super admin created: superadmin@royalsuites.com / RoyalAdmin@123');
  }

  // ─── DEPARTMENT STAFF (seeded once each) ─────────────────────────────
  const deptUsers = [
    { name: 'Food & Bar Manager',   email: 'food@royalsuites.com',       password: 'Food@1234',      department: 'food' },
    { name: 'Spa Manager',          email: 'spa@royalsuites.com',         password: 'Spa@12345',      department: 'spa' },
    { name: 'Front Desk Manager',   email: 'frontdesk@royalsuites.com',   password: 'FrontDesk@123',  department: 'front_desk' },
  ];
  for (const u of deptUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create({ ...u, role: 'admin' });
      console.log(`✅ ${u.department} user created: ${u.email} / ${u.password}`);
    }
  }

  // ─── INVENTORY (INGREDIENTS) ─────────────────────────────────────────
  await Ingredient.deleteMany({});
  await Ingredient.insertMany([
    // Kitchen
    { name: 'Chicken Breast',       unit: 'kg',     stock: 15,   costPrice: 850,  lowStockThreshold: 3,  category: 'kitchen' },
    { name: 'Beef Tenderloin',       unit: 'kg',     stock: 8,    costPrice: 1800, lowStockThreshold: 2,  category: 'kitchen' },
    { name: 'Salmon Fillet',         unit: 'kg',     stock: 6,    costPrice: 1600, lowStockThreshold: 2,  category: 'kitchen' },
    { name: 'Eggs',                  unit: 'piece',  stock: 120,  costPrice: 18,   lowStockThreshold: 24, category: 'kitchen' },
    { name: 'Butter',                unit: 'kg',     stock: 5,    costPrice: 600,  lowStockThreshold: 1,  category: 'kitchen' },
    { name: 'Olive Oil',             unit: 'litre',  stock: 8,    costPrice: 900,  lowStockThreshold: 2,  category: 'kitchen' },
    { name: 'All-Purpose Flour',     unit: 'kg',     stock: 20,   costPrice: 120,  lowStockThreshold: 5,  category: 'kitchen' },
    { name: 'Basmati Rice',          unit: 'kg',     stock: 25,   costPrice: 180,  lowStockThreshold: 5,  category: 'kitchen' },
    { name: 'Tomatoes',              unit: 'kg',     stock: 10,   costPrice: 80,   lowStockThreshold: 3,  category: 'kitchen' },
    { name: 'Onions',                unit: 'kg',     stock: 12,   costPrice: 50,   lowStockThreshold: 3,  category: 'kitchen' },
    { name: 'Garlic',                unit: 'kg',     stock: 3,    costPrice: 250,  lowStockThreshold: 1,  category: 'kitchen' },
    { name: 'Cumin',                 unit: 'g',      stock: 500,  costPrice: 2,    lowStockThreshold: 100, category: 'kitchen' },
    { name: 'Saffron',               unit: 'g',      stock: 50,   costPrice: 45,   lowStockThreshold: 10, category: 'kitchen' },
    { name: 'Heavy Cream',           unit: 'litre',  stock: 6,    costPrice: 450,  lowStockThreshold: 2,  category: 'kitchen' },
    { name: 'Fava Beans',            unit: 'kg',     stock: 10,   costPrice: 120,  lowStockThreshold: 2,  category: 'kitchen' },
    { name: 'Feta Cheese',           unit: 'kg',     stock: 4,    costPrice: 950,  lowStockThreshold: 1,  category: 'kitchen' },
    { name: 'Pistachio',             unit: 'kg',     stock: 3,    costPrice: 2200, lowStockThreshold: 0.5, category: 'kitchen' },
    { name: 'Filo Pastry',           unit: 'packet', stock: 12,   costPrice: 280,  lowStockThreshold: 3,  category: 'kitchen' },
    // Bar
    { name: 'Orange Juice',          unit: 'litre',  stock: 20,   costPrice: 180,  lowStockThreshold: 5,  category: 'bar' },
    { name: 'Mango Juice',           unit: 'litre',  stock: 15,   costPrice: 200,  lowStockThreshold: 4,  category: 'bar' },
    { name: 'Sparkling Water',       unit: 'bottle', stock: 48,   costPrice: 120,  lowStockThreshold: 12, category: 'bar' },
    { name: 'Still Water',           unit: 'bottle', stock: 60,   costPrice: 60,   lowStockThreshold: 12, category: 'bar' },
    { name: 'Whole Milk',            unit: 'litre',  stock: 10,   costPrice: 130,  lowStockThreshold: 3,  category: 'bar' },
    { name: 'Coffee Beans',          unit: 'kg',     stock: 4,    costPrice: 1800, lowStockThreshold: 1,  category: 'bar' },
    { name: 'Earl Grey Tea',         unit: 'packet', stock: 10,   costPrice: 350,  lowStockThreshold: 2,  category: 'bar' },
    { name: 'Honey',                 unit: 'kg',     stock: 5,    costPrice: 600,  lowStockThreshold: 1,  category: 'bar' },
    { name: 'Mint Leaves',           unit: 'g',      stock: 400,  costPrice: 3,    lowStockThreshold: 100, category: 'bar' },
    // General
    { name: 'Napkins',               unit: 'packet', stock: 30,   costPrice: 120,  lowStockThreshold: 5,  category: 'general' },
    { name: 'Candles',               unit: 'piece',  stock: 50,   costPrice: 80,   lowStockThreshold: 10, category: 'general' },
    { name: 'Toilet Paper',          unit: 'packet', stock: 40,   costPrice: 180,  lowStockThreshold: 10, category: 'general' },
    { name: 'Hand Soap',             unit: 'bottle', stock: 35,   costPrice: 220,  lowStockThreshold: 8,  category: 'general' },
    { name: 'Shampoo',               unit: 'bottle', stock: 30,   costPrice: 280,  lowStockThreshold: 8,  category: 'general' },
    { name: 'Towels (Bath)',         unit: 'piece',  stock: 80,   costPrice: 450,  lowStockThreshold: 20, category: 'general' },
    { name: 'Bed Linen Set',         unit: 'piece',  stock: 60,   costPrice: 1200, lowStockThreshold: 10, category: 'general' },
  ]);
  console.log('✅ 35 inventory ingredients seeded');

  console.log('🏰 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
