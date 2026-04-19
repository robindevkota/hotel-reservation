import { Request, Response } from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import Reservation from '../models/Reservation';
import Room from '../models/Room';
import Guest from '../models/Guest';
import Offer from '../models/Offer';
import { AppError } from '../middleware/errorHandler';
import { sendReservationConfirmation, sendCancellationConfirmation } from '../services/notification.service';
import { getUsdToNprRate } from '../services/exchangeRate.service';
import { AuthRequest } from '../middleware/auth.middleware';
import stripe from '../config/stripe';
import type { CancellationPolicy } from '../models/Reservation';

// Generates a human-readable booking reference: RS-YYYYMMDD-XXXX (e.g. RS-20260413-A3F2)
// Uses crypto.randomBytes for unpredictability — Math.random is not cryptographically secure.
function generateBookingRef(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').slice(0, 4).toUpperCase();
  return `RS-${datePart}-${rand}`;
}

export const reservationValidation = [
  body('guest.name').trim().notEmpty(),
  body('guest.email').isEmail().normalizeEmail(),
  body('guest.phone').trim().notEmpty(),
  body('room').isMongoId(),
  body('checkInDate').isISO8601(),
  body('checkOutDate').isISO8601(),
  body('numberOfGuests').isInt({ min: 1 }),
  body('cancellationPolicy').optional().isIn(['flexible', 'non_refundable']),
  body('guestType').optional().isIn(['foreign', 'nepali']),
];

export async function createReservation(req: Request, res: Response): Promise<void> {
  const { guest, room: roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests, cancellationPolicy = 'flexible', guestType = 'foreign' } = req.body;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkOut <= checkIn) throw new AppError('Check-out must be after check-in', 400);

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);
  if (!room.isAvailable) throw new AppError('Room is not available', 400);

  // Check for conflicting reservations
  const conflict = await Reservation.findOne({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
    ],
  });
  if (conflict) throw new AppError('Room is already booked for these dates', 409);

  const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Check for an active promotional offer with a room discount
  const now = new Date();
  const activeOffer = await Offer.findOne({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const offerMultiplier = activeOffer?.roomDiscount ? (1 - activeOffer.roomDiscount / 100) : 1;

  // Apply non-refundable 10% discount first, then offer discount on top
  const baseCharges = totalNights * room.pricePerNight;
  const afterPolicy = cancellationPolicy === 'non_refundable'
    ? Math.round(baseCharges * 0.9 * 100) / 100
    : baseCharges;
  const usdCharges = Math.round(afterPolicy * offerMultiplier * 100) / 100;

  // Nepali guests pay in NPR — convert using live exchange rate
  const isNepali = guestType === 'nepali';
  const roomCharges = isNepali
    ? Math.round(usdCharges * (await getUsdToNprRate()) * 100) / 100
    : usdCharges;

  // Generate unique booking reference (retry once on collision)
  let bookingRef = generateBookingRef();
  const existing = await Reservation.findOne({ bookingRef });
  if (existing) bookingRef = generateBookingRef();

  const depositAmount = isNepali ? Math.round(roomCharges * 0.5 * 100) / 100 : 0;

  const reservation = await Reservation.create({
    bookingRef,
    guest,
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests,
    specialRequests,
    totalNights,
    roomCharges,
    cancellationPolicy: isNepali ? 'non_refundable' : cancellationPolicy,
    guestType,
    paymentMethod: isNepali ? 'phonepay' : 'stripe',
    depositAmount,
    depositPaid: false,
  });

  res.status(201).json({ success: true, reservation, depositAmount, guestType });
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [reservations, total] = await Promise.all([
    Reservation.find(filter).populate('room', 'name roomNumber type pricePerNight').sort('-createdAt').skip(skip).limit(Number(limit)),
    Reservation.countDocuments(filter),
  ]);
  res.json({ success: true, reservations, total, page: Number(page) });
}

export async function getReservation(req: AuthRequest, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id).populate('room', 'name roomNumber type images');
  if (!reservation) throw new AppError('Reservation not found', 404);
  res.json({ success: true, reservation });
}

export async function confirmReservation(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id).populate('room', 'name');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.status !== 'pending') throw new AppError('Can only confirm pending reservations', 400);

  reservation.status = 'confirmed';
  await reservation.save();

  sendReservationConfirmation(
    reservation.guest.email,
    reservation.guest.name,
    reservation.bookingRef,
    reservation.checkInDate,
    reservation.checkOutDate,
    (reservation.room as any)?.name ?? 'Your Room',
    reservation.roomCharges,
    reservation.cancellationPolicy,
  ).catch(console.error);

  res.json({ success: true, reservation });
}

