// models/RewardRedemption.js
import mongoose from "mongoose";

const rewardRedemptionSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pointsSpent: {
      type: Number,
      required: true,
      min: 1,
    },
    rewardItem: {
      type: String,
      required: true,
    }, // e.g., "Gift Card", "Discount Voucher"
    rewardValue: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "FULFILLED"],
      default: "PENDING",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: Date,
    fulfilledAt: Date,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("RewardRedemption", rewardRedemptionSchema);