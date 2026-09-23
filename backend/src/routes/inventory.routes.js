import { Router } from 'express';
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  updateInventoryItem,
} from '../controllers/inventory.controller.js';

const router = Router();

router.route('/').get(getInventoryItems).post(createInventoryItem);
router.route('/:id').get(getInventoryItemById).put(updateInventoryItem).delete(deleteInventoryItem);

export default router;
