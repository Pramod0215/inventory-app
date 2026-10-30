import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  inventoryCreate: vi.fn(),
  inventoryFindOne: vi.fn(),
  inventoryFind: vi.fn(),
  inventoryFindById: vi.fn(),
  inventoryFindByIdAndUpdate: vi.fn(),
  inventoryFindByIdAndDelete: vi.fn(),
  productCreate: vi.fn(),
  productFind: vi.fn(),
  productFindOneAndUpdate: vi.fn(),
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
  comparePassword: vi.fn(),
  orderFind: vi.fn(),
  createOrder: vi.fn(),
  publish: vi.fn(),
}));

vi.mock('../../src/models/InventoryItem.js', () => ({
  default: {
    create: mocks.inventoryCreate,
    findOne: mocks.inventoryFindOne,
    find: mocks.inventoryFind,
    findById: mocks.inventoryFindById,
    findByIdAndUpdate: mocks.inventoryFindByIdAndUpdate,
    findByIdAndDelete: mocks.inventoryFindByIdAndDelete,
  },
}));
vi.mock('../../src/models/Product.js', () => ({
  default: {
    create: mocks.productCreate,
    find: mocks.productFind,
    findOneAndUpdate: mocks.productFindOneAndUpdate,
  },
}));
vi.mock('../../src/models/User.js', () => ({
  default: { findOne: mocks.userFindOne, create: mocks.userCreate },
}));
vi.mock('../../src/models/Order.js', () => ({
  default: { find: mocks.orderFind },
}));
vi.mock('../../src/services/order.service.js', () => ({
  createOrder: mocks.createOrder,
}));
vi.mock('../../src/config/kafka.js', () => ({
  publishCommerceEvent: mocks.publish,
}));

import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  updateInventoryItem,
} from '../../src/controllers/inventory.controller.js';
import { loginUser, registerUser } from '../../src/controllers/auth.controller.js';
import { createProduct, deleteProduct, listProducts, updateProduct } from '../../src/controllers/product.controller.js';
import { listOrders, placeOrder } from '../../src/controllers/order.controller.js';

const response = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const invoke = async (handler, req) => {
  return new Promise((resolve, reject) => {
    const res = response();
    res.json.mockImplementation(() => {
      resolve(res);
      return res;
    });

    handler(req, res, (error) => {
      if (error) reject(error);
    });
  });
};

const sortedQuery = (result) => ({ sort: vi.fn().mockResolvedValue(result) });

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  process.env.JWT_SECRET = 'controller-test-secret';
});

