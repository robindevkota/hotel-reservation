import { Request, Response } from 'express';
import { body } from 'express-validator';
import SpaService from '../models/SpaService';
import SpaBooking from '../models/SpaBooking';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { addLineItem } from '../services/billing.service';
import { emitSpaConfirmed } from '../services/socket.service';
import { sendSpaConfirmation } from '../services/notification.service';

export const spaBookingValidation = [
  body('service').isMongoId(),
  body('date').isISO8601(),
  body('startTime').matches(/^\d{2}:\d{2}$/),
];

export async function listSpaServices(_req: Request, res: Response): Promise<void> {
  const services = await SpaService.find({ isAvailable: true });
  res.json({ success: true, services });
}

export async function getSpaAvailability(req: Request, res: Response): Promise<void> {
  const { serviceId, date } = req.query;
  if (!serviceId || !date) throw new AppError('serviceId and date required', 400);

  const service = await SpaService.findById(serviceId);
  if (!service) throw new AppError('Service not found', 404);

  const bookingDate = new Date(String(date));

  // Find all confirmed/pending bookings for this service on this date
  const booked = await SpaBooking.find({
    service: serviceId,
    date: {
      $gte: new Date(bookingDate.toDateString()),
      $lt: new Date(new Date(bookingDate).setDate(bookingDate.getDate() + 1)),
    },
    status: { $in: ['pending', 'confirmed'] },
  }).select('startTime endTime');

  const bookedTimes = booked.map((b) => b.startTime);
  const available = service.slots.filter((s) => !bookedTimes.includes(s.startTime));

  res.json({ success: true, available });
}

export async function bookSpa(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const { service: serviceId, date, startTime } = req.body;

  const service = await SpaService.findById(serviceId);
  if (!service || !service.isAvailable) throw new AppError('Service not available', 400);

  const slot = service.slots.find((s) => s.startTime === startTime);
  if (!slot) throw new AppError('Invalid time slot', 400);

  // Check for double-booking
  const bookingDate = new Date(date);
  const conflict = await SpaBooking.findOne({
    service: serviceId,
    date: {
      $gte: new Date(bookingDate.toDateString()),
      $lt: new Date(new Date(bookingDate).setDate(bookingDate.getDate() + 1)),
    },
    startTime,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) throw new AppError('This time slot is already booked', 409);

  const booking = await SpaBooking.create({
    guest: guest._id,
    service: serviceId,
    date: bookingDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    price: service.price,
  });

  emitSpaConfirmed(String(guest._id), String(booking._id));
  sendSpaConfirmation(guest.email, guest.name, service.name, bookingDate, startTime).catch(console.error);

  res.status(201).json({ success: true, booking });
}

export async function getMyBookings(req: AuthRequest, res: Response): Promise<void> {
  const bookings = await SpaBooking.find({ guest: req.guest!._id })
    .populate('service', 'name duration category image')
    .sort('-date');
  res.json({ success: true, bookings });
}

export async function getAllBookings(_req: Request, res: Response): Promise<void> {
  const bookings = await SpaBooking.find()
    .populate('guest', 'name room')
    .populate('service', 'name duration')
    .sort('-date');
  res.json({ success: true, bookings });
}

export async function updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body;
  const booking = await SpaBooking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);

  booking.status = status;

  if (status === 'completed' && !booking.addedToBill) {
    const guest = await (await import('../models/Guest')).default.findById(booking.guest);
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

  await booking.save();
  res.json({ success: true, booking });
}