export async function cancelReservation(req: AuthRequest, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (['checked_in', 'checked_out', 'no_show'].includes(reservation.status)) {
    throw new AppError('Cannot cancel a checked-in, completed, or no-show reservation', 400);
  }
  if (reservation.status === 'cancelled') throw new AppError('Reservation is already cancelled', 400);

  const now = new Date();
  const hoursUntilCheckIn = (reservation.checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  // Free-cancel deadline: 48 hours before check-in
  const withinFreeCancelWindow = hoursUntilCheckIn >= 48;

  let refundIssued = false;
  let penaltyCharged = 0;

  if (reservation.cancellationPolicy === 'non_refundable') {
    // Non-refundable: hotel keeps 100% — no refund, no release
    penaltyCharged = reservation.roomCharges;
  } else {
    // Flexible policy — uses authorize/capture/cancel model
    if (reservation.stripePaymentIntentId) {
      const room = reservation.room as any;
      if (withinFreeCancelWindow) {
        // Within 48h window → cancel the authorization (release hold, $0 charged)
        await stripe.paymentIntents.cancel(reservation.stripePaymentIntentId);
        refundIssued = false; // nothing was ever charged
        penaltyCharged = 0;
      } else {
        // Past deadline → capture exactly 1 night from the hold
        const oneNightCents = Math.round(room.pricePerNight * 100);
        await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
          amount_to_capture: oneNightCents,
        });
        penaltyCharged = room.pricePerNight;
        refundIssued = false; // 1 night captured, rest of hold released automatically by Stripe
      }
    }
  }

  reservation.status = 'cancelled';
  reservation.cancelledAt = now;
  reservation.penaltyCharged = penaltyCharged;
  await reservation.save();

  // Send cancellation email (non-blocking)
  sendCancellationConfirmation(
    reservation.guest.email,
    reservation.guest.name,
    reservation.bookingRef,
    reservation.cancellationPolicy,
    refundIssued,
    penaltyCharged,
  ).catch(console.error);

  res.json({ success: true, reservation, refundIssued, penaltyCharged });
}

// ─── Guest self-service: look up a reservation by bookingRef + email ──────────
// Public endpoint — no auth token required.
// Returns reservation details if bookingRef and email match.
export async function guestLookupReservation(req: Request, res: Response): Promise<void> {
  const { bookingRef, email } = req.body;
  if (!bookingRef || !email) throw new AppError('bookingRef and email are required', 400);

  const reservation = await Reservation.findOne({ bookingRef })
    .populate('room', 'name type pricePerNight images');
  if (!reservation) throw new AppError('Reservation not found', 404);

  // Normalise email comparison (case-insensitive)
  if (reservation.guest.email.toLowerCase() !== String(email).toLowerCase().trim()) {
    throw new AppError('Reservation not found', 404); // intentionally vague
  }

  res.json({ success: true, reservation });
}

// ─── Guest self-service: cancel a reservation by bookingRef + email ───────────
// Public endpoint — no admin token required.
// Applies the same flexible/non-refundable logic as the admin cancelReservation.
export async function guestCancelReservation(req: Request, res: Response): Promise<void> {
  const { bookingRef, email } = req.body;
  if (!bookingRef || !email) throw new AppError('bookingRef and email are required', 400);

  const reservation = await Reservation.findOne({ bookingRef })
    .populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);

  if (reservation.guest.email.toLowerCase() !== String(email).toLowerCase().trim()) {
    throw new AppError('Reservation not found', 404);
  }

  if (['checked_in', 'checked_out', 'no_show'].includes(reservation.status)) {
    throw new AppError('Cannot cancel a reservation that is already checked in, completed, or marked no-show', 400);
  }
  if (reservation.status === 'cancelled') throw new AppError('Reservation is already cancelled', 400);

  const now = new Date();
  const hoursUntilCheckIn = (reservation.checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const withinFreeCancelWindow = hoursUntilCheckIn >= 48;

  let refundIssued = false;
  let penaltyCharged = 0;

  if (reservation.cancellationPolicy === 'non_refundable') {
    penaltyCharged = reservation.roomCharges;
  } else {
    if (reservation.stripePaymentIntentId) {
      const room = reservation.room as any;
      if (withinFreeCancelWindow) {
        await stripe.paymentIntents.cancel(reservation.stripePaymentIntentId);
        penaltyCharged = 0;
      } else {
        const oneNightCents = Math.round(room.pricePerNight * 100);
        await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
          amount_to_capture: oneNightCents,
        });
        penaltyCharged = room.pricePerNight;
      }
    }
  }

  reservation.status = 'cancelled';
  reservation.cancelledAt = now;
  reservation.penaltyCharged = penaltyCharged;
  await reservation.save();

  sendCancellationConfirmation(
    reservation.guest.email,
    reservation.guest.name,
    reservation.bookingRef,
    reservation.cancellationPolicy,
    refundIssued,
    penaltyCharged,
  ).catch(console.error);

  res.json({ success: true, reservation, refundIssued, penaltyCharged });
}

