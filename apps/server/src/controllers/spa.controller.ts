import { Request, Response } from 'express';
import { body } from 'express-validator';
import SpaService from '../models/SpaService';
import SpaTherapist from '../models/SpaTherapist';
import SpaBooking from '../models/SpaBooking';
import Offer from '../models/Offer';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { addLineItem } from '../services/billing.service';
import { emitSpaConfirmed } from '../services/socket.service';
import { sendSpaConfirmation } from '../services/notification.service';
import {
  getAvailableSlots,
  getWindowSummary,
  autoAssignTherapist,
  getDaySchedule,
} from '../services/spa.service';

// ── validation ────────────────────────────────────────────────────────────────

export const spaBookingValidation = [
  body('service').isMongoId(),
  body('date').isISO8601(),
  body('window').optional().isIn(['morning','afternoon','evening','any']),
  body('startTime').optional().matches(/^\d{2}:\d{2}$/),
];

export const walkInValidation = [
  body('service').isMongoId(),
  body('guestId').optional().isMongoId(),
  body('walkInCustomerId').optional().isMongoId(),
  body().custom((_val, { req }) => {
    if (!req.body.guestId && !req.body.walkInCustomerId) {
      throw new Error('Provide either guestId or walkInCustomerId');
    }
    return true;
  }),
  body('date').isISO8601(),
  body('startTime').matches(/^\d{2}:\d{2}$/),
  body('therapistId').optional().isMongoId(),
];

export const therapistValidation = [
  body('name').notEmpty().trim(),
  body('specializations').isArray({ min: 1 }),
  body('breakDuration').optional().isInt({ min: 0 }),
];

export const serviceValidation = [
  body('name').notEmpty().trim(),
  body('description').notEmpty(),
  body('duration').isInt({ min: 15 }),
  body('price').isFloat({ min: 0 }),
  body('category').isIn(['massage','facial','body_wrap','hydrotherapy','couples']),
  body('operatingStart').optional().matches(/^\d{2}:\d{2}$/),
  body('operatingEnd').optional().matches(/^\d{2}:\d{2}$/),
  body('gracePeriod').optional().isInt({ min: 0 }),
];

// ── helper ────────────────────────────────────────────────────────────────────

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

function dayBounds(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(date.toDateString());
  const lt  = new Date(gte); lt.setDate(lt.getDate() + 1);
  return { gte, lt };
}

// ── services ──────────────────────────────────────────────────────────────────

export async function listSpaServices(_req: Request, res: Response): Promise<void> {
  const services = await SpaService.find({ isAvailable: true });
  res.json({ success: true, services });
}

export async function createSpaService(req: AuthRequest, res: Response): Promise<void> {
  const service = await SpaService.create(req.body);
  res.status(201).json({ success: true, service });
}

export async function updateSpaService(req: AuthRequest, res: Response): Promise<void> {
  const service = await SpaService.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!service) throw new AppError('Service not found', 404);
  res.json({ success: true, service });
}

// ── therapists ────────────────────────────────────────────────────────────────

export async function listTherapists(_req: Request, res: Response): Promise<void> {
  const therapists = await SpaTherapist.find({ isActive: true })
    .populate('specializations', 'name duration category');
  res.json({ success: true, therapists });
}

export async function listAllTherapists(_req: Request, res: Response): Promise<void> {
  const therapists = await SpaTherapist.find()
    .populate('specializations', 'name duration category');
  res.json({ success: true, therapists });
}

export async function createTherapist(req: AuthRequest, res: Response): Promise<void> {
  const therapist = await SpaTherapist.create(req.body);
  res.status(201).json({ success: true, therapist });
}

export async function updateTherapist(req: AuthRequest, res: Response): Promise<void> {
  const therapist = await SpaTherapist.findByIdAndUpdate(
    req.params.id, req.body, { new: true, runValidators: true }
  ).populate('specializations', 'name duration category');
  if (!therapist) throw new AppError('Therapist not found', 404);
  res.json({ success: true, therapist });
}

