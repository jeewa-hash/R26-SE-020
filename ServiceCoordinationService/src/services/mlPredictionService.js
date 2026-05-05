import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";

export const predictDurationFromML = async (payload) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict-duration`, payload);
    return response.data.data;
  } catch (error) {
    console.error("Duration ML prediction failed:", error.message);
    return { predicted_actual_duration_hours: payload.estimated_duration_hours, fallback: true, message: "ML duration prediction failed. Used estimated duration as fallback." };
  }
};

export const predictDelayRiskFromML = async (payload) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict-delay-risk`, payload);
    return response.data.data;
  } catch (error) {
    console.error("Delay risk ML prediction failed:", error.message);
    return { predicted_delay_risk_level: "Medium", probability: null, fallback: true, message: "ML delay risk prediction failed. Used Medium risk as fallback." };
  }
};
