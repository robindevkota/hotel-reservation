import { Router } from 'express';
import { checkIn, checkOut } from '../controllers/checkin.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';

const router = Router();

router.post('/:reservationId', ...requireStaff, adminOrStaff, checkIn);
router.post('/checkout/:guestId', ...requireStaff, adminOrStaff, checkOut);

export default router;
