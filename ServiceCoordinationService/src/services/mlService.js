import axios from "axios";

const ML_API_URL = "http://127.0.0.1:8000/predict-risk";

export const predictDelayRisk = async (payload) => {
  try {
    const response = await axios.post(ML_API_URL, payload);

    return response.data;
  } catch (error) {
    console.error("ML Service Error:", error.message);

    // fallback to rule-based if ML fails
    return null;
  }
};