import mongoose from "mongoose";

const suggestedSlotSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    label: { type: String },
  },
  { _id: false }
);

const bidCoordinationSchema = new mongoose.Schema(
  {
    serviceRequestId: { type: String, required: true },
    externalPostId: { type: String, required: true },
    seekerId: { type: String, required: true },
    providerId: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    serviceSubCategory: { type: String, required: true },
    description: { type: String },
    offeredPrice: { type: Number, required: true },
    proposedStartTime: { type: Date, required: true },
    estimatedDurationHours: { type: Number, required: true },
    bufferMinutes: { type: Number, default: 30 },
    predictedActualDurationHours: { type: Number, required: true },
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
    requiredWindowStart: { type: Date, required: true },
    requiredWindowEnd: { type: Date, required: true },
    conflictDetected: { type: Boolean, default: false },
    decision: {
      type: String,
      enum: [
        "CAN_ACCEPT",
        "AVAILABLE_WITH_CAUTION",
        "RESCHEDULE_REQUIRED",
        "REJECTED_DUE_TO_CONFLICT",
      ],
      required: true,
    },
    recommendedAction: { type: String },
    suggestedSlots: [suggestedSlotSchema],
    status: {
      type: String,
      enum: ["CHECKED", "ACCEPTED", "REJECTED", "BOOKING_CREATED"],
      default: "CHECKED",
    },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true }
);

export default mongoose.model("BidCoordination", bidCoordinationSchema);
