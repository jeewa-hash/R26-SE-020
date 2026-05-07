import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
    },

    // External Seeker ID from Auth Service
    customerId: {
      type: String,
      required: true,
    },

    // External Provider ID from Auth/Admin Service
    providerId: {
      type: String,
      required: true,
    },

    customerSnapshot: {
      name: String,
      email: String,
      district: String,
      telephone: String,
    },

    providerSnapshot: {
      name: String,
      email: String,
      category: String,
      district: String,
      telephone: String,
    },

    serviceCategory: {
      type: String,
      required: true,
    },

    serviceSubCategory: {
      type: String,
      required: true,
    },

    taskComplexity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    scheduledStartTime: {
      type: Date,
      required: true,
    },

    scheduledEndTime: {
      type: Date,
      required: true,
    },

    estimatedDurationHours: {
      type: Number,
      required: true,
    },

    predictedActualDurationHours: {
      type: Number,
      required: true,
    },

    predictedDelayRiskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    delayRiskProbability: {
      High: Number,
      Medium: Number,
      Low: Number,
    },

    actualStartTime: {
      type: Date,
    },

    actualEndTime: {
      type: Date,
    },

    delayStatus: {
      type: String,
      enum: ["not_delayed", "delayed"],
      default: "not_delayed",
    },

    conflictStatus: {
      type: String,
      enum: ["none", "conflict_detected", "affected"],
      default: "none",
    },

    reschedulingRequired: {
      type: Boolean,
      default: false,
    },

    bookingStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "started",
        "delayed",
        "rescheduling_required",
        "rescheduled",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    agreedPrice: {
      type: Number,
    },

    address: {
      type: String,
    },

    district: {
      type: String,
    },

    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);