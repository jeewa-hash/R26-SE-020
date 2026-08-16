import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function predictCoordinationRisk(payload) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict-risk`,
      payload,
      {
        timeout: 5000,
      }
    );

    return {
      riskLevel: response.data.riskLevel,
      riskScore: response.data.riskScore,
      rescheduleRequired: response.data.rescheduleRequired,
      recommendation: response.data.recommendation,
      classProbabilities: response.data.classProbabilities || {},
      reasons: response.data.reasons || [],
      source: response.data.source || "ML_SERVICE",
    };
  } catch (error) {
    console.error(
      "ML risk service failed:",
      error.response?.data || error.message
    );

    return {
      riskLevel: "UNKNOWN",
      riskScore: 0,
      rescheduleRequired: false,
      recommendation: "ML service unavailable. Rule-based validation was used.",
      classProbabilities: {},
      reasons: [],
      source: "ML_FAILED",
    };
  }
}