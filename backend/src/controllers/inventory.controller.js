import InventoryItem from '../models/InventoryItem.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createInventoryItem = asyncHandler(async (req, res) => {
  const { name, sku, category, quantity, price, description, supplier } = req.body;

  if (!name || !sku || !category || quantity === undefined || price === undefined) {
    throw new ApiError(400, 'Name, SKU, category, quantity and price are required');
  }

  const existingItem = await InventoryItem.findOne({ sku: sku.trim().toUpperCase() });

  if (existingItem) {
    throw new ApiError(409, 'Inventory item with this SKU already exists');
  }

  const item = await InventoryItem.create({
    name: name.trim(),
    sku: sku.trim().toUpperCase(),
    category: category.trim(),
    quantity: Number(quantity),
    price: Number(price),
    description: description?.trim() || '',
    supplier: supplier?.trim() || '',
  });

  return res.status(201).json(new ApiResponse(201, item, 'Inventory item created successfully'));
});

const getInventoryItems = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find().sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, 'Inventory items fetched successfully'));
});

const getInventoryItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await InventoryItem.findById(id);

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, 'Inventory item fetched successfully'));
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const item = await InventoryItem.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, 'Inventory item updated successfully'));
});

const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await InventoryItem.findByIdAndDelete(id);

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, 'Inventory item deleted successfully'));
});

export {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
};
