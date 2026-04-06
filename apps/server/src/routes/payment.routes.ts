import { Router } from 'express';
import * as payment from '../controllers/payment.controller';
import { requireStaff, requireStaffOrGuest } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.post('/webhook', payment.stripeWebhook);
router.post('/intent', requireStaffOrGuest, payment.createPaymentIntent);
router.post('/cash', ...requireStaff, requireAdmin, payment.cashPayment);
router.get('/receipt/:billId', requireStaffOrGuest, payment.getReceipt);

export default router;
