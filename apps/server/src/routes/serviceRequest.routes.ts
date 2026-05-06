import { Router } from 'express';
import { requireGuest, requireStaff } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createRequest,
  createRequestValidation,
  listRequests,
  listMyRequests,
  updateStatus,
} from '../controllers/serviceRequest.controller';

const router = Router();

router.post('/',    ...requireGuest, createRequestValidation, validate, createRequest);
router.get('/my',  ...requireGuest, listMyRequests);
router.get('/',    ...requireStaff, listRequests);
router.patch('/:id/status', ...requireStaff, updateStatus);

export default router;
