/**
 * Regenerate qrCodeUrl for all rooms using the current CLIENT_URL env var.
 * Run this whenever CLIENT_URL changes (e.g. switching between localhost and LAN IP).
 *
 * Usage: node scripts/fix-qr-urls.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Regenerating QR codes with CLIENT_URL:', CLIENT_URL);

  const Room = mongoose.model('Room', new mongoose.Schema({ qrToken: String, qrCodeUrl: String, name: String }, { strict: false }));
  const rooms = await Room.find({}).lean();

  await Promise.all(rooms.map(async (room) => {
    const url = `${CLIENT_URL}/qr/${room.qrToken}`;
    const qrCodeUrl = await QRCode.toDataURL(url, {
      width: 300, margin: 2,
      color: { dark: '#0D1B3E', light: '#F5ECD7' },
    });
    await Room.findByIdAndUpdate(room._id, { qrCodeUrl });
    console.log('Updated:', room.name);
  }));

  console.log(`Done — ${rooms.length} room(s) updated.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
