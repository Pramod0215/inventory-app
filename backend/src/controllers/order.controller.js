import Order from '../models/Order.js';
import { publishCommerceEvent } from '../config/kafka.js';
import { createOrder } from '../services/order.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { validateOrderInput } from '../utils/validation.js';

const placeOrder = asyncHandler(async (req, res) => {
  const { value, errors } = validateOrderInput(req.body);
  if (errors.length) throw new ApiError(400, 'Please correct the order details', errors);
  const order = await createOrder({
    user: req.user,
    items: value.items,
    paymentMethod: value.paymentMethod,
  });

  await publishCommerceEvent('order.created', {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    customerId: order.customerId.toString(),
    total: order.total,
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      quantity: item.quantity,
    })),
  });

  return res.status(201).json(new ApiResponse(201, order, 'Order placed successfully'));
});

const listOrders = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { customerId: req.user.id };
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, orders, 'Orders fetched successfully'));
});

export { listOrders, placeOrder };
