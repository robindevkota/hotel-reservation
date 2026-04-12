/**
 * migrate-spa.js
 *
 * One-time migration for the spa scheduling redesign:
 *  1. Remove legacy `slots[]` field from all SpaService documents
 *  2. Add operatingStart, operatingEnd, gracePeriod to all SpaServices
 *  3. Migrate SpaBooking: rename startTime→scheduledStart, endTime→scheduledEnd,
 *     add durationSnapshot, therapist=null, window='any', isWalkIn=false
 *  4. Create 3 seed therapists (Ramesh, Sita, Bikash) assigned to all services
 *  5. Drop the old (service,date,startTime) unique index, create new (therapist,date,scheduledStart)
 *
 * Safe to run multiple times — checks before modifying.
 *
 * Usage:
 *   node scripts/migrate-spa.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1); }

async function main() {
  console.log('\n🏥  Spa Scheduling Migration');
  console.log('─'.repeat(45));

  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const services  = db.collection('spaservices');
  const bookings  = db.collection('spabookings');
  const therapists = db.collection('spatherapists');

  // ── 1. Migrate SpaServices ─────────────────────────────────────────────────
  console.log('📋  Migrating SpaService documents...');

  const allServices = await services.find({}).toArray();
  console.log(`  Found ${allServices.length} services`);

  for (const svc of allServices) {
    const update = {};

    // Add new fields if missing
    if (svc.gracePeriod    === undefined) update.gracePeriod    = 15;
    if (svc.operatingStart === undefined) update.operatingStart = '09:00';
    if (svc.operatingEnd   === undefined) update.operatingEnd   = '21:00';

    if (Object.keys(update).length) {
      await services.updateOne({ _id: svc._id }, { $set: update });
    }

    // Remove legacy slots array
    if (svc.slots !== undefined) {
      await services.updateOne({ _id: svc._id }, { $unset: { slots: '' } });
    }
  }
  console.log('  ✅  SpaService migration done\n');

  // ── 2. Migrate SpaBookings ─────────────────────────────────────────────────
  console.log('📅  Migrating SpaBooking documents...');

  const allBookings = await bookings.find({}).toArray();
  console.log(`  Found ${allBookings.length} bookings`);

  for (const b of allBookings) {
    const update = {};
    const unset  = {};

    // Rename startTime → scheduledStart
    if (b.startTime !== undefined && b.scheduledStart === undefined) {
      update.scheduledStart = b.startTime;
      unset.startTime = '';
    }
    // Rename endTime → scheduledEnd
    if (b.endTime !== undefined && b.scheduledEnd === undefined) {
      update.scheduledEnd = b.endTime;
      unset.endTime = '';
    }

    // Add new fields if missing
    if (b.durationSnapshot === undefined) update.durationSnapshot = 60; // default, updated below
    if (b.therapist        === undefined) update.therapist = null;
    if (b.window           === undefined) update.window    = 'any';
    if (b.isWalkIn         === undefined) update.isWalkIn  = false;
    if (b.actualStart      === undefined) update.actualStart = '';
    if (b.actualEnd        === undefined) update.actualEnd   = '';

    // Update status enum — 'completed'/'cancelled' stay, others stay
    // Add new statuses are already compatible

    const ops = {};
    if (Object.keys(update).length) ops.$set  = update;
    if (Object.keys(unset).length)  ops.$unset = unset;
    if (Object.keys(ops).length) {
      await bookings.updateOne({ _id: b._id }, ops);
    }
  }

  // Backfill durationSnapshot from service.duration
  const serviceList = await services.find({}).toArray();
  const svcMap = {};
  serviceList.forEach(s => { svcMap[String(s._id)] = s.duration || 60; });

  await Promise.all(
    (await bookings.find({ durationSnapshot: 60 }).toArray()).map(b =>
      bookings.updateOne(
        { _id: b._id },
        { $set: { durationSnapshot: svcMap[String(b.service)] || 60 } }
      )
    )
  );

  console.log('  ✅  SpaBooking migration done\n');

  // ── 3. Drop old unique index, create new one ───────────────────────────────
  console.log('🔑  Updating indexes...');

  // Drop old partial index on (service, date, startTime) if it exists
  const existingIndexes = await bookings.indexes();
  for (const idx of existingIndexes) {
    if (idx.name === 'spa_slot_unique_active' || idx.name === 'service_1_date_1_startTime_1_2') {
      await bookings.dropIndex(idx.name).catch(() => {});
      console.log(`  Dropped index: ${idx.name}`);
    }
  }

  // Create new unique index on (therapist, date, scheduledStart) for active bookings
  try {
    await bookings.createIndex(
      { therapist: 1, date: 1, scheduledStart: 1 },
      {
        unique: true,
        partialFilterExpression: {
          therapist: { $ne: null },
          status: { $in: ['pending','confirmed','arrived','in_progress'] },
        },
        name: 'therapist_slot_unique_active',
      }
    );
    console.log('  ✅  New therapist slot unique index created');
  } catch (e) {
    console.warn('  ⚠️  Index creation skipped (may already exist):', e.message);
  }

  console.log('');

  // ── 4. Create seed therapists ──────────────────────────────────────────────
  console.log('👤  Creating seed therapists...');

  const svcIds = serviceList.map(s => s._id);
  const seedTherapists = [
    { name: 'Ramesh Shrestha', specializations: svcIds, breakDuration: 15, isActive: true },
    { name: 'Sita Tamang',     specializations: svcIds, breakDuration: 15, isActive: true },
    { name: 'Bikash Rai',      specializations: svcIds, breakDuration: 15, isActive: true },
  ];

  for (const t of seedTherapists) {
    const exists = await therapists.findOne({ name: t.name });
    if (!exists) {
      await therapists.insertOne({ ...t, createdAt: new Date(), updatedAt: new Date() });
      console.log(`  ✅  Created therapist: ${t.name}`);
    } else {
      console.log(`  —  Therapist already exists: ${t.name}`);
    }
  }

  console.log('');

  // ── Summary ────────────────────────────────────────────────────────────────
  const therapistCount = await therapists.countDocuments({ isActive: true });
  const bookingCount   = await bookings.countDocuments({});
  const serviceCount   = await services.countDocuments({});

  console.log('─'.repeat(45));
  console.log('🎉  Migration complete!\n');
  console.log(`  📋  ${serviceCount} services migrated (slots[] removed, new fields added)`);
  console.log(`  📅  ${bookingCount} bookings migrated (startTime→scheduledStart)`);
  console.log(`  👤  ${therapistCount} active therapists ready`);
  console.log('\nNext step: restart the server so new indexes take effect.\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
