import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';

const createOrder = async ({ user, items, paymentMethod }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one product is required');
  }

  if (items.some((item) => !item || typeof item !== 'object')) {
    throw new ApiError(400, 'Each order item must include a product ID and quantity');
  }

  if (!['UPI', 'Cash'].includes(paymentMethod)) {
    throw new ApiError(400, 'Payment method must be UPI or Cash');
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = String(item.productId || '');
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, 'A product ID is invalid');
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, 'Product quantities must be positive whole numbers');
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const reserved = [];
  try {
    const orderItems = [];

    for (const [productId, quantity] of quantities) {
      const product = await Product.findOneAndUpdate(
        { _id: productId, isActive: true, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );

      if (!product) {
        throw new ApiError(409, 'A product is unavailable or has insufficient stock');
      }

      reserved.push({ productId: product._id, quantity });
      orderItems.push({
        productId: product._id,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        price: product.price,
        quantity,
        amount: product.price * quantity,
      });
    }

    const total = orderItems.reduce((sum, item) => sum + item.amount, 0);
    return await Order.create({
      invoiceNumber: `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerId: user.id,
      customerName: user.name,
      paymentMethod,
      items: orderItems,
      total,
    });
  } catch (error) {
    try {
      await Promise.all(
        reserved.map(({ productId, quantity }) =>
          Product.updateOne({ _id: productId }, { $inc: { quantity } })
        )
      );
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Order failed and product stock could not be fully restored'
      );
    }

    throw error;
  }
};

export { createOrder };