// No-show: admin marks guest as no-show on/after check-in date.
// Flexible policy → charges 1 night if paidUpfront, otherwise captures a new charge.
// Non-refundable → hotel already has full payment, nothing extra to charge.
export async function markNoShow(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id).populate('room', 'name pricePerNight');
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (!['pending', 'confirmed'].includes(reservation.status)) {
    throw new AppError('Can only mark pending or confirmed reservations as no-show', 400);
  }

  const now = new Date();
  if (now < reservation.checkInDate) throw new AppError('Cannot mark no-show before check-in date', 400);

  const room = reservation.room as any;
  let penaltyCharged = 0;

  if (reservation.cancellationPolicy === 'non_refundable') {
    // Already charged in full at booking — nothing to do
    penaltyCharged = reservation.roomCharges;
  } else {
    // Flexible — card was authorized (hold) at booking
    if (reservation.stripePaymentIntentId) {
      // Capture exactly 1 night from the held amount
      await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
        amount_to_capture: Math.round(room.pricePerNight * 100),
      });
      penaltyCharged = room.pricePerNight;
    } else {
      // No card on file (e.g. walk-in) — record penalty for manual collection
      penaltyCharged = room.pricePerNight;
    }
  }

  reservation.status = 'no_show';
  reservation.penaltyCharged = penaltyCharged;
  reservation.cancelledAt = now;
  await reservation.save();

  res.json({ success: true, reservation, penaltyCharged });
}

// Admin: mark a non-refundable reservation as paid upfront (cash / offline payment).
// In the normal Stripe flow this is set automatically by chargeUpfront + webhook.
// This endpoint handles cash non-refundable payments and test environments.
export async function markPaidUpfront(req: Request, res: Response): Promise<void> {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (reservation.cancellationPolicy !== 'non_refundable') {
    throw new AppError('Only non-refundable reservations can be marked paid upfront', 400);
  }
  if (reservation.paidUpfront) throw new AppError('Reservation already marked as paid upfront', 400);
  reservation.paidUpfront = true;
  await reservation.save();
  res.json({ success: true, reservation });
}

// Returns booked date ranges for a room so the frontend can gray out unavailable dates.
// Only confirmed + checked_in reservations block availability.
export async function getBlockedDates(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params;
  const reservations = await Reservation.find({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    checkOutDate: { $gte: new Date() },
  }).select('checkInDate checkOutDate');

  const blocked = reservations.map(r => ({
    checkIn: r.checkInDate,
    checkOut: r.checkOutDate,
  }));

  res.json({ success: true, blocked });
}

// Walk-in for a guest who is already checked in and wants a second room.
// Creates a new confirmed reservation + links it back to the existing guest via linkedToGuestId.
// The new room gets its own Guest doc and Bill — no billing collision with the primary stay.
export async function walkInLinkedReservation(req: Request, res: Response): Promise<void> {
  const { existingGuestId, room: roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = req.body;

  if (!existingGuestId) throw new AppError('existingGuestId is required', 400);

  const existingGuest = await Guest.findById(existingGuestId);
  if (!existingGuest) throw new AppError('Existing guest not found', 404);
  if (!existingGuest.isActive) throw new AppError('Existing guest is not currently checked in', 400);

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (checkOut <= checkIn) throw new AppError('Check-out must be after check-in', 400);

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);

  const conflict = await Reservation.findOne({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  });
  if (conflict) {
    throw new AppError(
      `Room is already reserved for these dates (${new Date(conflict.checkInDate).toLocaleDateString()} – ${new Date(conflict.checkOutDate).toLocaleDateString()})`,
      409,
    );
  }

  const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const roomCharges = totalNights * room.pricePerNight;

  const reservation = await Reservation.create({
    guest: {
      name: existingGuest.name,
      email: existingGuest.email,
      phone: existingGuest.phone,
    },
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: numberOfGuests || 1,
    specialRequests,
    totalNights,
    roomCharges,
    status: 'confirmed',
  });

  res.status(201).json({ success: true, reservation, linkedToGuestId: existingGuestId });
}

// Walk-in: create reservation + confirm in one step (admin only)
export async function walkInReservation(req: Request, res: Response): Promise<void> {
  const { guest, room: roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = req.body;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (checkOut <= checkIn) throw new AppError('Check-out must be after check-in', 400);

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);

  // Check for conflicts — block walk-in if room has online reservation overlapping these dates
  const conflict = await Reservation.findOne({
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  });
  if (conflict) {
    throw new AppError(
      `Room is already reserved for these dates (Reservation for ${conflict.guest.name}, ${new Date(conflict.checkInDate).toLocaleDateString()} – ${new Date(conflict.checkOutDate).toLocaleDateString()})`,
      409
    );
  }

  const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const roomCharges = totalNights * room.pricePerNight;

  // Create and immediately confirm reservation
  const reservation = await Reservation.create({
    guest,
    room: roomId,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests: numberOfGuests || 1,
    specialRequests,
    totalNights,
    roomCharges,
    status: 'confirmed', // skip pending for walk-ins
  });

  res.status(201).json({ success: true, reservation });
}
