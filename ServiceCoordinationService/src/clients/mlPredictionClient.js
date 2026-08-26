import axios from "axios";

const ML_SERVICE_BASE_URL =
  process.env.ML_SERVICE_BASE_URL || "http://localhost:8000"; // Chaw: separate FastAPI ML service URL

export const predictDelayRisk = async (payload) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_BASE_URL}/predict-risk`,
      payload
    ); // Chaw: current ML service exposes POST /predict-risk

    return response.data;
  } catch (error) {
    console.error(
      "ML DELAY RISK PREDICTION ERROR:",
      error.response?.data || error.message
    );

    return null; // Chaw: fallback safely if ML is unavailable
  }
};