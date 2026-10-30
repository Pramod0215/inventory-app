import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateAuthInput } from '../utils/validation.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET || 'inventory_secret_key_2026',
    {
      expiresIn: '7d',
    }
  );
};

const registerUser = asyncHandler(async (req, res) => {
  const { value, errors } = validateAuthInput(req.body, { registration: true });
  if (errors.length) throw new ApiError(400, 'Please correct the registration details', errors);
  const { name, email, password } = value;

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new ApiError(409, 'User already exists');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'user',
  });

  const token = generateToken(user);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      'User registered successfully'
    )
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { value, errors } = validateAuthInput(req.body);
  if (errors.length) throw new ApiError(400, 'Please provide valid login details', errors);
  const { email, password } = value;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      'Login successful'
    )
  );
});

export { registerUser, loginUser };
