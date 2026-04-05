import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';

const router = Router();
router.get('/', ...requireStaff, adminOrStaff, getDashboardAnalytics);
export default router;
