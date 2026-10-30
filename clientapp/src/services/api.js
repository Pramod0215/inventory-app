const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = {
  baseUrl: API_URL,
  auth: {
    login: (payload) => fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    signup: (payload) => fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  },
  products: {
    list: () => fetch(`${API_URL}/products`),
    create: (payload) => fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('inventory-token') || ''}`,
      },
      body: JSON.stringify(payload),
    }),
    update: (id, payload) => fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('inventory-token') || ''}`,
      },
      body: JSON.stringify(payload),
    }),
    remove: (id) => fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('inventory-token') || ''}`,
      },
    }),
  },
  orders: {
    create: (payload) => fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('inventory-token') || ''}`,
      },
      body: JSON.stringify(payload),
    }),
    list: () => fetch(`${API_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('inventory-token') || ''}`,
      },
    }),
  },
};
