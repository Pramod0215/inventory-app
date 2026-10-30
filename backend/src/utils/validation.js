import mongoose from 'mongoose';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const addError = (errors, field, message) => errors.push({ field, message });

const checkUnknownFields = (value, allowedFields, errors) => {
  for (const field of Object.keys(value)) {
    if (!allowedFields.includes(field)) addError(errors, field, 'This field is not allowed');
  }
};

const validateText = (value, field, { required = false, allowEmpty = false, min = 1, max = 120 } = {}, errors) => {
  if (typeof value !== 'string') {
    if (required && value === undefined) addError(errors, field, `${field} is required`);
    else if (required || value !== undefined) addError(errors, field, `${field} must be a string`);
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    if (required) addError(errors, field, `${field} is required`);
    else if (!allowEmpty) addError(errors, field, `${field} cannot be empty`);
    return normalized;
  }
  if (normalized.length < min) addError(errors, field, `${field} must contain at least ${min} characters`);
  if (normalized.length > max) addError(errors, field, `${field} must not exceed ${max} characters`);
  if (/[\u0000-\u001f\u007f]/.test(normalized)) addError(errors, field, `${field} contains invalid characters`);
  return normalized;
};

const validateNumber = (value, field, { required = false, integer = false, min = 0, max = 1_000_000_000, decimals = 2 } = {}, errors) => {
  if (value === undefined) {
    if (required) addError(errors, field, `${field} is required`);
    return undefined;
  }

  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()))
  ) {
    addError(errors, field, `${field} must be a number`);
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    addError(errors, field, `${field} must be a finite number`);
    return undefined;
  }
  if (number < min || number > max) addError(errors, field, `${field} must be between ${min} and ${max}`);
  if (integer && !Number.isSafeInteger(number)) addError(errors, field, `${field} must be a whole number`);
  if (!integer && Number(number.toFixed(decimals)) !== number) {
    addError(errors, field, `${field} must have no more than ${decimals} decimal places`);
  }
  return number;
};

const validateBody = (body) => {
  if (isRecord(body)) return { value: body, errors: [] };
  return {
    value: {},
    errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
  };
};

const validateAuthInput = (body, { registration = false } = {}) => {
  const { value, errors } = validateBody(body);
  checkUnknownFields(value, registration ? ['name', 'email', 'password', 'role'] : ['email', 'password'], errors);

  const name = registration
    ? validateText(value.name, 'name', { required: true, min: 2, max: 80 }, errors)
    : undefined;

  let email;
  if (typeof value.email !== 'string') {
    addError(errors, 'email', 'Email is required and must be a valid email address');
  } else {
    email = value.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addError(errors, 'email', 'Please provide a valid email address');
    }
  }

  const password = value.password;
  if (typeof password !== 'string') {
    addError(errors, 'password', 'Password is required');
  } else {
    if (!password.trim()) addError(errors, 'password', 'Password cannot be empty');
    if (password.length < 8) addError(errors, 'password', 'Password must contain at least 8 characters');
    if (Buffer.byteLength(password, 'utf8') > 72) {
      addError(errors, 'password', 'Password must not exceed 72 UTF-8 bytes');
    }
  }

  return { value: { name, email, password }, errors };
};

const productFields = ['name', 'brand', 'category', 'quantity', 'price', 'rating', 'image', 'description'];

