import 'dotenv/config';
import { connectDB } from './config/db';
import Guest from './models/Guest';
import Reservation from './models/Reservation';
import Bill from './models/Bill';
import Payment from './models/Payment';
import Order from './models/Order';
import SpaBooking from './models/SpaBooking';
import Room from './models/Room';
import WalkInCustomer from './models/WalkInCustomer';

async function clearGuestData() {
  await connectDB();
  console.log('🧹 Clearing guest data...');

  const [guests, reservations, bills, payments, orders, spaBookings, walkIns] = await Promise.all([
    Guest.deleteMany({}),
    Reservation.deleteMany({}),
    Bill.deleteMany({}),
    Payment.deleteMany({}),
    Order.deleteMany({}),
    SpaBooking.deleteMany({}),
    WalkInCustomer.deleteMany({}),
  ]);

  console.log(`✅ ${guests.deletedCount} guests removed`);
  console.log(`✅ ${reservations.deletedCount} reservations removed`);
  console.log(`✅ ${bills.deletedCount} bills removed`);
  console.log(`✅ ${payments.deletedCount} payments removed`);
  console.log(`✅ ${orders.deletedCount} orders removed`);
  console.log(`✅ ${spaBookings.deletedCount} spa bookings removed`);
  console.log(`✅ ${walkIns.deletedCount} walk-in customers removed`);

  // Reset all rooms to available
  const roomsUpdated = await Room.updateMany({}, { isAvailable: true });
  console.log(`✅ ${roomsUpdated.modifiedCount} rooms reset to available`);

  console.log('🏰 Guest data cleared. Rooms, menu, spa services, therapists, and inventory are intact.');
  process.exit(0);
}

clearGuestData().catch((err) => {
  console.error(err);
  process.exit(1);
});
