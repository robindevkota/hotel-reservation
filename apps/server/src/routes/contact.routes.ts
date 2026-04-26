import { Router } from 'express';
import { contactValidation, sendContact } from '../controllers/contact.controller';

const router = Router();

router.post('/', contactValidation, sendContact);

export default router;
