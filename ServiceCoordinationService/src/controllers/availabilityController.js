import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";
import { createOrUpdateAvailability, getAvailabilityByProvider, checkProviderAvailability } from "../services/availabilityService.js";

export const upsertAvailability = asyncHandler(async (req, res) => {
  const availability = await createOrUpdateAvailability(req.body);
  sendSuccess(res, availability, "Provider availability saved", 201);
});
export const getProviderAvailability = asyncHandler(async (req, res) => {
  const availability = await getAvailabilityByProvider(req.params.providerId);
  if (!availability) { res.status(404); throw new Error("Provider availability not found"); }
  sendSuccess(res, availability);
});
export const checkAvailability = asyncHandler(async (req, res) => {
  const result = await checkProviderAvailability(req.body);
  sendSuccess(res, result, "Availability checked");
});
