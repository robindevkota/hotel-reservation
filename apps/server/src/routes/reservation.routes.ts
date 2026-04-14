import { Router } from 'express';
import * as reservations from '../controllers/reservation.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/', reservations.reservationValidation, validate, reservations.createReservation);
router.post('/manage/lookup', reservations.guestLookupReservation);
router.post('/manage/cancel', reservations.guestCancelReservation);
router.post('/walk-in', ...requireStaff, requireAdmin, reservations.walkInReservation);
router.get('/', ...requireStaff, requireAdmin, reservations.listReservations);
router.get('/blocked-dates/:roomId', reservations.getBlockedDates);
router.get('/:id', ...requireStaff, requireAdmin, reservations.getReservation);
router.patch('/:id/confirm', ...requireStaff, requireAdmin, reservations.confirmReservation);
router.patch('/:id/cancel', ...requireStaff, requireAdmin, reservations.cancelReservation);
router.patch('/:id/no-show', ...requireStaff, requireAdmin, reservations.markNoShow);

export default router;
