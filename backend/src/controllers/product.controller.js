import { randomUUID } from 'node:crypto';
import Product from '../models/Product.js';
import { publishCommerceEvent } from '../config/kafka.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateObjectId, validateProductInput } from '../utils/validation.js';

const listProducts = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category !== undefined) {
    if (!['construction', 'hardware'].includes(req.query.category)) {
      throw new ApiError(400, 'Category must be construction or hardware');
    }
    filter.category = req.query.category;
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, products, 'Products fetched successfully'));
});

const createProduct = asyncHandler(async (req, res) => {
  const { value, errors } = validateProductInput(req.body);
  if (errors.length) throw new ApiError(400, 'Please correct the product details', errors);
  const { name, brand, category, quantity, price, rating, image, description } = value;

  const product = await Product.create({
    name,
    brand,
    category,
    quantity,
    price,
    rating,
    image,
    description,
    sku: `SKU-${randomUUID().slice(0, 12).toUpperCase()}`,
  });

  await publishCommerceEvent('product.created', {
    id: product.id,
    name: product.name,
    sku: product.sku,
  });

  return res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
});

const updateProduct = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) throw new ApiError(400, 'Product ID is invalid');
  const { value: updates, errors } = validateProductInput(req.body, { partial: true });
  if (errors.length) throw new ApiError(400, 'Please correct the product details', errors);

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'At least one valid product field is required');
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    updates,
    { new: true, runValidators: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');

  await publishCommerceEvent('product.updated', {
    id: product.id,
    name: product.name,
    sku: product.sku,
  });
  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

const deleteProduct = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) throw new ApiError(400, 'Product ID is invalid');
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { isActive: false },
    { new: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');

  await publishCommerceEvent('product.deleted', { id: product.id, sku: product.sku });
  return res.status(200).json(new ApiResponse(200, product, 'Product removed successfully'));
});

export { createProduct, deleteProduct, listProducts, updateProduct };
