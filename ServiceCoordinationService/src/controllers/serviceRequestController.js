import ServiceRequest from "../models/ServiceRequest.js";
import { estimateDuration } from "../services/durationEstimationService.js";
import { predictDurationFromML, predictDelayRiskFromML } from "../services/mlPredictionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";

export const createServiceRequest = asyncHandler(async (req, res) => {
  const payload = req.body;
  const ruleBasedDuration = estimateDuration({ serviceCategory: payload.serviceCategory, taskComplexity: payload.taskComplexity });
  const estimatedDurationHours = payload.estimatedDurationHours || ruleBasedDuration.estimatedDurationHours;
  const durationPayload = {
    service_category: payload.serviceCategory,
    service_subcategory: payload.serviceSubCategory,
    task_complexity: payload.taskComplexity || "Medium",
    weather_affected: payload.weatherAffected || "No",
    provider_schedule_density: payload.providerScheduleDensity || "Medium",
    distance_km: payload.distanceKm || 5,
    estimated_travel_time_mins: payload.estimatedTravelTimeMins || 20,
    estimated_duration_hours: estimatedDurationHours
  };
  const durationPrediction = await predictDurationFromML(durationPayload);
  const delayRiskPayload = { ...durationPayload, gap_before_next_booking_mins: payload.gapBeforeNextBookingMins || 60, start_delay_mins: payload.startDelayMins || 0 };
  const delayRiskPrediction = await predictDelayRiskFromML(delayRiskPayload);
  const serviceRequest = await ServiceRequest.create({
    customerId: payload.customerId,
    serviceCategory: payload.serviceCategory,
    serviceSubCategory: payload.serviceSubCategory,
    description: payload.description,
    district: payload.district,
    address: payload.address,
    preferredStartTime: payload.preferredStartTime,
    estimatedDurationHours,
    predictedActualDurationHours: durationPrediction.predicted_actual_duration_hours,
    predictedDelayRiskLevel: delayRiskPrediction.predicted_delay_risk_level,
    delayRiskProbability: delayRiskPrediction.probability,
    taskComplexity: payload.taskComplexity || "Medium",
    locationFeatures: {
      distanceKm: payload.distanceKm || 5,
      estimatedTravelTimeMins: payload.estimatedTravelTimeMins || 20,
      weatherAffected: payload.weatherAffected || "No",
      providerScheduleDensity: payload.providerScheduleDensity || "Medium",
      gapBeforeNextBookingMins: payload.gapBeforeNextBookingMins || 60,
      startDelayMins: payload.startDelayMins || 0
    },
    status: "pending"
  });
  sendSuccess(res, { serviceRequest, predictions: { duration: durationPrediction, delayRisk: delayRiskPrediction } }, "Service request created with ML predictions", 201);
});

export const getServiceRequests = asyncHandler(async (req, res) => {
  const data = await ServiceRequest.find().sort({ createdAt: -1 });
  sendSuccess(res, data);
});

export const getServiceRequestById = asyncHandler(async (req, res) => {
  const data = await ServiceRequest.findById(req.params.id);
  if (!data) { res.status(404); throw new Error("Service request not found"); }
  sendSuccess(res, data);
});
