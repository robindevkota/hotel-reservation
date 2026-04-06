import { Router } from 'express';
import * as billing from '../controllers/billing.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/my', ...requireGuest, billing.getMyBill);
router.get('/reservation/:reservationId', ...requireStaff, requireAdmin, billing.getBillByReservation);
router.get('/:guestId', ...requireStaff, requireAdmin, billing.getGuestBill);
router.post('/:guestId/add', ...requireStaff, requireAdmin, billing.manualChargeValidation, validate, billing.addManualCharge);

export default router;
