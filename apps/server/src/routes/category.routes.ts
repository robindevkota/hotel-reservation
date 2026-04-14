import { Router } from 'express';
import * as cat from '../controllers/category.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/', cat.listCategories);
router.post('/', ...requireStaff, requireAdmin, cat.categoryValidation, validate, cat.createCategory);
router.put('/:id', ...requireStaff, requireAdmin, cat.updateCategory);
router.delete('/:id', ...requireStaff, requireAdmin, cat.deleteCategory);

export default router;
