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