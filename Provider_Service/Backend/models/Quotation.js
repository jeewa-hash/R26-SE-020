import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema(
  {
    providerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderRequest",
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null, // Set to optional if direct requests don't rely on a post
      index: true,
    },
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    durationText: {
      type: String,
      default: "1 day",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["SENT", "ACCEPTED", "REJECTED"],
      default: "SENT",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Quotation", quotationSchema);