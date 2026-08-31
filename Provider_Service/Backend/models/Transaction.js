import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["boost", "commission_service_charge"],
      default: "boost",
      index: true,
    },
    adPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdPost",
      required: false,
      default: null,
    },
    billingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommissionBilling",
      required: false,
      default: null,
    },
    billingMonth: {
      type: String,
      default: null,
    },
    providerId: {
      type: String,
      required: true,
      index: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    boostAmount: {
      type: Number,
      required: false,
      default: 0,
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