describe('inventory controllers', () => {
  it('normalizes and creates inventory SKU fields', async () => {
    mocks.inventoryFindOne.mockResolvedValue(null);
    mocks.inventoryCreate.mockResolvedValue({ sku: 'PIPE-1' });

    const res = await invoke(createInventoryItem, {
      body: { name: ' Pipe ', sku: 'pipe-1', category: 'hardware', quantity: '2', price: '10' },
    });

    expect(mocks.inventoryCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Pipe',
      sku: 'PIPE-1',
      quantity: 2,
      price: 10,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects duplicate SKUs', async () => {
    mocks.inventoryFindOne.mockResolvedValue({ sku: 'PIPE-1' });
    await expect(invoke(createInventoryItem, {
      body: { name: 'Pipe', sku: 'pipe-1', category: 'hardware', quantity: 2, price: 10 },
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('lists, gets, updates, and deletes inventory records', async () => {
    const rows = [{ sku: 'PIPE-1' }];
    mocks.inventoryFind.mockReturnValue(sortedQuery(rows));
    mocks.inventoryFindById.mockResolvedValue(rows[0]);
    mocks.inventoryFindByIdAndUpdate.mockResolvedValue(rows[0]);
    mocks.inventoryFindByIdAndDelete.mockResolvedValue(rows[0]);

    expect((await invoke(getInventoryItems, {})).json).toHaveBeenCalled();
    const id = '507f1f77bcf86cd799439011';
    expect((await invoke(getInventoryItemById, { params: { id } })).status).toHaveBeenCalledWith(200);
    expect((await invoke(updateInventoryItem, { params: { id }, body: { quantity: 3 } })).status).toHaveBeenCalledWith(200);
    expect((await invoke(deleteInventoryItem, { params: { id } })).status).toHaveBeenCalledWith(200);
  });

  it('returns not found when inventory item does not exist', async () => {
    mocks.inventoryFindById.mockResolvedValue(null);
    await expect(invoke(getInventoryItemById, { params: { id: '507f1f77bcf86cd799439011' } }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('authentication controllers', () => {
  it('rejects registration requests missing required fields', async () => {
    await expect(invoke(registerUser, { body: { email: 'a@example.com', password: 'secret12' } }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('registers new accounts as users, regardless of submitted role', async () => {
    mocks.userFindOne.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Customer',
      email: 'customer@example.com',
      role: 'user',
    });

    const res = await invoke(registerUser, {
      body: { name: 'Customer', email: 'CUSTOMER@example.com', password: 'secret12', role: 'admin' },
    });

    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'customer@example.com',
      role: 'user',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data.token).toBeTruthy();
  });

  it('rejects duplicate registration and invalid login credentials', async () => {
    mocks.userFindOne.mockResolvedValueOnce({}).mockResolvedValueOnce(null);
    await expect(invoke(registerUser, {
      body: { name: 'Customer', email: 'a@example.com', password: 'secret12' },
    })).rejects.toMatchObject({ statusCode: 409 });
    await expect(invoke(loginUser, {
      body: { email: 'a@example.com', password: 'wrong-pass' },
    })).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects login requests missing credentials and incorrect passwords', async () => {
    await expect(invoke(loginUser, { body: { email: 'a@example.com' } }))
      .rejects.toMatchObject({ statusCode: 400 });

    mocks.userFindOne.mockResolvedValue({
      comparePassword: mocks.comparePassword,
    });
    mocks.comparePassword.mockResolvedValue(false);

    await expect(invoke(loginUser, {
      body: { email: 'a@example.com', password: 'incorrect' },
    })).rejects.toMatchObject({ statusCode: 401 });
  });

  it('logs in with a verified password', async () => {
    mocks.userFindOne.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Customer',
      email: 'a@example.com',
      role: 'user',
      comparePassword: mocks.comparePassword,
    });
    mocks.comparePassword.mockResolvedValue(true);

    const res = await invoke(loginUser, { body: { email: 'A@example.com', password: 'secret12' } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.user.email).toBe('a@example.com');
  });
});

describe('product controllers', () => {
  it('rejects product creation when required fields are missing', async () => {
    await expect(invoke(createProduct, { body: { name: 'Pipe' } }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.productCreate).not.toHaveBeenCalled();
  });

  it('filters active catalog products by category', async () => {
    mocks.productFind.mockReturnValue(sortedQuery([{ name: 'Pipe' }]));

    const res = await invoke(listProducts, { query: { category: 'hardware' } });

    expect(mocks.productFind).toHaveBeenCalledWith({ isActive: true, category: 'hardware' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('creates products and publishes a created event', async () => {
    mocks.productCreate.mockResolvedValue({ id: 'product-1', name: 'Pipe', sku: 'PIPE-1' });

    const res = await invoke(createProduct, {
      body: { name: 'Pipe', brand: 'FlowPro', category: 'hardware', quantity: '2', price: '25' },
    });

    expect(mocks.productCreate).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 2,
      price: 25,
      rating: 4.5,
    }));
    expect(mocks.publish).toHaveBeenCalledWith('product.created', expect.objectContaining({ id: 'product-1' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('only updates allowed product fields and soft-deletes products', async () => {
    mocks.productFindOneAndUpdate.mockResolvedValue({ id: 'product-1', name: 'Pipe', sku: 'PIPE-1' });

    await invoke(updateProduct, {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { price: '10' },
    });
    expect(mocks.productFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', isActive: true },
      { price: 10 },
      { new: true, runValidators: true }
    );

    await invoke(deleteProduct, { params: { id: '507f1f77bcf86cd799439011' } });
    expect(mocks.productFindOneAndUpdate).toHaveBeenLastCalledWith(
      { _id: '507f1f77bcf86cd799439011', isActive: true },
      { isActive: false },
      { new: true }
    );
  });

  it('rejects empty updates and missing products', async () => {
    await expect(invoke(updateProduct, { params: { id: '507f1f77bcf86cd799439011' }, body: { role: 'admin' } }))
      .rejects.toMatchObject({ statusCode: 400 });
    mocks.productFindOneAndUpdate.mockResolvedValue(null);
    await expect(invoke(deleteProduct, { params: { id: '507f1f77bcf86cd799439011' } }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects invalid product values and unsupported catalog filters', async () => {
    await expect(invoke(createProduct, {
      body: { name: ' ', brand: 'A', category: 'hardware', quantity: -1, price: 'NaN' },
    })).rejects.toMatchObject({ statusCode: 400, errors: expect.any(Array) });
    await expect(invoke(updateProduct, {
      params: { id: 'not-an-object-id' },
      body: { quantity: 1 },
    })).rejects.toMatchObject({ statusCode: 400 });
    await expect(invoke(listProducts, { query: { category: 'unknown' } }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.productCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid inventory updates without passing unknown fields to MongoDB', async () => {
    await expect(invoke(updateInventoryItem, {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { role: 'admin' },
    })).rejects.toMatchObject({ statusCode: 400 });
    await expect(invoke(createInventoryItem, {
      body: { name: 'Pipe', sku: 'bad sku', category: 'hardware', quantity: 1.5, price: -1 },
    })).rejects.toMatchObject({ statusCode: 400, errors: expect.any(Array) });
    expect(mocks.inventoryFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('order controllers', () => {
  it('places an order and publishes an event', async () => {
    const order = {
      id: 'order-1',
      invoiceNumber: 'INV-1',
      customerId: { toString: () => 'user-1' },
      total: 25,
      items: [{ productId: { toString: () => 'product-1' }, quantity: 1 }],
    };
    mocks.createOrder.mockResolvedValue(order);

    const res = await invoke(placeOrder, {
      user: { id: 'user-1', name: 'Customer' },
      body: { paymentMethod: 'UPI', items: [{ productId: '507f1f77bcf86cd799439012', quantity: 1 }] },
    });

    expect(mocks.publish).toHaveBeenCalledWith('order.created', expect.objectContaining({
      invoiceNumber: 'INV-1',
      customerId: 'user-1',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects malformed or oversized order requests before reserving products', async () => {
    await expect(invoke(placeOrder, {
      user: { id: 'user-1', name: 'Customer' },
      body: { paymentMethod: 'crypto', items: [{ productId: 'invalid', quantity: 0 }] },
    })).rejects.toMatchObject({ statusCode: 400, errors: expect.any(Array) });
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('limits customer order lists to the signed-in customer', async () => {
    mocks.orderFind.mockReturnValue(sortedQuery([]));

    await invoke(listOrders, { user: { id: 'user-1', role: 'user' } });
    expect(mocks.orderFind).toHaveBeenCalledWith({ customerId: 'user-1' });

    await invoke(listOrders, { user: { id: 'admin-1', role: 'admin' } });
    expect(mocks.orderFind).toHaveBeenLastCalledWith({});
  });
});
