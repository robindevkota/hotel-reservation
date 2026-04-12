import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import Room from './models/Room';
import MenuItem from './models/MenuItem';
import SpaService from './models/SpaService';
import SpaTherapist from './models/SpaTherapist';
import SpaBooking from './models/SpaBooking';
import Guest from './models/Guest';
import Bill from './models/Bill';
import Reservation from './models/Reservation';
import User from './models/User';
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
    MenuItem.deleteMany({}),
    SpaService.deleteMany({}),
    SpaTherapist.deleteMany({}),
    SpaBooking.deleteMany({}),
    Guest.deleteMany({ email: { $in: ['amira.hassan@guest.com','omar.farouk@guest.com','layla.nour@guest.com','khaled.ali@guest.com','nadia.saleh@guest.com'] } }),
  ]);

  // ─── ROOMS ───────────────────────────────────────────────────────────
  const rooms = await Room.insertMany([
    {
      name: "Pharaoh's Royal Chamber",
      slug: 'pharaohs-royal-chamber',
      type: 'royal',
      pricePerNight: 1200,
      capacity: 2,
      floorNumber: 8,
      roomNumber: '801',
      description: 'The crown jewel of Royal Suites. A 120 sqm masterpiece adorned with hand-painted hieroglyphics, a private pool terrace with panoramic Nile views, and 24K gold-leaf accents throughout. Your throne awaits.',
      amenities: ['Private Pool', 'King Bed', 'Butler Service', '24K Gold Fixtures', 'Private Terrace', 'Jacuzzi', 'Fireplace', 'Walk-in Wardrobe', 'Nespresso Machine', '75" Smart TV'],
      images: ROOM_IMAGES.royal,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: "Cleopatra's Suite",
      slug: 'cleopatras-suite',
      type: 'royal',
      pricePerNight: 950,
      capacity: 2,
      floorNumber: 7,
      roomNumber: '701',
      description: 'Inspired by Egypt\'s most legendary queen. Draped in lapis lazuli blues and ivory, with a sunken bath of rose petals, private lounge, and breathtaking city views. Fit for a goddess.',
      amenities: ['Sunken Bath', 'King Bed', 'Private Lounge', 'City View', 'Champagne Welcome', 'Walk-in Closet', 'Marble Bathroom', 'Espresso Machine'],
      images: ROOM_IMAGES.royal,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Nile Deluxe Suite',
      slug: 'nile-deluxe-suite',
      type: 'suite',
      pricePerNight: 650,
      capacity: 3,
      floorNumber: 6,
      roomNumber: '601',
      description: 'Sweeping river views from a luxury suite with separate living area, Egyptian cotton linens, and a deep-soaking tub. The Nile flows at your feet.',
      amenities: ['River View', 'King Bed', 'Living Area', 'Soaking Tub', 'Rain Shower', 'Minibar', 'Nespresso Machine', '65" Smart TV'],
      images: ROOM_IMAGES.suite,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Osiris Suite',
      slug: 'osiris-suite',
      type: 'suite',
      pricePerNight: 580,
      capacity: 2,
      floorNumber: 6,
      roomNumber: '602',
      description: 'Named after the god of rebirth, this suite offers a sanctuary of peace and luxury. Dark wood paneling, gold accents, and a terrace overlooking ancient rooftops.',
      amenities: ['Terrace', 'King Bed', 'Living Room', 'Rain Shower', 'Minibar', 'Smart TV', 'Egyptian Cotton Robes'],
      images: ROOM_IMAGES.suite,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Anubis Deluxe Room',
      slug: 'anubis-deluxe-room',
      type: 'deluxe',
      pricePerNight: 380,
      capacity: 2,
      floorNumber: 4,
      roomNumber: '401',
      description: 'Guardian of luxury. A spacious deluxe room with hand-carved furnishings, premium amenities, and warm gold lighting that evokes the glow of desert sunsets.',
      amenities: ['Queen Bed', 'Rain Shower', 'City View', 'Minibar', 'Smart TV', 'Work Desk', 'Premium Toiletries'],
      images: ROOM_IMAGES.deluxe,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Horus Deluxe Room',
      slug: 'horus-deluxe-room',
      type: 'deluxe',
      pricePerNight: 360,
      capacity: 2,
      floorNumber: 4,
      roomNumber: '402',
      description: 'The all-seeing eye watches over your comfort. Floor-to-ceiling windows, plush bedding, and an en-suite marble bathroom make this room a refuge of elegance.',
      amenities: ['Queen Bed', 'Marble Bathroom', 'Floor-to-Ceiling Windows', 'Minibar', 'Smart TV', 'Safe', 'Hair Dryer'],
      images: ROOM_IMAGES.deluxe,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Isis Standard Room',
      slug: 'isis-standard-room',
      type: 'standard',
      pricePerNight: 220,
      capacity: 2,
      floorNumber: 2,
      roomNumber: '201',
      description: 'Blessed by the goddess of home and hearth. A beautifully appointed standard room with all the comforts you need for a perfect stay.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Work Desk', 'Air Conditioning', 'Wi-Fi'],
      images: ROOM_IMAGES.standard,
      isAvailable: true,
      qrToken: generateQRToken(),
    },
    {
      name: 'Ra Standard Room',
      slug: 'ra-standard-room',
      type: 'standard',
      pricePerNight: 200,
      capacity: 2,
      floorNumber: 2,
      roomNumber: '202',
      description: 'Rise with Ra in this sunlit standard room. Bright, comfortable, and perfectly equipped for the modern traveler seeking the warmth of Egyptian hospitality.',
      amenities: ['Double Bed', 'En-Suite Bathroom', 'Smart TV', 'Air Conditioning', 'Wi-Fi', 'Daily Housekeeping'],
      images: ROOM_IMAGES.standard,
      isAvailable: true,
      qrToken: generateQRToken(),
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

  console.log('🏰 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
