import { Router } from 'express';
import { listOrders, placeOrder } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/', listOrders);
router.post('/', placeOrder);

export default router;
