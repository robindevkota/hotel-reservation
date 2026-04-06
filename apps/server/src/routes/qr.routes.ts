import { Router } from 'express';
import { verifyQR, refreshQR } from '../controllers/qr.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/verify/:roomToken', verifyQR);
router.post('/refresh/:roomId', ...requireStaff, requireAdmin, refreshQR);

export default router;
