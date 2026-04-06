import { Router } from 'express';
import * as spa from '../controllers/spa.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/services', spa.listSpaServices);
router.get('/availability', ...requireGuest, spa.getSpaAvailability);
router.post('/book', ...requireGuest, spa.spaBookingValidation, validate, spa.bookSpa);
router.get('/bookings/my', ...requireGuest, spa.getMyBookings);
router.get('/bookings', ...requireStaff, requireAdmin, spa.getAllBookings);
router.patch('/bookings/:id/status', ...requireStaff, requireAdmin, spa.updateBookingStatus);

export default router;
