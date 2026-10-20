import mongoose from 'mongoose';
import BookingRewardRedemption from '../models/BookingRewardRedemption.js';
import RewardAccount from '../models/RewardAccount.js';
import RewardTransaction from '../models/RewardTransaction.js';

export function paymentAllocation(finalAmount, points) {
  if (typeof finalAmount !== 'number' || !Number.isFinite(finalAmount) || !Number.isSafeInteger(Math.round(finalAmount * 100)) || finalAmount < 0 || Math.abs(finalAmount * 100 - Math.round(finalAmount * 100)) > 0.00001) {
    throw new Error('Invalid service amount');
  }
  if (!Number.isSafeInteger(points) || points < 0 || points > Math.floor(finalAmount)) {
    throw new Error('Use whole points within the service amount');
  }
  return { agreedAmount: finalAmount, pointsRedeemed: points, customerAmountDue: Math.round((finalAmount - points) * 100) / 100, platformAmountOwed: points, currency: 'LKR' };
}

export async function redeemBookingPoints({ bookingId, seekerId, providerId, finalAmount, points, bookingStatus, currency }) {
  if (![bookingId, seekerId, providerId].every(id => mongoose.isValidObjectId(id))) throw new Error('Invalid booking owner');
  if (bookingStatus !== 'COMPLETED' || currency !== 'LKR') throw new Error('Only completed LKR services can redeem points');
  const allocation = paymentAllocation(finalAmount, points);
  // Ensure the unique booking index exists before accepting concurrent requests.
  await BookingRewardRedemption.init();
  const session = await mongoose.startSession();
  let receipt;
  try {
    // withTransaction retries write conflicts (e.g. simultaneous redemptions from one balance).
    await session.withTransaction(async () => {
      const existing = await BookingRewardRedemption.findOne({ bookingId }).session(session);
      if (existing) {
        if (String(existing.seekerId) !== String(seekerId) || String(existing.providerId) !== String(providerId) || existing.agreedAmount !== finalAmount) throw new Error('Payment allocation does not match this service');
        receipt = existing;
        return;
      }
      if (points > 0) {
        const account = await RewardAccount.findOneAndUpdate({ seekerId, balance: { $gte: points } }, {
          $inc: { balance: -points, lifetimeSpent: points },
        }, { new: true, session });
        if (!account) throw new Error('Insufficient Star Points. Refresh your balance and choose fewer points.');
      }
      [receipt] = await BookingRewardRedemption.create([{ bookingId, seekerId, providerId, ...allocation }], { session });
      if (points > 0) await RewardTransaction.create([{
        seekerId, amount: -points, type: 'SPEND', referenceId: bookingId, referenceModel: 'Booking',
        description: `Used ${points} Star Points towards a completed service`,
        metadata: { redemptionId: String(receipt._id), pointValueLkr: 1, ...allocation },
      }], { session });
    });
    return receipt;
  } catch (error) {
    // A concurrent request can win the unique booking index. Return its committed receipt.
    if (error.code === 11000) {
      const existing = await BookingRewardRedemption.findOne({ bookingId, seekerId, providerId });
      if (existing && existing.agreedAmount === finalAmount) return existing;
    }
    throw error;
  } finally { await session.endSession(); }
}
