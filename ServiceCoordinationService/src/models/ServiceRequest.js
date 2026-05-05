import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  serviceCategory: { type: String, required: true },
  serviceSubCategory: { type: String, required: true },
  description: { type: String, required: true },
  district: { type: String, required: true },
  address: { type: String },
  preferredStartTime: { type: Date, required: true },
  taskComplexity: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  estimatedDurationHours: { type: Number },
  predictedActualDurationHours: { type: Number },
  predictedDelayRiskLevel: { type: String, enum: ["Low", "Medium", "High"] },
  delayRiskProbability: { High: Number, Medium: Number, Low: Number },
  locationFeatures: {
    distanceKm: Number,
    estimatedTravelTimeMins: Number,
    weatherAffected: String,
    providerScheduleDensity: String,
    gapBeforeNextBookingMins: Number,
    startDelayMins: Number
  },
  status: { type: String, enum: ["pending", "provider_selected", "agreement_pending", "confirmed", "cancelled", "completed"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
