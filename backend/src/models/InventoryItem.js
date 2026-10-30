import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 64,
      match: [/^[A-Z0-9][A-Z0-9_-]*$/, 'SKU may contain only letters, numbers, hyphens, and underscores'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
      max: 1_000_000,
      default: 0,
      validate: Number.isSafeInteger,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
      max: 1_000_000_000,
      validate: (value) => Number(value.toFixed(2)) === value,
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    supplier: {
      type: String,
      default: '',
      maxlength: 120,
    },
  },
  {
    timestamps: true,
  }
);

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

export default InventoryItem;
