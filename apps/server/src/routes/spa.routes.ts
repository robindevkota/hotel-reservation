import { Router } from 'express';
import * as spa from '../controllers/spa.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/services', spa.listSpaServices);
router.get('/availability', ...requireGuest, spa.getSpaAvailability);
router.post('/book', ...requireGuest, spa.spaBookingValidation, validate, spa.bookSpa);
router.get('/bookings/my', ...requireGuest, spa.getMyBookings);
router.get('/bookings', ...requireStaff, adminOrStaff, spa.getAllBookings);
router.patch('/bookings/:id/status', ...requireStaff, adminOrStaff, spa.updateBookingStatus);

export default router;
