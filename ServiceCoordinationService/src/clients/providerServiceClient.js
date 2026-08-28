import axios from "axios";

const PROVIDER_SERVICE_BASE_URL =
  process.env.PROVIDER_SERVICE_BASE_URL || "http://localhost:3002"; // Chaw - Added Provider Service base URL for quotation lookup

export const getProviderQuotationById = async (quotationId) => {
  try {
    const response = await axios.get(
      `${PROVIDER_SERVICE_BASE_URL}/api/provider/quotations/${quotationId}` // Chaw - Fetch Provider Quotation by ID
    );

    return response.data?.data || response.data?.quotation || response.data; // Chaw - Support current provider response shape
  } catch (error) {
    console.error(
      "PROVIDER SERVICE QUOTATION ERROR:",
      error.response?.data || error.message
    ); // Chaw - Log external service failure for debugging

    throw new Error("Unable to fetch provider quotation from Provider Service"); // Chaw - Return clean error to coordination controller
  }
};

export const updateProviderQuotationCoordination = async (
  quotationId,
  coordinationStatus,
  coordinationId,
  coordinatedStartTime = null,
  coordinatedEndTime = null,
  quotationStatus = null
) => {
  try {
    const response = await axios.patch(
      `${PROVIDER_SERVICE_BASE_URL}/api/provider/quotations/${quotationId}/coordination`,
      {
        coordinationStatus,
        coordinationId,
        coordinatedStartTime,
        coordinatedEndTime,
        quotationStatus,
      } // Chaw: optionally update quotation status to ACCEPTED after booking creation
    );

    return response.data?.data || response.data?.quotation || response.data;
  } catch (error) {
    console.error(
      "PROVIDER SERVICE COORDINATION UPDATE ERROR:",
      error.response?.data || error.message
    );

    throw new Error("Unable to update provider quotation coordination status");
  }
};