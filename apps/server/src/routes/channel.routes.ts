import { Router } from 'express';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import * as channel from '../controllers/channel.controller';

const router = Router();

// Public iCal feed — OTAs subscribe to this URL
router.get('/ical.ics', channel.exportICal);

// Admin-only channel management
router.get('/',                    ...requireStaff, requireAdmin, channel.listChannels);
router.post('/',                   ...requireStaff, requireAdmin, channel.upsertChannel);
router.delete('/:source',          ...requireStaff, requireAdmin, channel.deleteChannel);
router.post('/sync/:source',       ...requireStaff, requireAdmin, channel.triggerSync);

export default router;
