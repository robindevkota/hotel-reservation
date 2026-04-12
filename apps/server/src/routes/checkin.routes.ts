import { Router } from 'express';
import { checkIn, checkOut, listActiveGuests } from '../controllers/checkin.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/active', ...requireStaff, requireAdmin, listActiveGuests);
router.post('/:reservationId', ...requireStaff, requireAdmin, checkIn);
router.post('/checkout/:guestId', ...requireStaff, requireAdmin, checkOut);

export default router;