export async function deactivateTherapist(req: AuthRequest, res: Response): Promise<void> {
  const therapist = await SpaTherapist.findByIdAndUpdate(
    req.params.id, { isActive: false }, { new: true }
  );
  if (!therapist) throw new AppError('Therapist not found', 404);
  res.json({ success: true, therapist });
}

// ── availability ──────────────────────────────────────────────────────────────

export async function getSpaAvailability(req: Request, res: Response): Promise<void> {
  const { serviceId, date, window } = req.query;
  if (!serviceId || !date) throw new AppError('serviceId and date required', 400);

  const bookingDate = new Date(String(date));
  const slots = await getAvailableSlots(
    String(serviceId),
    bookingDate,
    (window as any) ?? 'any'
  );

  // Strip internal freeTherapistIds from public response
  const publicSlots = slots.map(({ startTime, endTime, capacity }) => ({ startTime, endTime, capacity }));
  res.json({ success: true, available: publicSlots });
}

export async function getSpaWindows(req: Request, res: Response): Promise<void> {
  const { serviceId, date } = req.query;
  if (!serviceId || !date) throw new AppError('serviceId and date required', 400);

  const bookingDate = new Date(String(date));
  const windows = await getWindowSummary(String(serviceId), bookingDate);
  res.json({ success: true, windows });
}

// ── online booking ────────────────────────────────────────────────────────────

