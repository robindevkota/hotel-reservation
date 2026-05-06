import SpaBooking from '../models/SpaBooking';
import { doReschedule } from './spa.service';
import logger from '../config/logger';

function dayBounds(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(date.toDateString());
  const lt  = new Date(gte); lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

async function processOverdueBookings(): Promise<void> {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { gte, lt } = dayBounds(now);

  // Find all confirmed bookings for today with service grace period populated
  const confirmed = await SpaBooking.find({
    status: 'confirmed',
    date: { $gte: gte, $lt: lt },
  }).populate('service', 'gracePeriod');

  for (const booking of confirmed) {
    const grace = (booking.service as any)?.gracePeriod ?? 15;
    const scheduledMin = Math.floor(
      parseInt(booking.scheduledStart.split(':')[0]) * 60 +
      parseInt(booking.scheduledStart.split(':')[1])
    );

    // Auto-reschedule when 2× grace period has elapsed with no arrival
    if (nowMin >= scheduledMin + grace * 2) {
      logger.info(`[cron] Auto-rescheduling overdue booking ${booking._id} (scheduled ${booking.scheduledStart})`);
      await doReschedule(String(booking._id)).catch(err => {
        logger.error(`[cron] Failed to reschedule booking ${booking._id}`, { err });
      });
    }
  }
}

export function startCronJobs(): void {
  // Wait 30s after boot for DB to settle, then check every 5 minutes
  setTimeout(() => {
    processOverdueBookings().catch(err => logger.error('[cron] Initial overdue check failed', { err }));
    setInterval(() => {
      processOverdueBookings().catch(err => logger.error('[cron] Overdue check failed', { err }));
    }, 5 * 60 * 1000);
  }, 30_000);
}
