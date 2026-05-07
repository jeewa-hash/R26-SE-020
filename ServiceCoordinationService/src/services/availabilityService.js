import ProviderAvailability from "../models/ProviderAvailability.js";
import { addHours, hasTimeOverlap } from "../utils/timeUtils.js";

export const createOrUpdateAvailability = async (data) => {
  return ProviderAvailability.findOneAndUpdate(
    { providerId: data.providerId },
    {
      providerId: data.providerId,
      providerSnapshot: data.providerSnapshot,
      serviceCategories: data.serviceCategories,
      district: data.district,
      workingDays: data.workingDays,
      workingStartTime: data.workingStartTime || "08:00",
      workingEndTime: data.workingEndTime || "18:00",
      unavailableSlots: data.unavailableSlots || [],
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
};

export const getAvailabilityByProvider = async (providerId) => {
  return ProviderAvailability.findOne({ providerId });
};

export const checkProviderAvailability = async ({
  providerId,
  requestedStartTime,
  estimatedDurationHours,
}) => {
  const availability = await ProviderAvailability.findOne({ providerId });

  if (!availability) {
    return {
      available: false,
      reason: "Provider availability profile not found",
    };
  }

  const requestedEndTime = addHours(
    requestedStartTime,
    estimatedDurationHours
  );

  const unavailableConflict = availability.unavailableSlots.some((slot) =>
    hasTimeOverlap(
      requestedStartTime,
      requestedEndTime,
      slot.startTime,
      slot.endTime
    )
  );

  return {
    available: !unavailableConflict,
    requestedStartTime,
    requestedEndTime,
    reason: unavailableConflict
      ? "Requested slot overlaps with provider unavailable slot"
      : "Provider is available",
  };
};