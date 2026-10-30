import InventoryItem from '../models/InventoryItem.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateInventoryInput, validateObjectId } from '../utils/validation.js';

const createInventoryItem = asyncHandler(async (req, res) => {
  const { value, errors } = validateInventoryInput(req.body);
  if (errors.length) throw new ApiError(400, 'Please correct the inventory item details', errors);
  const { name, sku, category, quantity, price, description, supplier } = value;

  const existingItem = await InventoryItem.findOne({ sku: sku.trim().toUpperCase() });

  if (existingItem) {
    throw new ApiError(409, 'Inventory item with this SKU already exists');
  }

  const item = await InventoryItem.create({
    name,
    sku,
    category,
    quantity,
    price,
    description,
    supplier,
  });

  return res.status(201).json(new ApiResponse(201, item, 'Inventory item created successfully'));
});

const getInventoryItems = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find().sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, 'Inventory items fetched successfully'));
});

const getInventoryItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateObjectId(id)) throw new ApiError(400, 'Inventory item ID is invalid');
  const item = await InventoryItem.findById(id);

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, 'Inventory item fetched successfully'));
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateObjectId(id)) throw new ApiError(400, 'Inventory item ID is invalid');
  const { value: updates, errors } = validateInventoryInput(req.body, { partial: true });
  if (errors.length) throw new ApiError(400, 'Please correct the inventory item details', errors);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'At least one valid inventory item field is required');
  }

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
  if (!validateObjectId(id)) throw new ApiError(400, 'Inventory item ID is invalid');
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
