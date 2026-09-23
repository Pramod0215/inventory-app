import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_app';

  try {
    const connectionInstance = await mongoose.connect(mongoURI);
    console.log(`MongoDB connected successfully: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
