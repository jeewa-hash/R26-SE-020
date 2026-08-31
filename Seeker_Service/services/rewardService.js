import RewardAccount from "../models/RewardAccount.js";
import RewardTransaction from "../models/RewardTransaction.js";
import mongoose from "mongoose";

const POINTS_PER_UNIT = 10; // 10 points per currency unit (configurable)

export async function awardPointsForBooking({ bookingId, seekerId, finalAmount, bookingStatus }) {
  if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(seekerId)) {
    throw new Error("Invalid booking or seeker ID");
  }
  if (bookingStatus !== "COMPLETED") {
    throw new Error("Points can only be awarded for completed bookings");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Idempotency: check if already awarded
    const existing = await RewardTransaction.findOne({
      referenceId: bookingId,
      referenceModel: "Booking",
      type: "EARN",
    }).session(session);
    if (existing) {
      await session.commitTransaction();
      return { success: false, message: "Points already awarded" };
    }

    const pointsEarned = Math.round(Number(finalAmount) * POINTS_PER_UNIT);
    if (!Number.isFinite(pointsEarned) || pointsEarned <= 0) {
      throw new Error("Booking amount must be greater than zero");
    }

    // Update or create reward account
    let account = await RewardAccount.findOne({ seekerId }).session(session);
    if (!account) {
      account = new RewardAccount({ seekerId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    }

    account.balance += pointsEarned;
    account.lifetimeEarned += pointsEarned;
    await account.save({ session });

    // Record transaction
    const transaction = new RewardTransaction({
      seekerId,
      amount: pointsEarned,
      type: "EARN",
      description: `Points earned for booking ${bookingId}`,
      referenceId: bookingId,
      referenceModel: "Booking",
      metadata: { finalAmount: Number(finalAmount) },
    });
    await transaction.save({ session });

    await session.commitTransaction();
    return { success: true, pointsEarned, newBalance: account.balance };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}