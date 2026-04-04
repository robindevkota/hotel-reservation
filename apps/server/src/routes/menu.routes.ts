import { Router } from 'express';
import * as menu from '../controllers/menu.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/', menu.listMenuItems);
router.get('/:id', menu.getMenuItem);
router.post('/', ...requireStaff, adminOnly, menu.menuItemValidation, validate, menu.createMenuItem);
router.put('/:id', ...requireStaff, adminOnly, menu.updateMenuItem);
router.delete('/:id', ...requireStaff, adminOnly, menu.deleteMenuItem);

export default router;
