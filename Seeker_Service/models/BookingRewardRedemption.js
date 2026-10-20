import mongoose from 'mongoose';

// One immutable payment allocation per completed booking, including zero-point plans.
const schema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  seekerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  agreedAmount: { type: Number, required: true, min: 0 },
  pointsRedeemed: { type: Number, required: true, min: 0 },
  customerAmountDue: { type: Number, required: true, min: 0 },
  platformAmountOwed: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR' },
}, { timestamps: true });
export default mongoose.model('BookingRewardRedemption', schema);
