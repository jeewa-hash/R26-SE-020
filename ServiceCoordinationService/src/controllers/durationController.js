import { estimateServiceDuration } from "../services/durationEstimationService.js";

export const estimateDuration = async (req, res) => {
  try {
    const result = estimateServiceDuration(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to estimate service duration",
      error: error.message,
    });
  }
};