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
import mongoose from 'mongoose';

// ── helpers ───────────────────────────────────────────────────────────────────

/** "HH:MM" → total minutes since midnight */
function toMin(hhmm: string): number {
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
 */
function therapistBusyUntil(
  bookings: ISpaBooking[],
  therapistId: string,
  breakDuration: number
): number {
  const mine = bookings.filter(
    b => b.therapist && String(b.therapist) === therapistId &&
         ['pending','confirmed','arrived','in_progress'].includes(b.status)
  );
  if (!mine.length) return 0;

  let latestEnd = 0;
  for (const b of mine) {
    // Use actualEnd if session already started, else scheduledEnd
    const endTime = b.actualEnd || b.scheduledEnd;
    const endMin = toMin(endTime);
    if (endMin > latestEnd) latestEnd = endMin;
  }
  return latestEnd + breakDuration;
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

  // All active bookings for these therapists on this date
  const { gte, lt } = dayBounds(date);
  const bookings = await SpaBooking.find({
    therapist: { $in: therapists.map(t => t._id) },
    date: { $gte: gte, $lt: lt },
    status: { $in: ['pending','confirmed','arrived','in_progress'] },
  }) as ISpaBooking[];

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
      const busyUntil = therapistBusyUntil(bookings, String(therapist._id), therapist.breakDuration);
      if (busyUntil <= t) {
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

// ── public: day schedule for admin timeline ───────────────────────────────────

export interface TherapistSchedule {
  therapist: { _id: string; name: string; breakDuration: number };
  bookings: ISpaBooking[];
  freeSlots: Array<{ startTime: string; endTime: string }>;
}

export async function getDaySchedule(date: Date): Promise<TherapistSchedule[]> {
  const therapists = await SpaTherapist.find({ isActive: true }).populate('specializations', 'name');
  const { gte, lt } = dayBounds(date);

  const allBookings = await SpaBooking.find({
    date: { $gte: gte, $lt: lt },
  })
    .populate('guest', 'name email nationality')
    .populate('walkInCustomer', 'name phone nationality')
    .populate('service', 'name duration category')
    .populate('therapist', 'name')
    .sort({ scheduledStart: 1 }) as ISpaBooking[];

  const result: TherapistSchedule[] = [];

  for (const therapist of therapists) {
    const myBookings = allBookings.filter(b => {
      if (!b.therapist) return false;
      const tid = (b.therapist as any)._id ?? b.therapist;
      return String(tid) === String(therapist._id);
    });

    // Compute free gaps between 09:00 and 21:00
    const freeSlots: Array<{ startTime: string; endTime: string }> = [];
    let cursor = toMin('09:00');
    const dayEnd = toMin('21:00');

    const active = myBookings
      .filter(b => !['cancelled','completed'].includes(b.status))
      .sort((a, b) => toMin(a.scheduledStart) - toMin(b.scheduledStart));

    for (const booking of active) {
      const bStart = toMin(booking.scheduledStart);
      const bEnd   = toMin(booking.scheduledEnd) + therapist.breakDuration;
      if (cursor < bStart) {
        freeSlots.push({ startTime: fromMin(cursor), endTime: fromMin(bStart) });
      }
      cursor = Math.max(cursor, bEnd);
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
      freeSlots,
    });
  }

  return result;
}
