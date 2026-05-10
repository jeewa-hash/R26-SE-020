import ProviderRequest from "../models/ProviderRequest.js";
import Booking from "../models/Booking.js";
import { addHoursToTime } from "../utils/timeUtils.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";
import { estimateServiceDuration } from "../services/durationEstimationService.js";

export const createProviderRequest = async (req, res) => {
  try {
    const {
      postId,
      seekerId,
      providerId,
      requestedDate,
      requestedStartTime,
      estimatedDurationHours,
      serviceCategory = "",
      serviceSubcategory = "",
      taskName = "",
      complexityLevel = "Medium",
      propertySize = "Medium",
      urgency = "medium",
    } = req.body;

    if (!postId || !seekerId || !providerId || !requestedDate || !requestedStartTime) {
      return res.status(400).json({
        success: false,
        message:
          "postId, seekerId, providerId, requestedDate and requestedStartTime are required",
      });
    }

    const existingRequest = await ProviderRequest.findOne({
      postId,
      providerId,
      requestStatus: { $in: ["PENDING", "ACCEPTED"] },
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "Provider has already requested this post",
      });
    }

    let finalEstimatedDurationHours = estimatedDurationHours;
    let durationResult = null;

    if (!finalEstimatedDurationHours) {
      durationResult = estimateServiceDuration({
        serviceCategory,
        serviceSubcategory,
        taskName,
        complexityLevel,
        propertySize,
        urgency,
      });

      finalEstimatedDurationHours = durationResult.averageDurationHours;
    }

    const requestedEndTime = addHoursToTime(
      requestedStartTime,
      finalEstimatedDurationHours
    );

    const scheduleValidation = await validateProviderSchedule({
      providerId,
      requestedDate,
      requestedStartTime,
      requestedEndTime,
    });

    const providerRequest = await ProviderRequest.create({
      postId,
      seekerId,
      providerId,

      serviceCategory,
      serviceSubcategory,
      taskName,
      complexityLevel,
      propertySize,

      requestedDate,
      requestedStartTime,
      requestedEndTime,

      estimatedDurationHours: finalEstimatedDurationHours,
      durationConfidence: durationResult?.confidence || "UNKNOWN",
      requiresMultipleDays: durationResult?.requiresMultipleDays || false,

      validationStatus: scheduleValidation.validationStatus,
      requestStatus: "PENDING",
      riskLevel: "UNKNOWN",
      riskScore: 0,
      validationMessage: scheduleValidation.message,
    });

    return res.status(201).json({
      success: true,
      message: "Provider request created successfully",
      data: providerRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create provider request",
      error: error.message,
    });
  }
};

export const getRequestsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const requests = await ProviderRequest.find({ postId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider requests",
      error: error.message,
    });
  }
};

export const getRequestsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const requests = await ProviderRequest.find({ providerId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider requests",
      error: error.message,
    });
  }
};

export const acceptProviderRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const providerRequest = await ProviderRequest.findById(requestId);

    if (!providerRequest) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    if (providerRequest.requestStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be accepted",
      });
    }

    const alreadyBooked = await Booking.findOne({
      postId: providerRequest.postId,
      bookingStatus: {
        $in: ["CONFIRMED", "IN_PROGRESS", "DELAY_REPORTED", "RESCHEDULED"],
      },
    });

    if (alreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "This post already has a confirmed booking",
      });
    }

    const scheduleValidation = await validateProviderSchedule({
      providerId: providerRequest.providerId,
      requestedDate: providerRequest.requestedDate,
      requestedStartTime: providerRequest.requestedStartTime,
      requestedEndTime: providerRequest.requestedEndTime,
    });
    
    if (!scheduleValidation.isValid) {
      providerRequest.validationStatus = scheduleValidation.validationStatus;
      providerRequest.validationMessage = scheduleValidation.message;
      await providerRequest.save();
    
      return res.status(409).json({
        success: false,
        message: "Provider schedule is no longer valid",
        validation: scheduleValidation,
      });
    }

    const booking = await Booking.create({
      postId: providerRequest.postId,
      seekerId: providerRequest.seekerId,
      providerId: providerRequest.providerId,
      providerRequestId: providerRequest._id,
      scheduledDate: providerRequest.requestedDate,
      startTime: providerRequest.requestedStartTime,
      endTime: providerRequest.requestedEndTime,
      estimatedDurationHours: providerRequest.estimatedDurationHours || 2,
      delayRiskLevel: providerRequest.riskLevel,
      delayRiskScore: providerRequest.riskScore,
      bookingStatus: "CONFIRMED",
    });

    providerRequest.requestStatus = "ACCEPTED";
    await providerRequest.save();

    await ProviderRequest.updateMany(
      {
        postId: providerRequest.postId,
        _id: { $ne: providerRequest._id },
        requestStatus: "PENDING",
      },
      {
        $set: {
          requestStatus: "REJECTED",
          validationMessage:
            "Another provider request was accepted for this post.",
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: "Provider request accepted and booking created successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to accept provider request",
      error: error.message,
    });
  }
};