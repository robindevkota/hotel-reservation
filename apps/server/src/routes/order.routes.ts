import { Router } from 'express';
import * as orders from '../controllers/order.controller';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { kitchenOrAbove, waiterOrAbove } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Guest routes
router.post('/', ...requireGuest, orders.orderValidation, validate, orders.placeOrder);
router.get('/my', ...requireGuest, orders.getMyOrders);

// Staff / kitchen routes
router.get('/', ...requireStaff, kitchenOrAbove, orders.getAllOrders);
router.patch('/:id/status', ...requireStaff, kitchenOrAbove, orders.updateOrderStatus);
router.patch('/:id/cancel', ...requireStaff, kitchenOrAbove, orders.cancelOrder);
router.patch('/:id/assign', ...requireStaff, waiterOrAbove, orders.assignWaiter);

export default router;
