import ProviderRequest from "../models/ProviderRequest.js";
import Booking from "../models/Booking.js";
import Post from "../models/Post.js";

import { estimateServiceDuration } from "../services/durationEstimationService.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";
import { getRoadDistanceAndTime } from "../services/osrmService.js";
import { findPreviousProviderBooking } from "../services/bookingContextService.js";
import { predictCoordinationRisk } from "../services/mlRiskService.js";

import {
  addHoursToTime,
  calculateGapMinutes,
} from "../utils/timeUtils.js";

const mapUrgencyToPriority = (urgency = "medium") => {
  const normalizedUrgency = urgency.toLowerCase();

  if (normalizedUrgency === "high") return 3;
  if (normalizedUrgency === "medium") return 2;
  return 1;
};

export const createProviderRequest = async (req, res) => {
  try {
    const {
      postId,
      requestedDate,
      requestedStartTime,
      estimatedDurationHours,
      serviceCategory = "",
      serviceSubcategory = "",
      taskName = "",
      complexityLevel = "Medium",
      propertySize = "Medium",
      urgency = "medium",
      location = {},
    } = req.body;

    // Logged-in service provider becomes the requester
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    // Governance restriction check: If provider has 3 or more active unapproved cancellations, block new proposals
    const activeUnapproved = await Booking.countDocuments({
      providerId,
      bookingStatus: "CANCELLED",
      "cancellationInfo.cancelledBy": "PROVIDER",
      "cancellationInfo.inquiryStatus": { $ne: "APPROVED" },
    });

    if (activeUnapproved >= 3) {
      return res.status(403).json({
        success: false,
        message: `Your account is temporarily restricted from submitting proposals due to 3 or more active missed service cancellations (Penalty score: ${activeUnapproved}/3). Please submit inquiries to restore access.`,
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Use provider-selected schedule first. If not provided, use seeker's preferred post schedule.
    const finalRequestedDate =
      requestedDate || post.preferredSchedule?.date || "";

    const finalRequestedStartTime =
      requestedStartTime || post.preferredSchedule?.startTime || "";

    if (!finalRequestedDate || !finalRequestedStartTime) {
      return res.status(400).json({
        success: false,
        message:
          "Schedule is required. Provide requestedDate/requestedStartTime or set post preferredSchedule.",
      });
    }

    const seekerId = post.seekerId;

    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "Post does not have a seekerId",
      });
    }

    const finalServiceCategory = serviceCategory || post.category || "";
    const finalTaskName = taskName || post.title || "";
    const finalUrgency = urgency || post.urgency || "medium";
    const requestedCategory = String(post.category || "").trim().toLowerCase();
    const offeredCategory = String(finalServiceCategory || "").trim().toLowerCase();
    const expertiseMatch = !requestedCategory || !offeredCategory
      ? 1
      : Number(
          requestedCategory.includes(offeredCategory) ||
          offeredCategory.includes(requestedCategory)
        );

    // Use request location if provided, otherwise use post location
    const finalLocation =
      location && location.lat != null && location.lng != null
        ? location
        : post.location || {};

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
        serviceCategory: finalServiceCategory,
        serviceSubcategory,
        taskName: finalTaskName,
        complexityLevel,
        propertySize,
        urgency: finalUrgency,
      });

      finalEstimatedDurationHours = durationResult.averageDurationHours;
    }

    const requestedEndTime = addHoursToTime(
      finalRequestedStartTime,
      finalEstimatedDurationHours
    );

    const scheduleValidation = await validateProviderSchedule({
      providerId,
      requestedDate: finalRequestedDate,
      requestedStartTime: finalRequestedStartTime,
      requestedEndTime,
    });

    // Hard conflict should be blocked. Do not create ProviderRequest.
    if (scheduleValidation.validationStatus === "CONFLICT") {
      return res.status(409).json({
        success: false,
        message: scheduleValidation.message,
        validationStatus: "CONFLICT",
      });
    }

    let distanceFromPreviousBookingKm = 0;
    let estimatedTravelTimeMins = 0;
    let gapFromPreviousBookingMins = null;

    const previousBooking = await findPreviousProviderBooking({
      providerId,
      requestedDate: finalRequestedDate,
      requestedStartTime: finalRequestedStartTime,
    });

    if (
      previousBooking &&
      previousBooking.location?.lat != null &&
      previousBooking.location?.lng != null &&
      finalLocation?.lat != null &&
      finalLocation?.lng != null
    ) {
      const osrmResult = await getRoadDistanceAndTime(
        previousBooking.location.lat,
        previousBooking.location.lng,
        finalLocation.lat,
        finalLocation.lng
      );

      distanceFromPreviousBookingKm = osrmResult.distanceKm;
      estimatedTravelTimeMins = osrmResult.estimatedTravelTimeMins;

      gapFromPreviousBookingMins = calculateGapMinutes(
        previousBooking.endTime,
        finalRequestedStartTime
      );
    }

    // Rule-based fallback risk calculation if ML service fails
    let riskLevel = "LOW";
    let riskScore = 10;
    let riskMessage = scheduleValidation.message;

    if (gapFromPreviousBookingMins !== null) {
      const travelGapDifference =
        estimatedTravelTimeMins - gapFromPreviousBookingMins;

      if (travelGapDifference <= 0) {
        riskLevel = "LOW";
        riskScore = 20;
        riskMessage =
          "Low delay risk: provider has enough travel time from previous booking.";
      } else if (travelGapDifference <= 15) {
        riskLevel = "MEDIUM";
        riskScore = 55;
        riskMessage = `Warning: estimated travel time exceeds available gap by ${travelGapDifference} minutes.`;
      } else {
        riskLevel = "HIGH";
        riskScore = 85;
        riskMessage = `High delay risk: estimated travel time exceeds available gap by ${travelGapDifference} minutes.`;
      }
    }

    const mlInput = {
      expertiseMatch,
      taskPriority: mapUrgencyToPriority(finalUrgency),
      taskDuration: finalEstimatedDurationHours,
      distanceBetweenBookingsKm: distanceFromPreviousBookingKm,
      estimatedTravelTimeMins,
      gapBetweenBookingsMins: gapFromPreviousBookingMins ?? 999,
      providerBookingsToday: scheduleValidation.providerBookingsToday || 0,
    };

    let mlRisk = {
      source: "ML_FAILED",
    };

    // Use trained ML model when available
    mlRisk = await predictCoordinationRisk(mlInput);

    if (mlRisk.source !== "ML_FAILED") {
      riskLevel = mlRisk.riskLevel;
      riskScore = mlRisk.riskScore;
      riskMessage = mlRisk.recommendation;
    }

    const finalValidationStatus =
      riskLevel === "HIGH"
        ? "HIGH_RISK"
        : riskLevel === "MEDIUM"
        ? "WARNING"
        : "VALIDATED";

    const providerRequest = await ProviderRequest.create({
      postId,
      seekerId,
      providerId,

      serviceCategory: finalServiceCategory,
      serviceSubcategory,
      taskName: finalTaskName,
      complexityLevel,
      propertySize,

      location: finalLocation,

      requestedDate: finalRequestedDate,
      requestedStartTime: finalRequestedStartTime,
      requestedEndTime,

      estimatedDurationHours: finalEstimatedDurationHours,
      durationConfidence: durationResult?.confidence || "UNKNOWN",
      requiresMultipleDays: durationResult?.requiresMultipleDays || false,

      distanceFromPreviousBookingKm,
      estimatedTravelTimeMins,
      gapFromPreviousBookingMins,

      validationStatus: finalValidationStatus,
      requestStatus: "PENDING",
      riskLevel,
      riskScore,
      validationMessage: riskMessage,
    });

    return res.status(201).json({
      success: true,
      message: "Provider request created successfully",
      mlSource: mlRisk.source,
      mlInput,
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
    const providerId = req.user?.id || req.params.providerId;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

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
    const { finalLocation } = req.body;

    const loggedInSeekerId = req.user?.id;

    if (!loggedInSeekerId) {
      return res.status(401).json({
        success: false,
        message: "Seeker authentication required",
      });
    }

    const providerRequest = await ProviderRequest.findById(requestId);

    if (!providerRequest) {
      return res.status(404).json({
        success: false,
        message: "Provider request not found",
      });
    }

    if (providerRequest.seekerId.toString() !== loggedInSeekerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the seeker who owns this post can accept this request",
      });
    }

    if (providerRequest.requestStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be accepted",
      });
    }

    // Check if provider is restricted due to 3 or more active unapproved cancellations
    const providerActiveMissed = await Booking.countDocuments({
      providerId: providerRequest.providerId,
      bookingStatus: "CANCELLED",
      "cancellationInfo.cancelledBy": "PROVIDER",
      "cancellationInfo.inquiryStatus": { $ne: "APPROVED" },
    });

    if (providerActiveMissed >= 3) {
      return res.status(403).json({
        success: false,
        message: `This service provider currently has ${providerActiveMissed} active missed/cancelled services and cannot be booked until inquiries are reviewed and approved by Administration.`,
      });
    }

    const alreadyBooked = await Booking.findOne({
      postId: providerRequest.postId,
      bookingStatus: {
        $in: ["CONFIRMED", "ON_THE_WAY", "IN_PROGRESS", "DELAY_REPORTED", "RESCHEDULE_REQUESTED", "RESCHEDULING_REQUIRED", "RESCHEDULED"],
      },
    });

    if (alreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "This post already has a confirmed booking",
      });
    }

    // Re-check schedule before accepting because provider schedule may have changed
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

    // Use final location from seeker if provided, otherwise use request/post location
    const hasFinalLocation =
      finalLocation &&
      finalLocation.lat != null &&
      finalLocation.lng != null;

    const bookingLocation = hasFinalLocation
      ? finalLocation
      : providerRequest.location;

    const booking = await Booking.create({
      postId: providerRequest.postId,
      seekerId: providerRequest.seekerId,
      providerId: providerRequest.providerId,
      providerRequestId: providerRequest._id,

      // First confirmed schedule for admin/history tracking
      initialSchedule: {
        date: providerRequest.requestedDate,
        startTime: providerRequest.requestedStartTime,
        endTime: providerRequest.requestedEndTime,
      },

      // Current active schedule
      scheduledDate: providerRequest.requestedDate,
      startTime: providerRequest.requestedStartTime,
      endTime: providerRequest.requestedEndTime,

      estimatedDurationHours: providerRequest.estimatedDurationHours || 2,

      location: bookingLocation,

      distanceFromPreviousBookingKm:
        providerRequest.distanceFromPreviousBookingKm || 0,
      estimatedTravelTimeMins: providerRequest.estimatedTravelTimeMins || 0,
      gapFromPreviousBookingMins:
        providerRequest.gapFromPreviousBookingMins ?? null,

      delayRiskLevel: providerRequest.riskLevel,
      delayRiskScore: providerRequest.riskScore,
      bookingStatus: "CONFIRMED",
    });

    // Asynchronously log booking to ML Data (service_data_for_csvs) table in admin service
    try {
      const adminUrl = process.env.ADMIN_SERVICE_URL || "http://localhost:5001";
      axios.post(`${adminUrl}/api/log-booking-ml`, {
        bookingId: booking._id.toString(),
        providerId: booking.providerId?.toString(),
        seekerId: booking.seekerId?.toString(),
        category: providerRequest.serviceCategory,
        scheduledDate: booking.scheduledDate,
      }).catch((e) => console.warn('ML booking log warning:', e.message));
    } catch (e) {
      // non-blocking
    }

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
