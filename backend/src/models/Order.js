import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, minlength: 2, maxlength: 120 },
    brand: { type: String, required: true, minlength: 2, maxlength: 80 },
    sku: { type: String, required: true, maxlength: 64 },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000_000,
      validate: (value) => Number(value.toFixed(2)) === value,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 1_000_000,
      validate: Number.isSafeInteger,
    },
    amount: { type: Number, required: true, min: 0, max: 1_000_000_000_000_000 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, maxlength: 64 },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, minlength: 2, maxlength: 80 },
    paymentMethod: { type: String, enum: ['UPI', 'Cash'], required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        { validator: (items) => items.length > 0, message: 'An order must contain at least one item' },
        { validator: (items) => items.length <= 50, message: 'An order cannot contain more than 50 items' },
      ],
    },
    total: { type: Number, required: true, min: 0, max: 1_000_000_000_000_000 },
    status: { type: String, enum: ['placed', 'cancelled'], default: 'placed' },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
