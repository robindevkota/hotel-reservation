import { Router } from 'express';
import { checkIn, checkOut } from '../controllers/checkin.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.post('/:reservationId', ...requireStaff, requireAdmin, checkIn);
router.post('/checkout/:guestId', ...requireStaff, requireAdmin, checkOut);

export default router;
