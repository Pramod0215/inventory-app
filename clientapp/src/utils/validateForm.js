export function validateForm(values = {}) {
  const fields = Object.values(values);
  return fields.length > 0 && fields.every(
    (value) => (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== ''
  );
}

export function validateAuthForm(values = {}, isLogin = true) {
  const errors = [];
  const email = typeof values.email === 'string' ? values.email.trim() : '';
  const password = typeof values.password === 'string' ? values.password : '';

  if (!isLogin) {
    const name = typeof values.name === 'string' ? values.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      errors.push('Name must contain between 2 and 80 characters.');
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.push('Enter a valid email address.');
  }
  if (!password.trim()) errors.push('Password cannot be empty.');
  if (password.length < 8) errors.push('Password must contain at least 8 characters.');
  if (new TextEncoder().encode(password).length > 72) {
    errors.push('Password must not exceed 72 UTF-8 bytes.');
  }
  if (!isLogin && password !== values.confirmPassword) errors.push('Passwords do not match.');

  return errors;
}

export function validateProductForm(values = {}) {
  const errors = [];
  const name = typeof values.name === 'string' ? values.name.trim() : '';
  const brand = typeof values.brand === 'string' ? values.brand.trim() : '';
  const quantity = Number(values.quantity);
  const price = Number(values.price);
  const rating = Number(values.rating);

  if (name.length < 2 || name.length > 120) {
    errors.push('Product name must contain between 2 and 120 characters.');
  }
  if (/[\u0000-\u001f\u007f]/.test(name)) errors.push('Product name contains invalid characters.');
  if (brand.length < 2 || brand.length > 80) {
    errors.push('Brand must contain between 2 and 80 characters.');
  }
  if (/[\u0000-\u001f\u007f]/.test(brand)) errors.push('Brand contains invalid characters.');
  if (values.quantity === '' || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1_000_000) {
    errors.push('Quantity must be a whole number between 0 and 1,000,000.');
  }
  if (
    values.price === '' ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 1_000_000_000 ||
    Number(price.toFixed(2)) !== price
  ) {
    errors.push('Price must be a non-negative amount with no more than 2 decimal places.');
  }
  if (values.rating !== '' && (!Number.isFinite(rating) || rating < 1 || rating > 5 || Number(rating.toFixed(1)) !== rating)) {
    errors.push('Rating must be between 1 and 5, with at most 1 decimal place.');
  }
  if (typeof values.image === 'string' && values.image.trim()) {
    const image = values.image.trim();
    const rootRelative = image.startsWith('/') && !image.startsWith('//') && !image.includes('\\');
    let httpUrl = false;
    try {
      const parsed = new URL(image);
      httpUrl = ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      httpUrl = false;
    }
    if (image.length > 2048 || (!rootRelative && !httpUrl)) {
      errors.push('Image must be an HTTP(S) URL or a root-relative path.');
    }
  }
  if (typeof values.description === 'string' && values.description.length > 2000) {
    errors.push('Description must not exceed 2,000 characters.');
  }

  return errors;
}
