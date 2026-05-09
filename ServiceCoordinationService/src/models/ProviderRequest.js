import mongoose from "mongoose";

const providerRequestSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    requestedDate: {
      type: String,
      required: true,
    },

    requestedStartTime: {
      type: String,
      required: true,
    },

    requestedEndTime: {
      type: String,
      default: null,
    },

    estimatedDurationHours: {
      type: Number,
      default: null,
    },

    validationStatus: {
      type: String,
      enum: ["PENDING", "VALIDATED", "WARNING", "CONFLICT", "HIGH_RISK"],
      default: "PENDING",
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      default: "UNKNOWN",
    },

    riskScore: {
      type: Number,
      default: 0,
    },

    requestStatus: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"],
      default: "PENDING",
    },

    validationMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProviderRequest", providerRequestSchema);