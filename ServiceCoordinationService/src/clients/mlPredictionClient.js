import axios from "axios";

const ML_SERVICE_BASE_URL =
  process.env.ML_SERVICE_URL ||
  process.env.ML_SERVICE_BASE_URL ||
  "http://localhost:8001";

/**
 * Final research ML contract: duration prediction only.
 * Delay/schedule feasibility is evaluated deterministically in the Coordination Service.
 */
export const predictDuration = async (payload) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_BASE_URL}/predict-duration`,
      payload,
      { timeout: Number(process.env.ML_SERVICE_TIMEOUT_MS || 5000) }
    );

    return response.data;
  } catch (error) {
    console.error(
      "ML DURATION PREDICTION ERROR:",
      error.response?.data || error.message
    );

    return null;
  }
};
