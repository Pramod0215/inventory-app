import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

const createAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Store Admin' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before creating an admin');
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_app';
  await mongoose.connect(uri);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    await existingUser.save();
    console.info(`Administrator access granted to ${email}`);
    return;
  }

  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });
  console.info(`Administrator account created for ${email}`);
};

try {
  await createAdmin();
} catch (error) {
  console.error('Unable to create administrator account:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
