import mongoose from "mongoose";

export const BOOKING_STATUS_VALUES = [
  "CONFIRMED",
  "IN_PROGRESS",
  "DELAY_REPORTED",
  "RESCHEDULING_REQUIRED",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELLED",
];

const bookingSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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

    seekerSnapshot: {
      seekerId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
      district: {
        type: String,
        default: "",
      },
    },

    providerSnapshot: {
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      name: {
        type: String,
        default: "",
      },
      businessName: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
      district: {
        type: String,
        default: "",
      },
      profileImage: {
        type: String,
        default: "",
      },
    },

    providerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    bidCoordinationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    externalSessionId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    externalRequestQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    externalQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: { type: String, default: "LKR" },
    serviceCategory: { type: String, default: "" },
    serviceSubcategory: { type: String, default: "" },
    serviceLocation: { type: String, default: "" },

    scheduledStartTime: { type: Date, default: null, index: true },
    scheduledEndTime: { type: Date, default: null },
    displayStartTime: { type: String, default: "" },
    displayEndTime: { type: String, default: "" },
    scheduledDate: { type: String, default: "", index: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },

    initialSchedule: {
      date: { type: String, default: "" },
      startTime: { type: String, default: "" },
      endTime: { type: String, default: "" },
    },

    estimatedDurationHours: {
      type: Number,
      default: null,
    },
    mlPredictedDurationHours: { type: Number, default: null },

    reminderSentAt: { type: Date, default: null },
    providerReadyConfirmed: { type: Boolean, default: false },
    providerReadyConfirmedAt: { type: Date, default: null },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    startDelayMinutes: { type: Number, default: 0 },
    durationOverrunMinutes: { type: Number, default: null },
    conflictDetected: { type: Boolean, default: false },

    timeline: [
      {
        status: { type: String, default: "" },
        message: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],

    scheduleSource: {
      type: String,
      enum: ["PROVIDER_PROPOSED_TIME", "COORDINATED_SUGGESTED_SLOT"],
      default: "PROVIDER_PROPOSED_TIME",
    },

    location: {
      address: { type: String, default: "" },
      district: { type: String, default: "" },
      city: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    distanceFromPreviousBookingKm: { type: Number, default: 0 },
    estimatedTravelTimeMins: { type: Number, default: 0 },
    gapFromPreviousBookingMins: { type: Number, default: null },

    delayRiskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      default: "UNKNOWN",
    },

    delayRiskScore: { type: Number, default: 0 },

    delayInfo: {
      delayReason: { type: String, default: "" },
      additionalDelayMins: { type: Number, default: 0 },
      reportedBy: {
        type: String,
        enum: ["PROVIDER", "SEEKER", "SYSTEM", ""],
        default: "",
      },
      reportedAt: { type: Date, default: null },
      expectedEndTime: { type: Date, default: null },
      delayImpactStatus: {
        type: String,
        enum: ["NO_CONFLICT", "NEXT_BOOKING_AT_RISK", ""],
        default: "",
      },
      affectedNextBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },

    acceptedRescheduleRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RescheduleRequest",
      },
    ],

    // Single source of truth for booking lifecycle.
    // Admin Service also depends on this field, so do not rename/remove it.
    bookingStatus: {
      type: String,
      enum: BOOKING_STATUS_VALUES,
      default: "CONFIRMED",
      index: true,
    },

    cancellationInfo: {
      cancelledBy: {
        type: String,
        enum: ["PROVIDER", "SEEKER", "ADMIN", ""],
        default: "",
      },
      cancellationReason: { type: String, default: "" },
      cancelledAt: { type: Date, default: null },
      inquiryStatus: {
        type: String,
        enum: ["NOT_REQUIRED", "NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"],
        default: "NOT_REQUIRED",
      },
      inquiryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
