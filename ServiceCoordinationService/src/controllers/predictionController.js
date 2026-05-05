import { predictDurationFromML, predictDelayRiskFromML } from "../services/mlPredictionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";

export const predictDuration = asyncHandler(async (req, res) => {
  const result = await predictDurationFromML(req.body);
  sendSuccess(res, result, "Duration prediction completed");
});
export const predictDelayRisk = asyncHandler(async (req, res) => {
  const result = await predictDelayRiskFromML(req.body);
  sendSuccess(res, result, "Delay risk prediction completed");
});
