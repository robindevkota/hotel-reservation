import { Router } from 'express';
import { getExchangeRate, updateExchangeRate, getDiscountSettings, updateDiscountSettings } from '../controllers/settings.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin, requireSuperAdmin } from '../middleware/role.middleware';

const router = Router();

// Exchange rate — readable by all staff, writable by front_desk + superadmin
router.get('/exchange-rate', ...requireStaff, requireAdmin, getExchangeRate);
router.patch('/exchange-rate', ...requireStaff, requireAdmin, updateExchangeRate);

// Discount settings — readable by all admins, writable by superadmin only
router.get('/discount', ...requireStaff, requireAdmin, getDiscountSettings);
router.patch('/discount', ...requireStaff, requireSuperAdmin, updateDiscountSettings);

export default router;
