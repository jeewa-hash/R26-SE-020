import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    // A feedback entry is tied to one completed booking.  This is what
    // prevents a seeker from reviewing a provider without receiving service.
    bookingId: { type: String, required: true },
    serviceId: { type: String, required: true },
    providerId: { type: String, required: true, index: true },
    userId: { type: String },

    rating: { type: Number, required: true, min: 1, max: 5 },

    reviewText: { type: String, required: true },

    recommendation: { type: Boolean, default: null },

    isAnonymous: { type: Boolean, default: false },

    images: { type: [String], default: [] }
  },
  { timestamps: true }
);

// Keep legacy feedback documents (which have no bookingId) from blocking the
// one-feedback-per-booking uniqueness rule.
feedbackSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $exists: true } } }
);

export default mongoose.model("Feedback", feedbackSchema);
