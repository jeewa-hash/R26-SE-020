import mongoose from "mongoose";

const bidScheduleEvaluationSchema = new mongoose.Schema(
  {
    bidCoordinationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: links schedule evaluation to BidCoordination

    proposedStartTime: {
      type: Date,
      required: true,
    }, // Chaw: provider proposed start time

    preferredStartTime: {
      type: Date,
      default: null,
    }, // Chaw: seeker preferred start time

    preferredEndTime: {
      type: Date,
      default: null,
    }, // Chaw: seeker preferred end time

    preferredTimeMatch: {
      type: String,
      enum: [
        "MATCHES_PREFERENCE",
        "OUTSIDE_PREFERENCE",
        "NO_PREFERENCE_PROVIDED",
      ],
      default: "NO_PREFERENCE_PROVIDED",
    }, // Chaw: checks whether provider time fits seeker preference

    providerEstimatedDurationHours: {
      type: Number,
      required: true,
      min: 0.25,
    }, // Chaw: provider estimated duration

    seekerEstimatedDurationHours: {
      type: Number,
      default: null,
    }, // Chaw: optional seeker estimated duration

    mlPredictedDurationHours: {
      type: Number,
      default: null,
    }, // Chaw: ML predicted duration later

    finalSchedulingDurationHours: {
      type: Number,
      required: true,
      min: 0.25,
    }, // Chaw: duration used for schedule validation

    bufferMinutes: {
      type: Number,
      default: 30,
      min: 0,
    }, // Chaw: safety buffer after work duration

    requiredWindowStart: {
      type: Date,
      required: true,
    }, // Chaw: calculated work window start

    requiredWindowEnd: {
      type: Date,
      required: true,
    }, // Chaw: calculated work window end

    conflictDetected: {
      type: Boolean,
      default: false,
    }, // Chaw: true when there is availability/booking conflict

    conflictReason: {
      type: String,
      default: "",
      trim: true,
    }, // Chaw: simple explanation for conflict
    distanceFromPreviousBookingKm: { type: Number, default: 0 },
    estimatedTravelTimeMins: { type: Number, default: 0 },
    gapFromPreviousBookingMins: { type: Number, default: null },
    travelInfoSource: { type: String, default: "NO_COORDINATES" },
    availabilityMessage: { type: String, default: "" },

    delayRiskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "NOT_CHECKED"],
      default: "NOT_CHECKED",
    }, // Chaw: ML delay risk later
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "BidScheduleEvaluation",
  bidScheduleEvaluationSchema
);
