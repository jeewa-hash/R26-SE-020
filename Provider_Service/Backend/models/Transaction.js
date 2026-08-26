import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    adPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdPost",
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    boostAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number, // In LKR
      required: true,
    },
    currency: {
      type: String,
      default: "lkr",
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);