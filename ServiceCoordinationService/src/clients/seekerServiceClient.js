import axios from "axios";

const SEEKER_SERVICE_BASE_URL =
  process.env.SEEKER_SERVICE_BASE_URL || "http://localhost:6000"; // Chaw - Added Seeker Service base URL for RequestQuotation lookup

export const getRequestQuotationById = async (requestQuotationId) => {
  try {
    const response = await axios.get(
      `${SEEKER_SERVICE_BASE_URL}/request-quotations/${requestQuotationId}` // Chaw - Fetch RequestQuotation from Seeker Service by ID
    );

    return response.data?.request || response.data?.data || response.data; // Chaw - Support different response shapes safely
  } catch (error) {
    console.error(
      "SEEKER SERVICE REQUEST QUOTATION ERROR:",
      error.response?.data || error.message
    ); // Chaw - Log external service failure for debugging

    throw new Error("Unable to fetch request quotation from Seeker Service"); // Chaw - Return clean error to coordination controller
  }
};