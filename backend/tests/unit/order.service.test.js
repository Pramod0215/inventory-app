import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/utils/ApiError.js';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../src/models/Product.js', () => ({
  default: {
    findOneAndUpdate: mocks.findOneAndUpdate,
    updateOne: mocks.updateOne,
  },
}));

vi.mock('../../src/models/Order.js', () => ({
  default: { create: mocks.create },
}));

import { createOrder } from '../../src/services/order.service.js';

const user = { id: '507f1f77bcf86cd799439011', name: 'Test Customer' };
const productId = '507f1f77bcf86cd799439012';
const product = {
  _id: productId,
  name: 'Pipe',
  brand: 'FlowPro',
  sku: 'PIPE-1',
  price: 25,
};

beforeEach(() => {
  mocks.findOneAndUpdate.mockReset();
  mocks.updateOne.mockReset().mockResolvedValue({});
  mocks.create.mockReset();
});

describe('createOrder', () => {
  it.each([
    [{ items: [], paymentMethod: 'UPI' }, 'At least one product is required'],
    [{ items: [{}], paymentMethod: 'UPI' }, 'A product ID is invalid'],
    [{ items: [{ productId, quantity: 0 }], paymentMethod: 'UPI' }, 'positive whole numbers'],
    [{ items: [{ productId, quantity: 1 }], paymentMethod: 'card' }, 'Payment method'],
  ])('rejects invalid order input', async (input, message) => {
    await expect(createOrder({ user, ...input })).rejects.toThrow(message);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reserves stock, computes authoritative line totals, and persists the order', async () => {
    mocks.findOneAndUpdate.mockResolvedValue(product);
    mocks.create.mockImplementation(async (order) => order);

    const result = await createOrder({
      user,
      paymentMethod: 'UPI',
      items: [{ productId, quantity: 2 }, { productId, quantity: 1 }],
    });

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: productId, isActive: true, quantity: { $gte: 3 } },
      { $inc: { quantity: -3 } },
      { new: true }
    );
    expect(result.items[0]).toMatchObject({ quantity: 3, price: 25, amount: 75 });
    expect(result.total).toBe(75);
    expect(result.invoiceNumber).toMatch(/^INV-/);
  });

  it('restores previously reserved stock if a later product is unavailable', async () => {
    const secondProductId = '507f1f77bcf86cd799439013';
    mocks.findOneAndUpdate
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);

    await expect(createOrder({
      user,
      paymentMethod: 'Cash',
      items: [
        { productId, quantity: 1 },
        { productId: secondProductId, quantity: 2 },
      ],
    })).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: productId },
      { $inc: { quantity: 1 } }
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('reports a failed stock rollback without hiding the original error', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce(product).mockResolvedValueOnce(null);
    mocks.updateOne.mockRejectedValue(new Error('database unavailable'));

    await expect(createOrder({
      user,
      paymentMethod: 'Cash',
      items: [
        { productId, quantity: 1 },
        { productId: '507f1f77bcf86cd799439013', quantity: 1 },
      ],
    })).rejects.toBeInstanceOf(AggregateError);
  });
});
