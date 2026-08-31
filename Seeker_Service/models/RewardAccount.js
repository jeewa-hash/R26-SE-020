import mongoose from "mongoose";

const rewardAccountSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    lifetimeEarned: { type: Number, default: 0, min: 0 },
    lifetimeSpent: { type: Number, default: 0, min: 0 },
    pointsExpireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("RewardAccount", rewardAccountSchema);