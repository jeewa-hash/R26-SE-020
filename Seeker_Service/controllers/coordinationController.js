import axios from "axios";

const coordinationBaseUrl = () => {
  const configuredUrl = process.env.SERVICE_COORDINATION_URL?.trim();
  const isProduction =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  const isProductionLocalhost =
    isProduction &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredUrl || "");
  const baseUrl =
    configuredUrl && !isProductionLocalhost
      ? configuredUrl
      : "http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com";

  return baseUrl.replace(/\/+$/, "");
};

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