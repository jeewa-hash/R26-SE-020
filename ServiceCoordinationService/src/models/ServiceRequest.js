import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    // External Seeker ID from Auth Service
    customerId: {
      type: String,
      required: true,
    },

    // Optional Provider ID from Auth/Admin Service
    // At service request stage, provider may or may not be selected yet
    providerId: {
      type: String,
      required: false,
    },

    // Snapshot for frontend display without calling Auth service every time
    customerSnapshot: {
      name: String,
      email: String,
      district: String,
      telephone: String,
    },

    // Snapshot for frontend display without importing Provider model
    providerSnapshot: {
      name: String,
      email: String,
      category: String,
      district: String,
      telephone: String,
    },

    serviceCategory: {
      type: String,
      required: true,
    },

    serviceSubCategory: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    district: {
      type: String,
      required: true,
    },

    address: {
      type: String,
    },

    preferredStartTime: {
      type: Date,
      required: true,
    },

    taskComplexity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    estimatedDurationHours: {
      type: Number,
    },

    predictedActualDurationHours: {
      type: Number,
    },

    predictedDelayRiskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
    },

    delayRiskProbability: {
      High: Number,
      Medium: Number,
      Low: Number,
    },

    locationFeatures: {
      distanceKm: Number,
      estimatedTravelTimeMins: Number,
      weatherAffected: String,
      providerScheduleDensity: String,
      gapBeforeNextBookingMins: Number,
      startDelayMins: Number,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "provider_selected",
        "ai_checked",
        "agreement_pending",
        "confirmed",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceRequest", serviceRequestSchema);