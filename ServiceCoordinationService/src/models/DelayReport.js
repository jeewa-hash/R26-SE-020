import mongoose from "mongoose";

const delayReportSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    providerId: {
      type: String,
      required: true
    },

    customerId: {
      type: String,
      required: true
    },

    delayType: {
      type: String,
      enum: ["start_delay", "execution_delay", "both"],
      required: true
    },

    scheduledStartTime: {
      type: Date
    },

    actualStartTime: {
      type: Date
    },

    scheduledEndTime: {
      type: Date
    },

    updatedExpectedEndTime: {
      type: Date
    },

    startDelayMinutes: {
      type: Number,
      default: 0
    },

    executionDelayMinutes: {
      type: Number,
      default: 0
    },

    totalDelayMinutes: {
      type: Number,
      default: 0
    },

    delayReason: {
      type: String
    },

    conflictDetected: {
      type: Boolean,
      default: false
    },

    reschedulingRequired: {
      type: Boolean,
      default: false
    },

    affectedBookings: [
      {
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking"
        },
        customerId: String,
        scheduledStartTime: Date,
        scheduledEndTime: Date,
        serviceCategory: String,
        serviceSubCategory: String
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("DelayReport", delayReportSchema);