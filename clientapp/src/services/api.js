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
};