export async function bookSpa(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const { service: serviceId, date, window = 'any', startTime } = req.body;

  const service = await SpaService.findById(serviceId);
  if (!service || !service.isAvailable) throw new AppError('Service not available', 400);

  const bookingDate = new Date(date);
  const slots = await getAvailableSlots(serviceId, bookingDate, window);
  if (!slots.length) throw new AppError('No available slots for this date and window', 409);

  // If guest picked a specific time, honour it; reject if not in available slots
  let slot;
  if (startTime) {
    slot = slots.find(s => s.startTime === startTime);
    if (!slot) throw new AppError('Requested time slot is not available', 409);
  } else {
    slot = slots[0];
  }

  // Auto-assign least-busy therapist
  const therapist = await autoAssignTherapist(slot.freeTherapistIds, bookingDate);
  if (!therapist) throw new AppError('No therapist available', 409);

  const scheduledEnd = addMinutes(slot.startTime, service.duration);

  // Apply active offer spa discount if present
  const now = new Date();
  const activeOffer = await Offer.findOne({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const spaPrice = activeOffer?.spaDiscount
    ? Math.round(service.price * (1 - activeOffer.spaDiscount / 100) * 100) / 100
    : service.price;

  let booking;
  try {
    booking = await SpaBooking.create({
      guest:            guest._id,
      service:          serviceId,
      therapist:        therapist._id,
      date:             bookingDate,
      scheduledStart:   slot.startTime,
      scheduledEnd,
      durationSnapshot: service.duration,
      window,
      price:            spaPrice,
    });
  } catch (err: any) {
    if (err.code === 11000) throw new AppError('This slot was just taken — please try again', 409);
    throw err;
  }

  await booking.populate('therapist', 'name');

  emitSpaConfirmed(String(guest._id), String(booking._id));
  sendSpaConfirmation(
    guest.email, guest.name, service.name, bookingDate, slot.startTime
  ).catch(console.error);

  res.status(201).json({ success: true, booking });
}

// ── walk-in booking (admin) ───────────────────────────────────────────────────

export async function walkInBooking(req: AuthRequest, res: Response): Promise<void> {
  const { service: serviceId, guestId, walkInCustomerId, date, startTime, therapistId, note = '' } = req.body;

  if (!guestId && !walkInCustomerId) {
    throw new AppError('Provide either guestId (hotel guest) or walkInCustomerId (external walk-in)', 400);
  }

  const service = await SpaService.findById(serviceId);
  if (!service || !service.isAvailable) throw new AppError('Service not available', 400);

  const bookingDate = new Date(date);
  const scheduledEnd = addMinutes(startTime, service.duration);

  // Validate therapist assignment
  let assignedTherapist = null;
  if (therapistId) {
    const t = await SpaTherapist.findById(therapistId);
    if (!t || !t.isActive) throw new AppError('Therapist not found or inactive', 404);
    const canDo = t.specializations.some(s => String(s) === String(serviceId));
    if (!canDo) throw new AppError('Therapist is not specialised in this service', 400);
    assignedTherapist = t._id;
  } else {
    const slots = await getAvailableSlots(serviceId, bookingDate, 'any');
    const matchSlot = slots.find(s => s.startTime === startTime);
    if (matchSlot?.freeTherapistIds.length) {
      const t = await autoAssignTherapist(matchSlot.freeTherapistIds, bookingDate);
      if (t) assignedTherapist = t._id;
    }
  }

  // Validate guest or walk-in customer
  const bookingData: Record<string, any> = {
    service:          serviceId,
    therapist:        assignedTherapist,
    date:             bookingDate,
    scheduledStart:   startTime,
    scheduledEnd,
    durationSnapshot: service.duration,
    window:           'any',
    price:            service.price,
    therapistNote:    note,
    isWalkIn:         true,
    status:           'confirmed',
  };

  if (walkInCustomerId) {
    const WalkInModel = (await import('../models/WalkInCustomer')).default;
    const wic = await WalkInModel.findById(walkInCustomerId);
    if (!wic) throw new AppError('Walk-in customer not found', 404);
    if (wic.type !== 'spa') throw new AppError('Walk-in customer type must be spa for spa bookings', 400);
    bookingData.walkInCustomer = wic._id;
    bookingData.spaPaymentMethod = 'cash';
    bookingData.addedToBill = true; // cash — skip bill
  } else {
    const Guest = (await import('../models/Guest')).default;
    const guest = await Guest.findById(guestId);
    if (!guest) throw new AppError('Guest not found', 404);
    bookingData.guest = guestId;
  }

  let booking;
  try {
    booking = await SpaBooking.create(bookingData);
  } catch (err: any) {
    if (err.code === 11000) throw new AppError('Therapist already has a booking at this time', 409);
    throw err;
  }

  const populatePaths: any[] = ['therapist', 'service'];
  if (bookingData.guest) populatePaths.push('guest');
  else populatePaths.push('walkInCustomer');

  await booking.populate(populatePaths);
  res.status(201).json({ success: true, booking });
}

// ── bookings ──────────────────────────────────────────────────────────────────

export async function getMyBookings(req: AuthRequest, res: Response): Promise<void> {
  const bookings = await SpaBooking.find({ guest: req.guest!._id })
    .populate('service', 'name duration category image')
    .populate('therapist', 'name')
    .sort('-date');
  res.json({ success: true, bookings });
}

export async function getAllBookings(_req: Request, res: Response): Promise<void> {
  const bookings = await SpaBooking.find()
    .populate('guest', 'name email room nationality')
    .populate('walkInCustomer', 'name phone type nationality')
    .populate('service', 'name duration')
    .populate('therapist', 'name')
    .sort('-date');
  res.json({ success: true, bookings });
}

// ── day schedule (admin timeline) ─────────────────────────────────────────────

export async function getDayScheduleHandler(req: Request, res: Response): Promise<void> {
  const { date } = req.query;
  const d = date ? new Date(String(date)) : new Date();
  const schedule = await getDaySchedule(d);
  res.json({ success: true, schedule, date: d.toISOString().split('T')[0] });
}

// ── status transitions ────────────────────────────────────────────────────────

export async function updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body;
  const booking = await SpaBooking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);

  const allowed: Record<string, string[]> = {
    pending:     ['confirmed', 'cancelled'],
    confirmed:   ['arrived', 'cancelled'],
    arrived:     ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed:   [],
    cancelled:   [],
  };

  if (!allowed[booking.status]?.includes(status)) {
    throw new AppError(`Cannot transition from ${booking.status} to ${status}`, 400);
  }

  booking.status = status;

  if (status === 'completed' && !booking.addedToBill) {
    if (booking.spaPaymentMethod === 'cash') {
      // Cash paid at spa desk — skip bill line item
      booking.addedToBill = true;
    } else {
      const Guest = (await import('../models/Guest')).default;
      const guest = await Guest.findById(booking.guest);
      if (guest?.bill) {
        const service = await SpaService.findById(booking.service);
        await addLineItem(
          guest.bill as any,
          String(booking.guest),
          'spa',
          `Spa: ${service?.name || 'Service'}`,
          booking.price,
          booking._id as any
        );
        booking.addedToBill = true;
      }
    }
  }

  await booking.save();
  res.json({ success: true, booking });
}

