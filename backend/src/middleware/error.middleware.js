import { ApiError } from '../utils/ApiError.js';

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with the supplied unique value already exists',
    });
  }

  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Request body contains invalid JSON',
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large',
    });
  }

  console.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
};

export { errorHandler };
