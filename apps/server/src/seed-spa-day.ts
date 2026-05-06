/**
 * seed-spa-day.ts
 *
 * Wipes today's SpaBookings + SpaTherapistBlocks and seeds a rich demo schedule
 * showing every status: completed, in_progress, arrived, confirmed (overdue),
 * confirmed (upcoming), pending, cancelled, plus break and unavailable blocks.
 *
 * Usage:  cd royal-suites/apps/server && npx ts-node src/seed-spa-day.ts
 */

import 'dotenv/config';
import { connectDB } from './config/db';
import SpaService from './models/SpaService';
import SpaTherapist from './models/SpaTherapist';
import SpaBooking from './models/SpaBooking';
import SpaTherapistBlock from './models/SpaTherapistBlock';
import Guest from './models/Guest';
import User from './models/User';

function addMin(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

async function seed() {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  // ── Wipe today ────────────────────────────────────────────────────────────
  await SpaBooking.deleteMany({ date: { $gte: today, $lt: tomorrow } });
  await SpaTherapistBlock.deleteMany({ date: { $gte: today, $lt: tomorrow } });
  console.log('🗑  Cleared today\'s spa bookings and blocks');

  // ── Load therapists & services ────────────────────────────────────────────
  const [nefertari, ramses, isis] = await Promise.all([
    SpaTherapist.findOne({ name: 'Nefertari Hassan' }),
    SpaTherapist.findOne({ name: 'Ramses Khalil' }),
    SpaTherapist.findOne({ name: 'Isis Mostafa' }),
  ]);

  if (!nefertari || !ramses || !isis) {
    console.error('❌ Therapists not found — run npm run seed first');
    process.exit(1);
  }

  const svcMap: Record<string, any> = {};
  const services = await SpaService.find();
  for (const s of services) svcMap[s.name] = s;

  const cleopatra = svcMap["Cleopatra's Milk & Honey Ritual"]; // 90 min
  const desert    = svcMap['Desert Rose Facial'];               // 60 min
  const nile      = svcMap['Nile Stone Hot Therapy'];           // 75 min
  const pharaoh   = svcMap["Pharaoh's Deep Tissue Massage"];    // 60 min
  const hydro     = svcMap['Hydrotherapy Ritual'];              // 90 min
  const couples   = svcMap["Couples' Golden Journey"];          // 120 min

  if (!cleopatra || !desert || !nile || !pharaoh || !hydro || !couples) {
    console.error('❌ Services not found — run npm run seed first');
    process.exit(1);
  }

  // ── Load guests ───────────────────────────────────────────────────────────
  const guests = await Guest.find().limit(18);
  if (guests.length < 12) {
    console.error('❌ Need at least 12 guests — run npm run seed:full first');
    process.exit(1);
  }
  const g = (i: number) => guests[i % guests.length]._id;

  // ── Admin user (for block createdBy) ─────────────────────────────────────
  const admin = await User.findOne({ role: 'super_admin' });
  if (!admin) { console.error('❌ Admin user not found'); process.exit(1); }

  // ── Bookings ──────────────────────────────────────────────────────────────
  //
  // Nefertari Hassan
  //   09:00  completed       Cleopatra 90min
  //   10:45  completed       Desert Rose 60min
  //   12:00  in_progress     Cleopatra 90min  (live session)
  //   14:00  arrived         Desert Rose 60min
  //   15:30  confirmed       Cleopatra 90min  (upcoming)
  //   17:30  pending         Desert Rose 60min
  //   19:30  cancelled       Cleopatra 90min  (no-show cancel)
  //
  // Ramses Khalil
  //   09:00  completed       Nile Stone 75min
  //   10:30  completed       Pharaoh's Deep 60min
  //   12:00  cancelled       Nile Stone 75min
  //   13:30  confirmed       Pharaoh's Deep 60min  (overdue — grace expired)
  //   15:00  confirmed       Nile Stone 75min      (upcoming)
  //   17:00  pending         Pharaoh's Deep 60min
  //   18:30  confirmed       Nile Stone 75min      (evening)
  //
  // Isis Mostafa
  //   09:00  completed       Hydrotherapy 90min
  //   11:00  in_progress     Couples 120min (live couple session)
  //   14:00  arrived         Hydrotherapy 90min
  //   16:30  pending         Hydrotherapy 90min
  //   18:30  confirmed       Couples 120min (evening confirmed)

  const bookingDefs: any[] = [
    // ── Nefertari Hassan ──────────────────────────────────────────────────
    { gIdx:0,  t:nefertari, svc:cleopatra, start:'09:00', status:'completed',   aStart:'09:00', aEnd:'10:30', addedToBill:true  },
    { gIdx:1,  t:nefertari, svc:desert,    start:'10:45', status:'completed',   aStart:'10:45', aEnd:'11:45', addedToBill:true  },
    { gIdx:2,  t:nefertari, svc:cleopatra, start:'12:00', status:'in_progress', aStart:'12:05', aEnd:'',      addedToBill:false },
    { gIdx:3,  t:nefertari, svc:desert,    start:'14:00', status:'arrived',     aStart:'14:08', aEnd:'',      addedToBill:false },
    { gIdx:4,  t:nefertari, svc:cleopatra, start:'15:30', status:'confirmed',   aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:5,  t:nefertari, svc:desert,    start:'17:30', status:'pending',     aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:6,  t:nefertari, svc:cleopatra, start:'19:30', status:'cancelled',   aStart:'',      aEnd:'',      addedToBill:false },

    // ── Ramses Khalil ─────────────────────────────────────────────────────
    { gIdx:7,  t:ramses, svc:nile,    start:'09:00', status:'completed',   aStart:'09:00', aEnd:'10:15', addedToBill:true  },
    { gIdx:8,  t:ramses, svc:pharaoh, start:'10:30', status:'completed',   aStart:'10:30', aEnd:'11:30', addedToBill:true  },
    { gIdx:9,  t:ramses, svc:nile,    start:'12:00', status:'cancelled',   aStart:'',      aEnd:'',      addedToBill:false },
    // confirmed at 13:30 — grace expires at 13:45, so will show as overdue after 13:45
    { gIdx:10, t:ramses, svc:pharaoh, start:'13:30', status:'confirmed',   aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:11, t:ramses, svc:nile,    start:'15:00', status:'confirmed',   aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:12, t:ramses, svc:pharaoh, start:'17:00', status:'pending',     aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:13, t:ramses, svc:nile,    start:'18:30', status:'confirmed',   aStart:'',      aEnd:'',      addedToBill:false },

    // ── Isis Mostafa ──────────────────────────────────────────────────────
    { gIdx:14, t:isis, svc:hydro,   start:'09:00', status:'completed',   aStart:'09:00', aEnd:'10:30', addedToBill:true  },
    { gIdx:15, t:isis, svc:couples, start:'11:00', status:'in_progress', aStart:'11:10', aEnd:'',      addedToBill:false },
    { gIdx:16, t:isis, svc:hydro,   start:'14:00', status:'arrived',     aStart:'14:03', aEnd:'',      addedToBill:false },
    { gIdx:0,  t:isis, svc:hydro,   start:'16:30', status:'pending',     aStart:'',      aEnd:'',      addedToBill:false },
    { gIdx:1,  t:isis, svc:couples, start:'18:30', status:'confirmed',   aStart:'',      aEnd:'',      addedToBill:false },
  ];

  const bookings = await SpaBooking.insertMany(
    bookingDefs.map(d => ({
      guest:            g(d.gIdx),
      service:          d.svc._id,
      therapist:        d.t._id,
      date:             today,
      scheduledStart:   d.start,
      scheduledEnd:     addMin(d.start, d.svc.duration),
      actualStart:      d.aStart,
      actualEnd:        d.aEnd,
      durationSnapshot: d.svc.duration,
      window:           'any',
      status:           d.status,
      price:            d.svc.price,
      addedToBill:      d.addedToBill,
      isWalkIn:         false,
    }))
  );
  console.log(`✅ ${bookings.length} spa bookings seeded`);

  // ── Blocks ────────────────────────────────────────────────────────────────
  const blocks = await SpaTherapistBlock.insertMany([
    // Nefertari: lunch break between in_progress and arrived sessions
    {
      therapist:  nefertari._id,
      date:       today,
      blockStart: '13:45',
      blockEnd:   '14:00',
      type:       'break',
      reason:     'Lunch break',
      createdBy:  admin._id,
    },
    // Ramses: unavailable window covering his gap (doctor's appointment)
    {
      therapist:  ramses._id,
      date:       today,
      blockStart: '14:15',
      blockEnd:   '15:00',
      type:       'unavailable',
      reason:     'Doctor appointment',
      createdBy:  admin._id,
    },
    // Isis: tea break between arrived session and evening pending
    {
      therapist:  isis._id,
      date:       today,
      blockStart: '15:45',
      blockEnd:   '16:15',
      type:       'break',
      reason:     'Tea break',
      createdBy:  admin._id,
    },
  ]);
  console.log(`✅ ${blocks.length} therapist blocks seeded`);

  console.log('\n📋 Today\'s schedule:');
  console.log('  Nefertari Hassan: completed × 2 · in_progress · arrived · confirmed · pending · cancelled');
  console.log('                    + lunch break block 13:45–14:00');
  console.log('  Ramses Khalil:    completed × 2 · cancelled · confirmed (overdue @13:30) · confirmed × 2 · pending');
  console.log('                    + unavailable block 14:15–15:00');
  console.log('  Isis Mostafa:     completed · in_progress (couples) · arrived · pending · confirmed');
  console.log('                    + tea break block 15:45–16:15');
  console.log('\n✅ Done — refresh the admin spa schedule page');

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
