import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, maxlength: 80 },
    category: {
      type: String,
      enum: ['General', 'Products', 'Orders', 'Website'],
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, required: true, minlength: 10, maxlength: 2000, trim: true },
  },
  { timestamps: true }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
