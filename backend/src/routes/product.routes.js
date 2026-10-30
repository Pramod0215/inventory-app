import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listProducts);
router.post('/', authenticate, requireAdmin, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
