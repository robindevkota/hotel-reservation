import { Router } from 'express';
import * as menu from '../controllers/menu.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/', menu.listMenuItems);
router.get('/:id', menu.getMenuItem);
router.post('/', ...requireStaff, requireAdmin, menu.menuItemValidation, validate, menu.createMenuItem);
router.put('/:id', ...requireStaff, requireAdmin, menu.updateMenuItem);
router.delete('/:id', ...requireStaff, requireAdmin, menu.deleteMenuItem);

export default router;
