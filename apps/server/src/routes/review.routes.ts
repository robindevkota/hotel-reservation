import { Router } from 'express';
import * as rev from '../controllers/review.controller';
import { requireGuest } from '../middleware/auth.middleware';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Guest: check eligibility + submit/update review
router.get('/eligible',          ...requireGuest, rev.getEligible);
router.post('/',                 ...requireGuest, rev.reviewValidation, rev.submitReview);

// Public: visible reviews + aggregated stats
router.get('/public',            rev.getPublicReviews);

// Admin: full list + hide/show
router.get('/',                  ...requireStaff, requireAdmin, rev.listReviews);
router.patch('/:id/visibility',  ...requireStaff, requireAdmin, rev.toggleVisibility);

export default router;
