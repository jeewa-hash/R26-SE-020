import mongoose from "mongoose";

const unavailableSlotSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  reason: { type: String, default: "Unavailable" }
}, { _id: false });

const providerAvailabilitySchema = new mongoose.Schema({
  providerId: { type: String, required: true, unique: true },
  serviceCategories: [{ type: String }],
  district: { type: String, required: true },
  workingDays: [{ type: String }],
  workingStartTime: { type: String, default: "08:00" },
  workingEndTime: { type: String, default: "18:00" },
  unavailableSlots: [unavailableSlotSchema]
}, { timestamps: true });

export default mongoose.model("ProviderAvailability", providerAvailabilitySchema);
