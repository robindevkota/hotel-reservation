import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/register', auth.registerValidation, validate, auth.register);
router.post('/login', auth.loginValidation, validate, auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', ...requireStaff, auth.getMe);
router.post('/change-password', ...requireStaff, auth.changePasswordValidation, validate, auth.changePassword);

export default router;
