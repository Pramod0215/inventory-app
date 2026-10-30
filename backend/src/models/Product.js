import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
      match: [/^[A-Z0-9][A-Z0-9_-]*$/, 'SKU may contain only letters, numbers, hyphens, and underscores'],
    },
    brand: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    category: { type: String, required: true, enum: ['construction', 'hardware'] },
    quantity: { type: Number, required: true, min: 0, max: 1_000_000, default: 0, validate: Number.isSafeInteger },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000_000,
      validate: (value) => Number(value.toFixed(2)) === value,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
      validate: (value) => Number(value.toFixed(1)) === value,
    },
    image: { type: String, default: '', maxlength: 2048 },
    description: { type: String, default: '', maxlength: 2000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
