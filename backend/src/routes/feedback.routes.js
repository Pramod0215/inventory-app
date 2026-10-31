import { Router } from 'express';
import { createFeedback } from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.post('/', createFeedback);

export default router;
