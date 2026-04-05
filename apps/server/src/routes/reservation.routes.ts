import { Router } from 'express';
import * as reservations from '../controllers/reservation.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/', reservations.reservationValidation, validate, reservations.createReservation);
router.post('/walk-in', ...requireStaff, adminOrStaff, reservations.walkInReservation);
router.get('/', ...requireStaff, adminOrStaff, reservations.listReservations);
router.get('/:id', ...requireStaff, adminOrStaff, reservations.getReservation);
router.patch('/:id/confirm', ...requireStaff, adminOrStaff, reservations.confirmReservation);
router.patch('/:id/cancel', ...requireStaff, adminOrStaff, reservations.cancelReservation);

export default router;
