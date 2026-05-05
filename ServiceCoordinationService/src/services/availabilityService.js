import ProviderAvailability from "../models/ProviderAvailability.js";
import { addHours, hasTimeOverlap } from "../utils/timeUtils.js";

export const createOrUpdateAvailability = async (data) => ProviderAvailability.findOneAndUpdate({ providerId: data.providerId }, data, { new: true, upsert: true, runValidators: true });
export const getAvailabilityByProvider = async (providerId) => ProviderAvailability.findOne({ providerId });
export const checkProviderAvailability = async ({ providerId, requestedStartTime, estimatedDurationHours }) => {
  const availability = await ProviderAvailability.findOne({ providerId });
  if (!availability) return { available: false, reason: "Provider availability profile not found" };
  const requestedEndTime = addHours(requestedStartTime, estimatedDurationHours);
  const unavailableConflict = availability.unavailableSlots.some((slot) => hasTimeOverlap(requestedStartTime, requestedEndTime, slot.startTime, slot.endTime));
  return { available: !unavailableConflict, requestedEndTime, reason: unavailableConflict ? "Requested slot overlaps with provider unavailable slot" : "Provider is available" };
};
