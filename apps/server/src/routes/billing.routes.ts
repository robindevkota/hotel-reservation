import { Router } from 'express';
import * as billing from '../controllers/billing.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/my', ...requireGuest, billing.getMyBill);
router.get('/:guestId', ...requireStaff, adminOrStaff, billing.getGuestBill);
router.post('/:guestId/add', ...requireStaff, adminOrStaff, billing.manualChargeValidation, validate, billing.addManualCharge);

export default router;
