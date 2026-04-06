import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Only super_admin can create new admin accounts
router.post('/register', ...requireStaff, requireSuperAdmin, auth.registerValidation, validate, auth.register);
router.post('/login', auth.loginValidation, validate, auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', ...requireStaff, auth.getMe);
router.get('/admins', ...requireStaff, requireSuperAdmin, auth.listAdmins);
router.patch('/admins/:id/toggle', ...requireStaff, requireSuperAdmin, auth.toggleAdmin);
router.post('/change-password', ...requireStaff, auth.changePasswordValidation, validate, auth.changePassword);

export default router;
