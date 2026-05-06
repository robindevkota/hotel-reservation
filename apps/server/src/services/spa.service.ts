/**
 * spa.service.ts
 *
 * Dynamic slot availability engine:
 *  - Generates candidate start times from service.operatingStart → operatingEnd - duration
 *  - For each candidate, counts how many therapists are FREE (last session end + break ≤ candidate)
 *  - Auto-assigns the least-busy therapist to an online booking
 *  - Provides the day schedule for admin timeline view
 */

import SpaTherapist, { ISpaTherapist } from '../models/SpaTherapist';
import SpaBooking, { ISpaBooking } from '../models/SpaBooking';
import SpaService, { ISpaService } from '../models/SpaService';
import SpaTherapistBlock from '../models/SpaTherapistBlock';
import mongoose from 'mongoose';
import { emitSpaRescheduled } from './socket.service';

// ── helpers ───────────────────────────────────────────────────────────────────

/** "HH:MM" → total minutes since midnight */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** total minutes → "HH:MM" */
function fromMin(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Start of day (midnight) for a given date */
function dayBounds(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(date.toDateString());
  const lt  = new Date(gte); lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

// ── core: therapist free-time calculation ────────────────────────────────────

/**
 * Given a therapist's bookings on a day, return the earliest minute they are free
 * (i.e. after their last active session ends + break).
 * Returns 0 if they have no active bookings that day.
 *
 * nowMin: current time in minutes (today) or Infinity (future date).
 * Confirmed bookings whose grace period has expired (scheduledStart + gracePeriod <= nowMin)
 * are skipped — the therapist was released when grace elapsed.
 * Bookings must be populated with { service: 'gracePeriod' } for this to work.
 */
function therapistBusyUntil(
  bookings: ISpaBooking[],
  therapistId: string,
  breakDuration: number,
  nowMin: number
): number {
  const mine = bookings.filter(
    b => b.therapist && String(b.therapist) === therapistId &&
         ['pending','confirmed','arrived','in_progress'].includes(b.status)
  );
  if (!mine.length) return 0;

  let latestEnd = -1;
  for (const b of mine) {
    // Grace-expired confirmed booking — therapist was released, skip it
    if (b.status === 'confirmed') {
      const grace = (b.service as any)?.gracePeriod ?? 0;
      const graceEndMin = toMin(b.scheduledStart) + grace;
      if (graceEndMin <= nowMin) continue;
    }
    const endTime = b.actualEnd || b.scheduledEnd;
    const endMin = toMin(endTime);
    if (endMin > latestEnd) latestEnd = endMin;
  }
  return latestEnd < 0 ? 0 : latestEnd + breakDuration;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns true if a slot [slotStart, slotEnd) overlaps any block for the given therapist */
function slotOverlapsBlock(
  blocks: Array<{ therapist: any; blockStart: string; blockEnd: string }>,
  therapistId: string,
  slotStart: number,
  slotEnd: number
): boolean {
  return blocks.some(
    b => String(b.therapist) === therapistId &&
         slotStart < toMin(b.blockEnd) &&
         slotEnd   > toMin(b.blockStart)
  );
}

// ── public: get available slots ───────────────────────────────────────────────

export interface SlotInfo {
  startTime: string;
  endTime: string;
  capacity: number;           // how many therapists are free at this slot
  freeTherapistIds: string[]; // internal — used by auto-assign
}

/**
 * Returns all slots for a service on a given date with capacity > 0.
 * Step = 30 min (slots generated at :00 and :30).
 */
export async function getAvailableSlots(
  serviceId: string,
  date: Date,
  window?: 'morning' | 'afternoon' | 'evening' | 'any'
): Promise<SlotInfo[]> {
  const service = await SpaService.findById(serviceId);
  if (!service || !service.isAvailable) return [];

  // All active therapists who can do this service
  const therapists = await SpaTherapist.find({
    isActive: true,
    specializations: new mongoose.Types.ObjectId(serviceId),
  });
  if (!therapists.length) return [];

  // All active bookings and manual blocks for these therapists on this date
  const { gte, lt } = dayBounds(date);
  const [bookings, blocks] = await Promise.all([
    SpaBooking.find({
      therapist: { $in: therapists.map(t => t._id) },
      date: { $gte: gte, $lt: lt },
      status: { $in: ['pending','confirmed','arrived','in_progress'] },
    }).populate('service', 'gracePeriod') as Promise<ISpaBooking[]>,
    SpaTherapistBlock.find({
      therapist: { $in: therapists.map(t => t._id) },
      date: { $gte: gte, $lt: lt },
    }),
  ]);

  // nowMin: current time in minutes for today; Infinity for future dates (no grace release)
  const isToday = date.toDateString() === new Date().toDateString();
  const now = new Date();
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : Infinity;

  const startMin = toMin(service.operatingStart);
  const endMin   = toMin(service.operatingEnd);
  const dur      = service.duration;

  // Window filter
  const windowBounds: Record<string, [number, number]> = {
    morning:   [toMin('09:00'), toMin('12:00')],
    afternoon: [toMin('13:00'), toMin('17:00')],
    evening:   [toMin('18:00'), toMin('21:00')],
    any:       [startMin, endMin],
  };
  const [wStart, wEnd] = windowBounds[window ?? 'any'] ?? [startMin, endMin];

  const slots: SlotInfo[] = [];

  // Generate every 30 min
  for (let t = startMin; t + dur <= endMin; t += 30) {
    if (t < wStart || t >= wEnd) continue;

    const freeTherapistIds: string[] = [];
    for (const therapist of therapists) {
      const busyUntil = therapistBusyUntil(bookings, String(therapist._id), therapist.breakDuration, nowMin);
      if (busyUntil <= t && !slotOverlapsBlock(blocks, String(therapist._id), t, t + dur)) {
        freeTherapistIds.push(String(therapist._id));
      }
    }

    if (freeTherapistIds.length > 0) {
      slots.push({
        startTime: fromMin(t),
        endTime:   fromMin(t + dur),
        capacity:  freeTherapistIds.length,
        freeTherapistIds,
      });
    }
  }

  return slots;
}

// ── public: get windows summary ───────────────────────────────────────────────

export interface WindowSummary {
  window: 'morning' | 'afternoon' | 'evening';
  label: string;
  hours: string;
  available: number;    // total slots available in this window
  earliest: string;     // earliest available slot time
}

export async function getWindowSummary(
  serviceId: string,
  date: Date
): Promise<WindowSummary[]> {
  const windows: Array<{ window: 'morning'|'afternoon'|'evening'; label: string; hours: string }> = [
    { window: 'morning',   label: 'Morning',   hours: '09:00 – 12:00' },
    { window: 'afternoon', label: 'Afternoon', hours: '13:00 – 17:00' },
    { window: 'evening',   label: 'Evening',   hours: '18:00 – 21:00' },
  ];

  const results: WindowSummary[] = [];
  for (const w of windows) {
    const slots = await getAvailableSlots(serviceId, date, w.window);
    results.push({
      ...w,
      available: slots.length,
      earliest:  slots[0]?.startTime ?? '',
    });
  }
  return results;
}

// ── public: auto-assign therapist ─────────────────────────────────────────────

/**
 * From free therapists at a slot, pick the one with the fewest bookings today.
 * Tie-break: alphabetical by name (deterministic).
 */
export async function autoAssignTherapist(
  freeTherapistIds: string[],
  date: Date
): Promise<ISpaTherapist | null> {
  if (!freeTherapistIds.length) return null;

  const { gte, lt } = dayBounds(date);

  // Count bookings per therapist today
  const counts = await SpaBooking.aggregate([
    {
      $match: {
        therapist: { $in: freeTherapistIds.map(id => new mongoose.Types.ObjectId(id)) },
        date: { $gte: gte, $lt: lt },
        status: { $in: ['pending','confirmed','arrived','in_progress','completed'] },
      },
    },
    { $group: { _id: '$therapist', count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[String(c._id)] = c.count;

  const therapists = await SpaTherapist.find({
    _id: { $in: freeTherapistIds },
  }).sort({ name: 1 });

  // Pick least busy
  let best = therapists[0];
  let bestCount = countMap[String(best._id)] ?? 0;
  for (const t of therapists) {
    const c = countMap[String(t._id)] ?? 0;
    if (c < bestCount) { best = t; bestCount = c; }
  }

  return best ?? null;
}

// ── public: find next available slot (for reschedule) ────────────────────────

/**
 * Search forward from fromDate + fromTimeMin for the next bookable slot.
 * Checks today first (slots after fromTimeMin), then up to 6 more days.
 * Returns the slot with auto-assigned therapist, or null if nothing found.
 */
export async function findNextAvailableSlot(
  serviceId: string,
  fromDate: Date,
  fromTimeMin: number
): Promise<{ date: Date; startTime: string; endTime: string; therapistId: string } | null> {
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    const slots = await getAvailableSlots(serviceId, checkDate, 'any');
    for (const slot of slots) {
      if (dayOffset === 0 && toMin(slot.startTime) <= fromTimeMin) continue;
      if (!slot.freeTherapistIds.length) continue;
      const therapist = await autoAssignTherapist(slot.freeTherapistIds, checkDate);
      if (!therapist) continue;
      return {
        date: checkDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        therapistId: String(therapist._id),
      };
    }
  }
  return null;
}

// ── public: reschedule a booking to the next free slot ───────────────────────

/**
 * Move a pending/confirmed booking to the next available slot.
 * Updates scheduledStart/End, therapist, date; emits spa:rescheduled to guest.
 * Returns the updated booking, or null if no slot found.
 */
export async function doReschedule(bookingId: string): Promise<ISpaBooking | null> {
  const booking = await SpaBooking.findById(bookingId);
  if (!booking || !['pending', 'confirmed'].includes(booking.status)) return null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const next = await findNextAvailableSlot(String(booking.service), now, nowMin);
  if (!next) return null;

  booking.date           = next.date;
  booking.scheduledStart = next.startTime;
  booking.scheduledEnd   = next.endTime;
  booking.therapist      = new mongoose.Types.ObjectId(next.therapistId);
  booking.status         = 'confirmed';

  try {
    await booking.save();
  } catch (err: any) {
    if (err.code === 11000) return null; // race condition — slot just taken
    throw err;
  }

  if (booking.guest) {
    emitSpaRescheduled(
      String(booking.guest),
      String(booking._id),
      next.startTime,
      next.date.toISOString().split('T')[0]
    );
  }

  return booking;
}

// ── public: day schedule for admin timeline ───────────────────────────────────

export interface TherapistSchedule {
  therapist: { _id: string; name: string; breakDuration: number };
  bookings: ISpaBooking[];
  blocks: Array<{ _id: string; blockStart: string; blockEnd: string; type: 'break' | 'unavailable'; reason?: string }>;
  freeSlots: Array<{ startTime: string; endTime: string }>;
}

export async function getDaySchedule(date: Date): Promise<TherapistSchedule[]> {
  const therapists = await SpaTherapist.find({ isActive: true }).populate('specializations', 'name');
  const { gte, lt } = dayBounds(date);

  const [allBookings, allBlocks] = await Promise.all([
    SpaBooking.find({ date: { $gte: gte, $lt: lt } })
      .populate('guest', 'name email nationality')
      .populate('walkInCustomer', 'name phone nationality')
      .populate('service', 'name duration category gracePeriod')
      .populate('therapist', 'name')
      .sort({ scheduledStart: 1 }) as Promise<ISpaBooking[]>,
    SpaTherapistBlock.find({ date: { $gte: gte, $lt: lt } }),
  ]);

  const result: TherapistSchedule[] = [];

  for (const therapist of therapists) {
    const myBookings = allBookings.filter(b => {
      if (!b.therapist) return false;
      const tid = (b.therapist as any)._id ?? b.therapist;
      return String(tid) === String(therapist._id);
    });

    const myBlocks = allBlocks
      .filter(bl => String(bl.therapist) === String(therapist._id))
      .map(bl => ({
        _id:        String(bl._id),
        blockStart: bl.blockStart,
        blockEnd:   bl.blockEnd,
        type:       bl.type,
        reason:     bl.reason,
      }));

    // Compute free gaps between 09:00 and 21:00, accounting for blocks
    const freeSlots: Array<{ startTime: string; endTime: string }> = [];
    let cursor = toMin('09:00');
    const dayEnd = toMin('21:00');

    // Merge active bookings + blocks into a unified busy list, sorted by start
    type BusyPeriod = { start: number; end: number };
    const busyPeriods: BusyPeriod[] = [
      ...myBookings
        .filter(b => !['cancelled', 'completed'].includes(b.status))
        .map(b => ({
          start: toMin(b.scheduledStart),
          end:   toMin(b.scheduledEnd) + therapist.breakDuration,
        })),
      ...myBlocks.map(bl => ({
        start: toMin(bl.blockStart),
        end:   toMin(bl.blockEnd),
      })),
    ].sort((a, b) => a.start - b.start);

    for (const period of busyPeriods) {
      if (cursor < period.start) {
        freeSlots.push({ startTime: fromMin(cursor), endTime: fromMin(period.start) });
      }
      cursor = Math.max(cursor, period.end);
    }
    if (cursor < dayEnd) {
      freeSlots.push({ startTime: fromMin(cursor), endTime: fromMin(dayEnd) });
    }

    result.push({
      therapist: {
        _id:           String(therapist._id),
        name:          therapist.name,
        breakDuration: therapist.breakDuration,
      },
      bookings: myBookings,
      blocks:   myBlocks,
      freeSlots,
    });
  }

  return result;
}
