import { Router } from 'express';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import * as wic from '../controllers/walkInCustomer.controller';

const router = Router();

router.post('/',    ...requireStaff, requireAdmin, wic.createWalkInCustomer);
router.get('/',     ...requireStaff, requireAdmin, wic.listWalkInCustomers);
router.get('/:id',  ...requireStaff, requireAdmin, wic.getWalkInCustomer);

export default router;
