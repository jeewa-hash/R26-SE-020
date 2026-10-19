import axios from "axios";

const coordinationBaseUrl = () =>
  (process.env.SERVICE_COORDINATION_URL || "http://localhost:5010").replace(/\/+$/, "");

export const getSeekerBookingHistory = async (req, res) => {
  try {
    const response = await axios.get(
      `${coordinationBaseUrl()}/bookings/seeker/me`,
      {
        headers: { Authorization: req.headers.authorization },
        timeout: 15000,
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    return res
      .status(error.response?.status || 502)
      .json(error.response?.data || {
        success: false,
        message: "Unable to load booking history from the coordination service.",
      });
  }
};