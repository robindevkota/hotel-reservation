import { Router } from 'express';
import * as rooms from '../controllers/room.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/', rooms.listRooms);
router.get('/:slug', rooms.getRoomBySlug);

// Admin routes
router.post('/', ...requireStaff, adminOnly, rooms.roomValidation, validate, rooms.createRoom);
router.put('/:id', ...requireStaff, adminOnly, rooms.updateRoom);
router.delete('/:id', ...requireStaff, adminOnly, rooms.deleteRoom);
router.get('/:id/qr', ...requireStaff, adminOnly, rooms.getRoomById);
router.post('/:id/qr/refresh', ...requireStaff, adminOnly, rooms.regenerateQR);

export default router;
