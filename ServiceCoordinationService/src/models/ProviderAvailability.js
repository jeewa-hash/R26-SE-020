import mongoose from "mongoose";

const unavailableSlotSchema = new mongoose.Schema(
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
    reason: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const providerAvailabilitySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },

    availableDays: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],

    workingHours: {
      start: {
        type: String,
        required: true,
        default: "08:00",
      },
      end: {
        type: String,
        required: true,
        default: "18:00",
      },
    },

    unavailableSlots: [unavailableSlotSchema],

    maxBookingsPerDay: {
      type: Number,
      default: 3,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProviderAvailability", providerAvailabilitySchema);