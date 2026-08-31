import mongoose from "mongoose";

const bidCoordinationSchema = new mongoose.Schema(
  {
    externalSessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    }, // Chaw: links coordinated bid to Member 2 ServiceSession

    externalRequestQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: RequestQuotation ID from Seeker Service

    externalQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    }, // Chaw: Provider Quotation ID from Provider Service

    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: copied for local filtering

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: copied for local filtering

    serviceLocation: { type: String, default: "" },
    serviceLatitude: { type: Number, default: null },
    serviceLongitude: { type: Number, default: null },
    location: {
      address: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    finalDecision: {
      type: String,
      enum: [
        "CAN_ACCEPT",
        "AVAILABLE_WITH_CAUTION",
        "RESCHEDULE_REQUIRED",
        "REJECTED_DUE_TO_CONFLICT",
      ],
      required: true,
      index: true,
    }, // Chaw: final coordination decision

    recommendedAction: {
      type: String,
      default: "",
      trim: true,
    }, // Chaw: simple explanation for frontend

    status: {
      type: String,
      enum: ["ready_for_seeker_review", "accepted", "rejected", "expired"],
      default: "ready_for_seeker_review",
      index: true,
    }, // Chaw: lifecycle status of coordinated bid
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BidCoordination", bidCoordinationSchema);
