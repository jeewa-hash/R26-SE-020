import mongoose from "mongoose";

const suggestedSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    label: {
      type: String
    }
  },
  { _id: false }
);

const rescheduleSuggestionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    affectedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },

    providerId: {
      type: String,
      required: true
    },

    customerId: {
      type: String,
      required: true
    },

    originalStartTime: {
      type: Date,
      required: true
    },

    originalEndTime: {
      type: Date,
      required: true
    },

    requiredDurationHours: {
      type: Number,
      required: true
    },

    suggestedSlots: [suggestedSlotSchema],

    selectedSlot: suggestedSlotSchema,

    customerResponse: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending"
    },

    reason: {
      type: String,
      default: "Schedule conflict detected"
    }
  },
  { timestamps: true }
);

export default mongoose.model("RescheduleSuggestion", rescheduleSuggestionSchema);