// ── arrive: admin marks guest arrived + sets actualStart ──────────────────────

export async function markArrived(req: AuthRequest, res: Response): Promise<void> {
  const booking = await SpaBooking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (!['pending','confirmed'].includes(booking.status)) {
    throw new AppError('Booking is not in a state where arrival can be recorded', 400);
  }

  const now = new Date();
  const actualStart = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const actualEnd   = addMinutes(actualStart, booking.durationSnapshot);

  booking.status      = 'arrived';
  booking.actualStart = actualStart;
  booking.actualEnd   = actualEnd;

  await booking.save();

  // Check if running into next booking for this therapist
  let warning = '';
  if (booking.therapist) {
    const { gte, lt } = dayBounds(booking.date);
    const nextBooking = await SpaBooking.findOne({
      therapist: booking.therapist,
      date: { $gte: gte, $lt: lt },
      scheduledStart: { $gt: booking.scheduledStart },
      status: { $in: ['pending','confirmed'] },
    }).sort({ scheduledStart: 1 });

    if (nextBooking) {
      const therapist = await SpaTherapist.findById(booking.therapist);
      const breakDur = therapist?.breakDuration ?? 15;
      const actualEndMin = parseInt(actualEnd.split(':')[0]) * 60 + parseInt(actualEnd.split(':')[1]);
      const nextStartMin = parseInt(nextBooking.scheduledStart.split(':')[0]) * 60 + parseInt(nextBooking.scheduledStart.split(':')[1]);
      if (actualEndMin + breakDur > nextStartMin) {
        warning = `Session will run into next booking at ${nextBooking.scheduledStart}`;
      }
    }
  }

  res.json({ success: true, booking, warning });
}

// ── complete: admin marks session done + charges bill ─────────────────────────

export async function markCompleted(req: AuthRequest, res: Response): Promise<void> {
  const booking = await SpaBooking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (!['arrived','in_progress'].includes(booking.status)) {
    throw new AppError('Session must be arrived or in_progress to complete', 400);
  }

  const { paymentMethod = 'room_bill' } = req.body;
  if (!['room_bill', 'cash'].includes(paymentMethod)) {
    throw new AppError('paymentMethod must be room_bill or cash', 400);
  }

  const now = new Date();
  const actualEnd = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  booking.actualEnd = actualEnd;
  booking.status = 'completed';
  booking.spaPaymentMethod = paymentMethod as 'room_bill' | 'cash';

  if (!booking.addedToBill) {
    if (paymentMethod === 'cash') {
      booking.addedToBill = true;
    } else {
      const Guest = (await import('../models/Guest')).default;
      const guest = await Guest.findById(booking.guest);
      if (guest?.bill) {
        const service = await SpaService.findById(booking.service);
        await addLineItem(
          guest.bill as any,
          String(booking.guest),
          'spa',
          `Spa: ${service?.name || 'Service'}`,
          booking.price,
          booking._id as any
        );
        booking.addedToBill = true;
      }
    }
  }

  await booking.save();
  res.json({ success: true, booking });
}
