import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/utils/ApiError.js';
import { ApiResponse } from '../../src/utils/ApiResponse.js';
import { asyncHandler } from '../../src/utils/asyncHandler.js';

describe('ApiError', () => {
  it('stores the status and optional error details', () => {
    const error = new ApiError(422, 'Invalid input', ['email']);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Invalid input');
    expect(error.errors).toEqual(['email']);
  });
});

describe('ApiResponse', () => {
  it('sets success according to the response status', () => {
    expect(new ApiResponse(201, { id: '1' }, 'Created')).toEqual({
      statusCode: 201,
      data: { id: '1' },
      message: 'Created',
      success: true,
    });
    expect(new ApiResponse(404, null).success).toBe(false);
  });
});

describe('asyncHandler', () => {
  it('passes rejected handler promises to next', async () => {
    const error = new Error('request failed');
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
