import mongoose from "mongoose";

const bidSuggestedSlotSchema = new mongoose.Schema(
  {
    bidCoordinationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: links suggested slot to BidCoordination

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: provider who can perform the work

    startTime: {
      type: Date,
      required: true,
    }, // Chaw: suggested slot start time

    endTime: {
      type: Date,
      required: true,
    }, // Chaw: suggested slot end time

    label: {
      type: String,
      default: "",
      trim: true,
    }, // Chaw: frontend-friendly label

    reason: {
      type: String,
      default: "",
      trim: true,
    }, // Chaw: explains why this slot was suggested

    status: {
      type: String,
      enum: ["AVAILABLE", "SELECTED", "EXPIRED"],
      default: "AVAILABLE",
      index: true,
    }, // Chaw: later seeker can select one slot
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BidSuggestedSlot", bidSuggestedSlotSchema);