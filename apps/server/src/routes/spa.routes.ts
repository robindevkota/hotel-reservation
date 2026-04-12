import { Router } from 'express';
import * as spa from '../controllers/spa.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// ── Services (public list, admin CRUD) ───────────────────────────────────────
router.get('/services', spa.listSpaServices);
router.post('/services', ...requireStaff, requireAdmin, spa.serviceValidation, validate, spa.createSpaService);
router.patch('/services/:id', ...requireStaff, requireAdmin, spa.updateSpaService);

// ── Therapists (admin only) ──────────────────────────────────────────────────
router.get('/therapists', ...requireStaff, requireAdmin, spa.listAllTherapists);
router.post('/therapists', ...requireStaff, requireAdmin, spa.therapistValidation, validate, spa.createTherapist);
router.patch('/therapists/:id', ...requireStaff, requireAdmin, spa.updateTherapist);
router.delete('/therapists/:id', ...requireStaff, requireAdmin, spa.deactivateTherapist);

// ── Availability ─────────────────────────────────────────────────────────────
router.get('/availability', ...requireGuest, spa.getSpaAvailability);
router.get('/windows', ...requireGuest, spa.getSpaWindows);  // guest window summary

// ── Guest booking ────────────────────────────────────────────────────────────
router.post('/book', ...requireGuest, spa.spaBookingValidation, validate, spa.bookSpa);
router.get('/bookings/my', ...requireGuest, spa.getMyBookings);

// ── Admin bookings ───────────────────────────────────────────────────────────
router.get('/bookings', ...requireStaff, requireAdmin, spa.getAllBookings);
router.post('/walkin', ...requireStaff, requireAdmin, spa.walkInValidation, validate, spa.walkInBooking);
router.get('/schedule', ...requireStaff, requireAdmin, spa.getDayScheduleHandler);
router.patch('/bookings/:id/status', ...requireStaff, requireAdmin, spa.updateBookingStatus);
router.patch('/bookings/:id/arrive', ...requireStaff, requireAdmin, spa.markArrived);
router.patch('/bookings/:id/complete', ...requireStaff, requireAdmin, spa.markCompleted);

export default router;
