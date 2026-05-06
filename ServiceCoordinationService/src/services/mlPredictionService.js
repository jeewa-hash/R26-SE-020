import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

const requiredDurationFields = [
  "service_category",
  "service_subcategory",
  "task_complexity",
  "weather_affected",
  "provider_schedule_density",
  "distance_km",
  "estimated_travel_time_mins",
  "estimated_duration_hours"
];

const requiredDelayRiskFields = [
  ...requiredDurationFields,
  "gap_before_next_booking_mins",
  "start_delay_mins"
];

const validatePayload = (payload, requiredFields) => {
  const missingFields = requiredFields.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === ""
  );

  if (missingFields.length > 0) {
    const error = new Error(`Missing required ML fields: ${missingFields.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
};

export const predictDurationFromML = async (payload) => {
  validatePayload(payload, requiredDurationFields);

  const mlPayload = {
    service_category: payload.service_category,
    service_subcategory: payload.service_subcategory,
    task_complexity: payload.task_complexity,
    weather_affected: payload.weather_affected,
    provider_schedule_density: payload.provider_schedule_density,
    distance_km: Number(payload.distance_km),
    estimated_travel_time_mins: Number(payload.estimated_travel_time_mins),
    estimated_duration_hours: Number(payload.estimated_duration_hours)
  };

  try {
    console.log("Calling:", `${ML_SERVICE_URL}/predict-duration`);
    console.log("ML duration payload:", mlPayload);

    const response = await axios.post(`${ML_SERVICE_URL}/predict-duration`, mlPayload);
    return response.data.data;
  } catch (error) {
    console.error("Duration ML prediction failed.");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error message:", error.message);
    }

    throw error;
  }
};

export const predictDelayRiskFromML = async (payload) => {
  validatePayload(payload, requiredDelayRiskFields);

  const mlPayload = {
    service_category: payload.service_category,
    service_subcategory: payload.service_subcategory,
    task_complexity: payload.task_complexity,
    weather_affected: payload.weather_affected,
    provider_schedule_density: payload.provider_schedule_density,
    distance_km: Number(payload.distance_km),
    estimated_travel_time_mins: Number(payload.estimated_travel_time_mins),
    estimated_duration_hours: Number(payload.estimated_duration_hours),
    gap_before_next_booking_mins: Number(payload.gap_before_next_booking_mins),
    start_delay_mins: Number(payload.start_delay_mins)
  };

  try {
    console.log("Calling:", `${ML_SERVICE_URL}/predict-delay-risk`);
    console.log("ML delay-risk payload:", mlPayload);

    const response = await axios.post(`${ML_SERVICE_URL}/predict-delay-risk`, mlPayload);
    return response.data.data;
  } catch (error) {
    console.error("Delay risk ML prediction failed.");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error message:", error.message);
    }

    throw error;
  }
};