import { Router } from 'express';
import multer from 'multer';
import * as rooms from '../controllers/room.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', rooms.listRooms);
router.get('/availability', rooms.getRoomAvailability);
router.get('/calendar', ...requireStaff, requireAdmin, rooms.getRoomCalendar);

router.post('/upload-image', ...requireStaff, requireAdmin, upload.single('image'), rooms.uploadRoomImage);

router.get('/:slug', rooms.getRoomBySlug);

router.post('/', ...requireStaff, requireAdmin, rooms.roomValidation, validate, rooms.createRoom);
router.put('/:id', ...requireStaff, requireAdmin, rooms.updateRoom);
router.delete('/:id', ...requireStaff, requireAdmin, rooms.deleteRoom);
router.get('/:id/qr', ...requireStaff, requireAdmin, rooms.getRoomById);
router.post('/:id/qr/refresh', ...requireStaff, requireAdmin, rooms.regenerateQR);

export default router;
