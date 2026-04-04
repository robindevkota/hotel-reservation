import { Router } from 'express';
import * as payment from '../controllers/payment.controller';
import { requireGuest, requireStaff, requireStaffOrGuest } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';

const router = Router();

// Stripe webhook (raw body, no auth)
router.post('/webhook', payment.stripeWebhook);

router.post('/intent', requireStaffOrGuest, payment.createPaymentIntent);
router.post('/cash', ...requireStaff, adminOrStaff, payment.cashPayment);
router.get('/receipt/:billId', requireStaffOrGuest, payment.getReceipt);

export default router;
