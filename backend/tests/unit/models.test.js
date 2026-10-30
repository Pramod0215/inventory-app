import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import InventoryItem from '../../src/models/InventoryItem.js';
import Order from '../../src/models/Order.js';
import Product from '../../src/models/Product.js';
import User from '../../src/models/User.js';

describe('Mongoose model validation', () => {
  it('accepts a valid product and rejects invalid category and negative stock', async () => {
    const product = new Product({
      name: 'Pipe',
      sku: 'PIPE-1',
      brand: 'FlowPro',
      category: 'hardware',
      quantity: 3,
      price: 99,
    });
    await expect(product.validate()).resolves.toBeUndefined();
    await expect(new Product({ ...product.toObject(), category: 'unknown', quantity: -1 }).validate())
      .rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('requires a valid order and valid payment method', async () => {
    const order = new Order({
      invoiceNumber: 'INV-1',
      customerId: '507f1f77bcf86cd799439011',
      customerName: 'Customer',
      paymentMethod: 'UPI',
      items: [{
        productId: '507f1f77bcf86cd799439012',
        name: 'Pipe',
        brand: 'FlowPro',
        sku: 'PIPE-1',
        price: 99,
        quantity: 1,
        amount: 99,
      }],
      total: 99,
    });
    await expect(order.validate()).resolves.toBeUndefined();

    order.paymentMethod = 'Bitcoin';
    await expect(order.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('validates inventory stock and normalizes SKU values', async () => {
    const item = new InventoryItem({
      name: '  Steel Rod  ',
      sku: 'rod-12',
      category: 'construction',
      quantity: 2,
      price: 10,
    });

    await item.validate();
    expect(item.name).toBe('Steel Rod');
    expect(item.sku).toBe('ROD-12');

    item.quantity = -1;
    await expect(item.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('hashes passwords, compares credentials, and omits passwords from JSON', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret12',
    });
    await user.validate();
    user.password = await bcrypt.hash('secret12', 10);

    expect(user.password).not.toBe('secret12');
    await expect(user.comparePassword('secret12')).resolves.toBe(true);
    await expect(user.comparePassword('incorrect')).resolves.toBe(false);
    expect(user.toJSON()).not.toHaveProperty('password');
  });

  it('rejects invalid email addresses and passwords shorter than eight characters', async () => {
    const invalidEmail = new User({
      name: 'Test User',
      email: 'not-an-email',
      password: 'secret12',
    });
    await expect(invalidEmail.validate()).rejects.toMatchObject({ name: 'ValidationError' });

    const shortPassword = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'short',
    });
    await expect(shortPassword.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects fractional stock and prices with more than two decimal places', async () => {
    const product = new Product({
      name: 'Pipe',
      sku: 'PIPE-2',
      brand: 'FlowPro',
      category: 'hardware',
      quantity: 1.5,
      price: 10.999,
    });

    await expect(product.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });
});
