import { getRequestQuotationById } from "../clients/seekerServiceClient.js";
import { getProviderQuotationById } from "../clients/providerServiceClient.js";

export const testBidInputFetch = async (req, res) => {
  try {
    const { externalRequestQuotationId, externalQuotationId } = req.body;

    if (!externalRequestQuotationId || !externalQuotationId) {
      return res.status(400).json({
        success: false,
        message:
          "externalRequestQuotationId and externalQuotationId are required",
      });
    }

    const requestQuotation = await getRequestQuotationById(
      externalRequestQuotationId
    );

    const providerQuotation = await getProviderQuotationById(
      externalQuotationId
    );

    return res.status(200).json({
      success: true,
      message: "Successfully fetched bid input data",
      data: {
        requestQuotation,
        providerQuotation,
      },
    });
  } catch (error) {
    console.error("TEST BID INPUT FETCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bid input data",
      error: error.message,
    });
  }
};