// models/RewardAccount.js
import mongoose from "mongoose";

const rewardAccountSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming you have a User model
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional: expiry handling
    pointsExpireAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("RewardAccount", rewardAccountSchema);