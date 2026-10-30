import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(' ') || [];

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication is required'));
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'inventory_secret_key_2026');
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired authentication token'));
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Administrator access is required'));
  }

  return next();
};

export { authenticate, requireAdmin };
