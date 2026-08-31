import mongoose from "mongoose";

const rewardTransactionSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true }, // positive = earn, negative = spend
    type: { type: String, enum: ["EARN", "SPEND", "ADJUST"], required: true },
    description: { type: String, default: "" },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    referenceModel: { type: String, enum: ["Booking", "RewardRedemption", "Admin"], default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

rewardTransactionSchema.index({ seekerId: 1, createdAt: -1 });

export default mongoose.model("RewardTransaction", rewardTransactionSchema);