import { Router } from 'express';
import { chatWithSupport } from '../controllers/support.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.post('/chat', chatWithSupport);

export default router;
