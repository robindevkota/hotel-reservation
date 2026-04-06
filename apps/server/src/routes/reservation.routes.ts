import { Router } from 'express';
import * as reservations from '../controllers/reservation.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/', reservations.reservationValidation, validate, reservations.createReservation);
router.post('/walk-in', ...requireStaff, requireAdmin, reservations.walkInReservation);
router.get('/', ...requireStaff, requireAdmin, reservations.listReservations);
router.get('/:id', ...requireStaff, requireAdmin, reservations.getReservation);
router.patch('/:id/confirm', ...requireStaff, requireAdmin, reservations.confirmReservation);
router.patch('/:id/cancel', ...requireStaff, requireAdmin, reservations.cancelReservation);

export default router;
