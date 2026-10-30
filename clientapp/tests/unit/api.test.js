import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/services/api.js';
import { loginUser, signupUser } from '../../src/services/auth.service.js';
import { getCategories } from '../../src/services/category.service.js';
import { createInvoice } from '../../src/services/invoice.service.js';
import { getProducts } from '../../src/services/product.service.js';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

describe('API client', () => {
  it('sends authentication requests with JSON payloads', async () => {
    const loginPayload = { email: 'a@example.com', password: 'secret12' };
    const signupPayload = { name: 'Customer', ...loginPayload };

    await api.auth.login(loginPayload);
    expect(fetch).toHaveBeenLastCalledWith(
      `${api.baseUrl}/auth/login`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(loginPayload) })
    );

    await loginUser(loginPayload);
    expect(fetch).toHaveBeenLastCalledWith(
      `${api.baseUrl}/auth/login`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(loginPayload) })
    );

    await api.auth.signup(signupPayload);
    await signupUser(signupPayload);
    expect(fetch).toHaveBeenLastCalledWith(
      `${api.baseUrl}/auth/signup`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(signupPayload) })
    );
  });

  it('attaches the stored bearer token to protected product and order operations', async () => {
    localStorage.setItem('inventory-token', 'test-token');
    const product = { name: 'Pipe' };
    const order = { items: [] };

    await api.products.list();
    expect(fetch).toHaveBeenLastCalledWith(`${api.baseUrl}/products`);

    await api.products.create(product);
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      body: JSON.stringify(product),
    });

    await api.products.update('product-1', product);
    expect(fetch.mock.calls.at(-1)[1].method).toBe('PUT');

    await api.products.remove('product-1');
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    });

    await api.orders.create(order);
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      body: JSON.stringify(order),
    });

    await api.orders.list();
    expect(fetch.mock.calls.at(-1)[1].headers.Authorization).toBe('Bearer test-token');
  });

  it('sends an empty bearer token when protected requests have no saved session', async () => {
    await api.orders.list();

    expect(fetch).toHaveBeenLastCalledWith(`${api.baseUrl}/orders`, {
      headers: { Authorization: 'Bearer ' },
    });
  });

  it('keeps placeholder services safe until their API implementation is added', async () => {
    await expect(getProducts()).resolves.toEqual([]);
    await expect(getCategories()).resolves.toEqual([]);
    await expect(createInvoice()).resolves.toBeNull();
  });
});
