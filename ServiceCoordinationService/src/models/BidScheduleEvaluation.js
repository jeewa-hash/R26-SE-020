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

    // Legacy fields retained only so older records remain readable.
    providerEstimatedDurationHours: {
      type: Number,
      default: null,
      min: 0.25,
    },

    seekerEstimatedDurationHours: {
      type: Number,
      default: null,
    }, // Chaw: optional seeker estimated duration

    providerEstimatedDurationMins: { type: Number, default: null },
    predictedDurationMins: { type: Number, default: null },
    predictedDurationHours: { type: Number, default: null },
    mlPredictedDurationMins: { type: Number, default: null },
    mlPredictedDurationHours: { type: Number, default: null },
    durationPredictionSource: { type: String, default: "ML_MODEL" },
    durationModelVersion: { type: String, default: null },

    finalSchedulingDurationMins: { type: Number, default: null },
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
    routingTrafficAware: { type: Boolean, default: false },
    effectiveBufferMins: { type: Number, default: null },
    minimumBufferMins: { type: Number, default: 15 },
    travelFeasible: { type: Boolean, default: true },
    coordinationStatus: {
      type: String,
      enum: ["FEASIBLE", "CAUTION", "RESCHEDULE_REQUIRED"],
      default: "FEASIBLE",
    },
    coordinationReason: { type: String, default: "" },
    availabilityMessage: { type: String, default: "" },

    // Legacy field retained for backward compatibility only. Final design does
    // not use a delay-risk ML classifier.
    delayRiskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "NOT_CHECKED"],
      default: "NOT_CHECKED",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "BidScheduleEvaluation",
  bidScheduleEvaluationSchema
);
