import { Router } from 'express';
import * as orders from '../controllers/order.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/', ...requireGuest, orders.orderValidation, validate, orders.placeOrder);
router.get('/my', ...requireGuest, orders.getMyOrders);

router.get('/', ...requireStaff, requireAdmin, orders.getAllOrders);
router.patch('/:id/status', ...requireStaff, requireAdmin, orders.updateOrderStatus);
router.patch('/:id/cancel', ...requireStaff, requireAdmin, orders.cancelOrder);
router.patch('/:id/assign', ...requireStaff, requireAdmin, orders.assignWaiter);

export default router;
