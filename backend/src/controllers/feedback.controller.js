import Feedback from '../models/Feedback.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createFeedback = asyncHandler(async (req, res) => {
  const { category, rating, message } = req.body || {};
  const errors = [];

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ApiError(400, 'Please correct the feedback details');
  }
  if (Object.keys(req.body).some((key) => !['category', 'rating', 'message'].includes(key))) {
    errors.push({ field: 'body', message: 'Unexpected feedback field' });
  }
  if (!['General', 'Products', 'Orders', 'Website'].includes(category)) {
    errors.push({ field: 'category', message: 'Choose a valid feedback category' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' });
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
    errors.push({ field: 'message', message: 'Feedback must be between 10 and 2000 characters' });
  }
  if (errors.length) throw new ApiError(400, 'Please correct the feedback details', errors);

  const feedback = await Feedback.create({
    userId: req.user.id,
    customerName: req.user.name || 'Customer',
    category,
    rating,
    message: message.trim(),
  });

  return res.status(201).json(new ApiResponse(201, {
    id: feedback.id,
    category: feedback.category,
    rating: feedback.rating,
    message: feedback.message,
    createdAt: feedback.createdAt,
  }, 'Feedback submitted successfully'));
});

export { createFeedback };
