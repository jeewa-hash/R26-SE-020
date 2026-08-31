import axios from "axios";

const COORDINATION_SERVICE_URL =
  process.env.COORDINATION_SERVICE_URL ||
  process.env.SERVICE_COORDINATION_SERVICE_URL ||
  "http://localhost:5010";

/**
 * Fetch provider earnings and completed bookings for a given month or overall
 * @param {string} providerId
 * @param {string} [month] - Format "YYYY-MM" (e.g. "2026-08")
 * @returns {Promise<{ providerId: string, totalIncome: number, completedBookingsCount: number, bookings: Array }>}
 */
export const getProviderCompletedEarnings = async (providerId, month = null) => {
  try {
    const url = `${COORDINATION_SERVICE_URL}/bookings/provider/${providerId}/earnings`;
    const params = {};
    if (month) params.month = month;

    const response = await axios.get(url, { params, timeout: 8000 });

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }

    return {
      providerId,
      totalIncome: 0,
      completedBookingsCount: 0,
      bookings: [],
    };
  } catch (error) {
    console.error(
      "COORDINATION SERVICE EARNINGS FETCH ERROR:",
      error.response?.data || error.message
    );
    // If external service has network issue or provider has no bookings yet, return zero data safely
    return {
      providerId,
      totalIncome: 0,
      completedBookingsCount: 0,
      bookings: [],
      error: error.message,
    };
  }
};
