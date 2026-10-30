import { describe, expect, it } from 'vitest';
import { formatPrice } from '../../src/utils/formatPrice.js';
import { validateAuthForm, validateForm, validateProductForm } from '../../src/utils/validateForm.js';

describe('formatPrice', () => {
  it('formats Indian rupee values and treats empty values as zero', () => {
    expect(formatPrice(123456)).toBe('₹1,23,456');
    expect(formatPrice('12.5')).toBe('₹12.5');
    expect(formatPrice(null)).toBe('₹0');
  });
});

describe('validateForm', () => {
  it('requires every field to contain non-whitespace content', () => {
    expect(validateForm({ name: 'Customer', email: 'a@example.com' })).toBe(true);
    expect(validateForm({ name: 'Customer', password: '   ' })).toBe(false);
    expect(validateForm()).toBe(false);
  });

  it('validates authentication fields and signup confirmation', () => {
    expect(validateAuthForm({
      name: 'Customer',
      email: ' customer@example.com ',
      password: 'secure-pass-1',
      confirmPassword: 'secure-pass-1',
    }, false)).toEqual([]);
    expect(validateAuthForm({
      email: 'not-an-email',
      password: 'short',
    }, true)).toEqual([
      'Enter a valid email address.',
      'Password must contain at least 8 characters.',
    ]);
    expect(validateAuthForm({
      name: 'A',
      email: 'customer@example.com',
      password: 'secure-pass-1',
      confirmPassword: 'different-pass',
    }, false)).toContain('Passwords do not match.');
  });

  it('validates product ranges, price precision, and safe image sources', () => {
    const validProduct = {
      name: 'Steel rod',
      brand: 'SteelMax',
      quantity: '12',
      price: '10.99',
      rating: '4.5',
      image: '/images/steel.jpg',
      description: '',
    };
    expect(validateProductForm(validProduct)).toEqual([]);
    expect(validateProductForm({ ...validProduct, price: '19.99' })).toEqual([]);
    expect(validateProductForm({
      ...validProduct,
      quantity: '1.5',
      price: '10.999',
      rating: '6',
      image: 'javascript:alert(1)',
    })).toEqual(expect.arrayContaining([
      'Quantity must be a whole number between 0 and 1,000,000.',
      'Price must be a non-negative amount with no more than 2 decimal places.',
      'Rating must be between 1 and 5, with at most 1 decimal place.',
      'Image must be an HTTP(S) URL or a root-relative path.',
    ]));
  });
});
