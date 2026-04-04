import { Router } from 'express';
import { verifyQR, refreshQR } from '../controllers/qr.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOrStaff } from '../middleware/role.middleware';

const router = Router();

router.get('/verify/:roomToken', verifyQR);
router.post('/refresh/:roomId', ...requireStaff, adminOrStaff, refreshQR);

export default router;
