import mongoose from "mongoose";

const suggestedSlotSchema = new mongoose.Schema(
  {
    date: {
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

    score: {
      type: Number,
      default: 0,
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      default: "UNKNOWN",
    },

    reason: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const rescheduleRequestSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

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

    // Stores whether provider, seeker, or system requested the reschedule
    requestedByType: {
      type: String,
      enum: ["PROVIDER", "SEEKER", "SYSTEM"],
      required: true,
    },

    // Stores the actual providerId or seekerId who requested the reschedule
    requestedById: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    reason: {
      type: String,
      required: true,
    },

    // Schedule before the reschedule request was accepted
    currentSchedule: {
      date: {
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
    },

    suggestedSlots: [suggestedSlotSchema],

    // Slot selected by seeker/provider after accepting the reschedule
    selectedSlot: {
      date: {
        type: String,
        default: "",
      },
      startTime: {
        type: String,
        default: "",
      },
      endTime: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("RescheduleRequest", rescheduleRequestSchema);