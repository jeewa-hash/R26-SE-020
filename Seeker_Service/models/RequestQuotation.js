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

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const RequestQuotation = mongoose.model(
  "RequestQuotation",
  requestQuotationSchema
);

export default RequestQuotation;