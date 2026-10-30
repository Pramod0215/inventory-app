import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, requireAdmin } from '../../src/middleware/auth.middleware.js';
import { errorHandler } from '../../src/middleware/error.middleware.js';
import { ApiError } from '../../src/utils/ApiError.js';

const secret = 'unit-test-secret';

afterEach(() => {
  delete process.env.JWT_SECRET;
  vi.restoreAllMocks();
});

describe('authenticate', () => {
  it('rejects missing and malformed authorization headers', () => {
    const next = vi.fn();

    authenticate({ headers: {} }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });

    next.mockClear();
    authenticate({ headers: { authorization: 'Basic token' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  it('verifies a bearer token and attaches its claims', () => {
    process.env.JWT_SECRET = secret;
    const user = { id: 'user-1', role: 'user' };
    const req = { headers: { authorization: `Bearer ${jwt.sign(user, secret)}` } };
    const next = vi.fn();

    authenticate(req, {}, next);

    expect(req.user).toMatchObject(user);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an invalid bearer token', () => {
    const next = vi.fn();

    authenticate({ headers: { authorization: 'Bearer invalid' } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  it('rejects an expired bearer token', () => {
    process.env.JWT_SECRET = secret;
    const token = jwt.sign({ id: 'user-1' }, secret, { expiresIn: -1 });
    const next = vi.fn();

    authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    expect(next.mock.calls[0][0].message).toBe('Invalid or expired authentication token');
  });
});

describe('requireAdmin', () => {
  it('permits administrators and denies other users', () => {
    const next = vi.fn();

    requireAdmin({ user: { role: 'admin' } }, {}, next);
    expect(next).toHaveBeenLastCalledWith();

    requireAdmin({ user: { role: 'user' } }, {}, next);
    expect(next.mock.calls[1][0]).toMatchObject({ statusCode: 403 });
  });
});

describe('errorHandler', () => {
  const response = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  });

  it('serializes API, duplicate-key, and validation errors', () => {
    const apiResponse = response();
    errorHandler(new ApiError(409, 'Conflict', ['sku']), {}, apiResponse, vi.fn());
    expect(apiResponse.status).toHaveBeenCalledWith(409);
    expect(apiResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Conflict',
      errors: ['sku'],
    });

    const duplicateResponse = response();
    errorHandler({ code: 11000 }, {}, duplicateResponse, vi.fn());
    expect(duplicateResponse.status).toHaveBeenCalledWith(409);

    const validationResponse = response();
    errorHandler({ name: 'ValidationError', message: 'Invalid field' }, {}, validationResponse, vi.fn());
    expect(validationResponse.status).toHaveBeenCalledWith(400);
    expect(validationResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid field',
    });

    const castResponse = response();
    errorHandler({ name: 'CastError', message: 'Invalid identifier' }, {}, castResponse, vi.fn());
    expect(castResponse.status).toHaveBeenCalledWith(400);
    expect(castResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid identifier',
    });
  });

  it('logs unexpected errors and returns a generic server response', () => {
    const error = new Error('sensitive database detail');
    const apiResponse = response();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(error, {}, apiResponse, vi.fn());

    expect(log).toHaveBeenCalledWith('Unhandled error:', error);
    expect(apiResponse.status).toHaveBeenCalledWith(500);
    expect(apiResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error',
    });
  });
});