const validateProductInput = (body, { partial = false } = {}) => {
  const { value: input, errors } = validateBody(body);
  checkUnknownFields(input, productFields, errors);
  const value = {};

  for (const field of ['name', 'brand']) {
    if (!partial || input[field] !== undefined) {
      value[field] = validateText(input[field], field, {
        required: !partial,
        min: 2,
        max: field === 'name' ? 120 : 80,
      }, errors);
    }
  }

  if (!partial || input.category !== undefined) {
    if (typeof input.category !== 'string' || !['construction', 'hardware'].includes(input.category.trim())) {
      addError(errors, 'category', 'Category must be construction or hardware');
    } else {
      value.category = input.category.trim();
    }
  }

  for (const field of ['quantity', 'price', 'rating']) {
    if (!partial || input[field] !== undefined) {
      if (field === 'rating' && !partial && input[field] === undefined) {
        value.rating = 4.5;
        continue;
      }
      value[field] = validateNumber(input[field], field, {
        required: !partial && field !== 'rating',
        integer: field === 'quantity',
        min: field === 'rating' ? 1 : 0,
        max: field === 'rating' ? 5 : field === 'quantity' ? 1_000_000 : 1_000_000_000,
        decimals: field === 'rating' ? 1 : 2,
      }, errors);
    }
  }

  for (const [field, max] of [['image', 2048], ['description', 2000]]) {
    if (!partial || input[field] !== undefined) {
      const text = validateText(input[field] === undefined ? '' : input[field], field, {
        max,
        allowEmpty: true,
      }, errors);
      if (field === 'image' && text) {
        const validPath = text.startsWith('/') && !text.startsWith('//') && !text.includes('\\');
        let validUrl = false;
        try {
          const parsed = new URL(text);
          validUrl = ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          validUrl = false;
        }
        if (!validPath && !validUrl) addError(errors, 'image', 'Image must be an HTTP(S) URL or a root-relative path');
      }
      value[field] = text;
    }
  }

  return { value, errors };
};

const inventoryFields = ['name', 'sku', 'category', 'quantity', 'price', 'description', 'supplier'];

const validateInventoryInput = (body, { partial = false } = {}) => {
  const { value: input, errors } = validateBody(body);
  checkUnknownFields(input, inventoryFields, errors);
  const value = {};

  for (const [field, max] of [['name', 120], ['category', 80], ['description', 2000], ['supplier', 120]]) {
    if (!partial || input[field] !== undefined) {
      value[field] = validateText(input[field] ?? (partial ? undefined : ''), field, {
        required: !partial && ['name', 'category'].includes(field),
        allowEmpty: ['description', 'supplier'].includes(field),
        min: 2,
        max,
      }, errors);
    }
  }

  if (!partial || input.sku !== undefined) {
    const sku = validateText(input.sku, 'sku', { required: !partial, min: 2, max: 64 }, errors);
    if (sku && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(sku)) {
      addError(errors, 'sku', 'SKU may contain only letters, numbers, hyphens, and underscores');
    }
    if (sku !== undefined) value.sku = sku.toUpperCase();
  }

  for (const field of ['quantity', 'price']) {
    if (!partial || input[field] !== undefined) {
      value[field] = validateNumber(input[field], field, {
        required: !partial,
        integer: field === 'quantity',
        max: field === 'quantity' ? 1_000_000 : 1_000_000_000,
      }, errors);
    }
  }

  return { value, errors };
};

const validateOrderInput = (body) => {
  const { value, errors } = validateBody(body);
  checkUnknownFields(value, ['items', 'paymentMethod'], errors);

  if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 50) {
    addError(errors, 'items', 'Order must contain between 1 and 50 items');
  } else {
    value.items.forEach((item, index) => {
      if (!isRecord(item)) {
        addError(errors, `items.${index}`, 'Each order item must be an object');
        return;
      }
      checkUnknownFields(item, ['productId', 'quantity'], errors);
      if (typeof item.productId !== 'string' || !mongoose.Types.ObjectId.isValid(item.productId)) {
        addError(errors, `items.${index}.productId`, 'A valid product ID is required');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1_000_000) {
        addError(errors, `items.${index}.quantity`, 'Quantity must be a positive whole number');
      }
    });
  }

  if (!['UPI', 'Cash'].includes(value.paymentMethod)) {
    addError(errors, 'paymentMethod', 'Payment method must be UPI or Cash');
  }
  return { value, errors };
};

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export {
  validateAuthInput,
  validateInventoryInput,
  validateObjectId,
  validateOrderInput,
  validateProductInput,
};
