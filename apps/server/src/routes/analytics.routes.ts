import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
router.get('/', ...requireStaff, requireAdmin, getDashboardAnalytics);
export default router;
