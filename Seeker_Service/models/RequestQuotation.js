import mongoose from "mongoose";

const stepBreakdownSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const requestQuotationSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      trim: true,
    },

    detectedCategory: {
      type: String,
      required: true,
      trim: true,
    },

    detectedObject: {
      type: String,
      required: true,
      trim: true,
    },

    modelConfidence: {
      type: String,
      default: null,
      trim: true,
    },

    stepBreakdown: {
      type: [stepBreakdownSchema],
      required: true,
      default: [],
    },

    briefDescription: {
      type: String,
      default: "",
      trim: true,
    },

    urgencyLevel: {
      type: String,
      default: "",
      trim: true,
    },

    serviceLocation: {
      type: String,
      default: "",
      trim: true,
    },
    serviceLatitude: { type: Number, default: null },
    serviceLongitude: { type: Number, default: null },
    location: {
      address: { type: String, default: "", trim: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    preferredStartTime: { // Chaw - Added seeker preferred start time for the job
      type: Date,
      default: null,
    },

    preferredEndTime: { // Chaw - Added seeker preferred end time/window for the job
      type: Date,
      default: null,
    },

    preferredTimeLabel: { // Chaw - Added readable time preference like "Tomorrow morning" or "Within 24 hours"
      type: String,
      default: "",
      trim: true,
    },

    seekerEstimatedDurationHours: { // Chaw - Added optional seeker-estimated duration for comparison with provider and ML estimates
      type: Number,
      default: null,
      min: 0.25,
    },

    seekerBudgetAmount: { // Chaw - Added optional seeker budget for guided bidding and price comparison
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "quoted", "accepted", "rejected", "cancelled", "expired"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

requestQuotationSchema.index(
  { seekerId: 1, providerId: 1, sessionId: 1 },
  { unique: true }
);

const RequestQuotation = mongoose.model(
  "RequestQuotation",
  requestQuotationSchema
);

export default RequestQuotation;
