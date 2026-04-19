import mongoose from 'mongoose';
import Room from './models/Room';
import Reservation from './models/Reservation';

const MONGODB_URI = process.env.MONGODB_URI!;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const room = await Room.findOne({ isAvailable: true });
  if (!room) { console.error('No available room found'); process.exit(1); }

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 5);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const totalNights = 2;
  const roomCharges = room.pricePerNight * totalNights;
  const bookingRef = `RS-TEST-${Date.now().toString(36).toUpperCase()}`;

  const reservation = await Reservation.create({
    bookingRef,
    room: room._id,
    guest: { name: 'Test User', email: 'asus1123@yopmail.com', phone: '+977-9800000000', idProof: 'PASSPORT-TEST' },
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: 1,
    totalNights,
    roomCharges,
    cancellationPolicy: 'flexible',
    guestType: 'foreign',
    paymentMethod: 'stripe',
    status: 'pending',
    depositAmount: room.pricePerNight,
    depositPaid: false,
  });

  console.log(`✅ Reservation created: ${bookingRef}`);
  console.log(`   Room: ${room.name}`);
  console.log(`   Guest: asus1123@yopmail.com`);
  console.log(`   Check-in: ${checkIn.toDateString()}`);
  console.log(`   Reservation ID: ${reservation._id}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
