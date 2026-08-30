import mongoose from "mongoose";
import RequestQuotation from "../models/RequestQuotation.js";

export const createRequestQuotation = async (req, res) => {
  try {
    const {
      seekerId,
      providerId,
      sessionId,
      detectedCategory,
      detectedObject,
      modelConfidence,
      stepBreakdown,
      briefDescription,
      urgencyLevel,
      serviceLocation,
      preferredStartTime, // Chaw - Added seeker preferred start time
      preferredEndTime, // Chaw - Added seeker preferred end time/window
      preferredTimeLabel, // Chaw - Added readable preferred time label
      seekerEstimatedDurationHours, // Chaw - Added optional seeker duration estimate
      seekerBudgetAmount, // Chaw - Added optional seeker budget amount
    } = req.body;

    if (
      !seekerId ||
      !providerId ||
      !sessionId ||
      !detectedCategory ||
      !detectedObject
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(seekerId) ||
      !mongoose.Types.ObjectId.isValid(providerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker or provider ID",
      });
    }

    if (!Array.isArray(stepBreakdown)) {
      return res.status(400).json({
        success: false,
        message: "Step breakdown must be an array",
      });
    }

    if (preferredStartTime && Number.isNaN(new Date(preferredStartTime).getTime())) { // Chaw - Validate optional preferred start time if provided
      return res.status(400).json({
        success: false,
        message: "Invalid preferredStartTime",
      });
    }

    if (preferredEndTime && Number.isNaN(new Date(preferredEndTime).getTime())) { // Chaw - Validate optional preferred end time if provided
      return res.status(400).json({
        success: false,
        message: "Invalid preferredEndTime",
      });
    }

    if (
      preferredStartTime &&
      preferredEndTime &&
      new Date(preferredStartTime) >= new Date(preferredEndTime)
    ) { // Chaw - Ensure seeker preferred time window is valid
      return res.status(400).json({
        success: false,
        message: "preferredEndTime must be after preferredStartTime",
      });
    }

    if (
      seekerEstimatedDurationHours != null &&
      Number(seekerEstimatedDurationHours) <= 0
    ) { // Chaw - Validate optional seeker duration estimate
      return res.status(400).json({
        success: false,
        message: "seekerEstimatedDurationHours must be greater than 0",
      });
    }

    if (
      seekerBudgetAmount != null &&
      Number(seekerBudgetAmount) < 0
    ) { // Chaw - Validate optional seeker budget amount
      return res.status(400).json({
        success: false,
        message: "seekerBudgetAmount cannot be negative",
      });
    }

    const existingRequest = await RequestQuotation.findOne({
      seekerId,
      providerId,
      sessionId,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message:
          "A request has already been sent to this provider for this session",
        request: existingRequest,
      });
    }

    const request = await RequestQuotation.create({
      seekerId,
      providerId,
      sessionId,
      detectedCategory,
      detectedObject,
      modelConfidence,
      stepBreakdown,
      briefDescription,
      urgencyLevel,
      serviceLocation,
      preferredStartTime: preferredStartTime || null, // Chaw - Save seeker preferred start time if provided
      preferredEndTime: preferredEndTime || null, // Chaw - Save seeker preferred end time if provided
      preferredTimeLabel: preferredTimeLabel || "", // Chaw - Save readable preferred time label
      seekerEstimatedDurationHours: seekerEstimatedDurationHours ?? null, // Chaw - Save seeker duration estimate if provided
      seekerBudgetAmount: seekerBudgetAmount ?? null, // Chaw - Save seeker budget if provided
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Request quotation sent successfully",
      request,
    });
  } catch (error) {
    console.error("CREATE REQUEST QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSeekerRequests = async (req, res) => {
  try {
    const { seekerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    const requests = await RequestQuotation.find({
      seekerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET SEEKER REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getProviderRequests = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const requests = await RequestQuotation.find({
      providerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET PROVIDER REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSingleRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await RequestQuotation.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("GET SINGLE REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { providerId, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be confirmed or cancelled",
      });
    }

    const request = await RequestQuotation.findOne({
      _id: id,
      providerId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found or provider is not the selected provider",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    request.status = status;
    await request.save();

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request,
    });
  } catch (error) {
    console.error("UPDATE REQUEST STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const deleteRequestQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { seekerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "Seeker ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    const request = await RequestQuotation.findOne({
      _id: id,
      seekerId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found or seeker is not the owner",
      });
    }

    await RequestQuotation.deleteOne({
      _id: id,
      seekerId,
    });

    return res.status(200).json({
      success: true,
      message: "Request quotation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE REQUEST QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getProviderRequestsbyProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    const requests = await RequestQuotation.find({
      $or: [
        { providerId: providerId },
        { selectedProviderId: providerId },
        { assignedProviderId: providerId },

        // If your schema stores providers as arrays
        { providerIds: providerId },
        { selectedProviderIds: providerId },
        { assignedProviderIds: providerId },

        // If your schema stores provider objects
        { "provider.providerId": providerId },
        { "providers.providerId": providerId },
        { "selectedProviders.providerId": providerId },
        { "assignedProviders.providerId": providerId },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get provider requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider requests",
      error: error.message,
    });
  }
};