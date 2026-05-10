import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
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

    providerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderRequest",
      required: true,
    },

    scheduledDate: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    estimatedDurationHours: {
      type: Number,
      required: true,
    },

    location: {
      address: {
        type: String,
        default: "",
      },
      district: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    distanceFromPreviousBookingKm: {
      type: Number,
      default: 0,
    },

    estimatedTravelTimeMins: {
      type: Number,
      default: 0,
    },

    gapFromPreviousBookingMins: {
      type: Number,
      default: null,
    },

    delayRiskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      default: "UNKNOWN",
    },

    delayRiskScore: {
      type: Number,
      default: 0,
    },

    delayInfo: {
      delayReason: {
        type: String,
        default: "",
      },
      additionalDelayMins: {
        type: Number,
        default: 0,
      },
      reportedBy: {
        type: String,
        enum: ["PROVIDER", "SEEKER", "SYSTEM", ""],
        default: "",
      },
      reportedAt: {
        type: Date,
        default: null,
      },
    },

    bookingStatus: {
      type: String,
      enum: [
        "CONFIRMED",
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULING_REQUIRED",
        "RESCHEDULED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "CONFIRMED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);