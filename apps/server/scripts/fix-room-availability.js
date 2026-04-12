/**
 * One-time fix: set isAvailable=false for rooms that have an active guest
 * but were incorrectly left as isAvailable=true (seeded state bug).
 * Run: node scripts/fix-room-availability.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Guest = mongoose.model('Guest', new mongoose.Schema({
    room: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
  }));
  const Room = mongoose.model('Room', new mongoose.Schema({
    isAvailable: Boolean,
  }));

  const activeGuests = await Guest.find({ isActive: true }).select('room').lean();
  const occupiedRoomIds = activeGuests.map(g => g.room);

  if (occupiedRoomIds.length === 0) {
    console.log('No active guests found — nothing to fix.');
  } else {
    const result = await Room.updateMany(
      { _id: { $in: occupiedRoomIds }, isAvailable: true },
      { $set: { isAvailable: false } }
    );
    console.log(`Fixed ${result.modifiedCount} room(s) — set isAvailable=false.`);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
