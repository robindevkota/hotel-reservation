import { Router } from 'express';
import * as offer from '../controllers/offer.controller';
import { requireStaff } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Public — guest/public UI fetches this on mount
router.get('/active', offer.getActiveOfferPublic);

// Admin CRUD
router.get('/',     ...requireStaff, requireAdmin, offer.listOffers);
router.post('/',    ...requireStaff, requireAdmin, offer.offerValidation, offer.createOffer);
router.patch('/:id',...requireStaff, requireAdmin, offer.updateOffer);
router.delete('/:id',...requireStaff, requireAdmin, offer.deleteOffer);

export default router;
