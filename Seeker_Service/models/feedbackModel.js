import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    serviceId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: String },

    rating: { type: Number, required: true, min: 1, max: 5 },

    reviewText: { type: String, required: true },

    recommendation: { type: Boolean, default: null },

    isAnonymous: { type: Boolean, default: false },

    images: { type: [String], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);