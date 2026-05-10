import ProviderRequest from "../models/ProviderRequest.js";
import Booking from "../models/Booking.js";
import { addHoursToTime,calculateGapMinutes } from "../utils/timeUtils.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";
import { estimateServiceDuration } from "../services/durationEstimationService.js";
import { getRoadDistanceAndTime } from "../services/osrmService.js";
import { findPreviousProviderBooking } from "../services/bookingContextService.js";

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
      location = {},
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

    let distanceFromPreviousBookingKm = 0;
    let estimatedTravelTimeMins = 0;
    let gapFromPreviousBookingMins = null;

    const previousBooking = await findPreviousProviderBooking({
      providerId,
      requestedDate,
      requestedStartTime,
    });

    if (
      previousBooking &&
      previousBooking.location?.lat != null &&
      previousBooking.location?.lng != null &&
      location?.lat != null &&
      location?.lng != null
    ) {
      const osrmResult = await getRoadDistanceAndTime(
        previousBooking.location.lat,
        previousBooking.location.lng,
        location.lat,
        location.lng
      );

      distanceFromPreviousBookingKm = osrmResult.distanceKm;
      estimatedTravelTimeMins = osrmResult.estimatedTravelTimeMins;

      gapFromPreviousBookingMins = calculateGapMinutes(
        previousBooking.endTime,
        requestedStartTime
      );
    }

    // Calculate delay risk using OSRM travel time and available booking gap
    let riskLevel = "LOW";
    let riskScore = 10;
    let riskMessage = scheduleValidation.message;

    if (scheduleValidation.validationStatus === "CONFLICT") {
      // Hard blocker because the requested time overlaps or violates availability
      riskLevel = "HIGH";
      riskScore = 100;
      riskMessage = scheduleValidation.message;
    } else if (gapFromPreviousBookingMins !== null) {
      // Compare travel time from previous booking with the available gap
      const travelGapDifference =
        estimatedTravelTimeMins - gapFromPreviousBookingMins;

      if (travelGapDifference <= 0) {
        // Provider has enough time to travel
        riskLevel = "LOW";
        riskScore = 20;
        riskMessage =
          "Low delay risk: provider has enough travel time from previous booking.";
      } else if (travelGapDifference <= 15) {
        // Small shortage, so show warning instead of high risk
        riskLevel = "MEDIUM";
        riskScore = 55;
        riskMessage = `Warning: estimated travel time exceeds available gap by ${travelGapDifference} minutes.`;
      } else {
        // Large shortage, so mark as high risk
        riskLevel = "HIGH";
        riskScore = 85;
        riskMessage = `High delay risk: estimated travel time exceeds available gap by ${travelGapDifference} minutes.`;
      }
    }

    // Convert risk level into request validation status
    const finalValidationStatus =
      scheduleValidation.validationStatus === "CONFLICT"
        ? "CONFLICT"
        : riskLevel === "HIGH"
        ? "HIGH_RISK"
        : riskLevel === "MEDIUM"
        ? "WARNING"
        : "VALIDATED";



    const providerRequest = await ProviderRequest.create({
      postId,
      seekerId,
      providerId,

      serviceCategory,
      serviceSubcategory,
      taskName,
      complexityLevel,
      propertySize,

      location,

      requestedDate,
      requestedStartTime,
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

    // Allows seeker to provide exact final service location during booking confirmation
    const { finalLocation } = req.body;

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

    // Re-check provider schedule before creating booking because provider schedule may have changed
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

    // Use final location from seeker if provided, otherwise use original request/post location
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

      scheduledDate: providerRequest.requestedDate,
      startTime: providerRequest.requestedStartTime,
      endTime: providerRequest.requestedEndTime,
      estimatedDurationHours: providerRequest.estimatedDurationHours || 2,

      location: bookingLocation,

      distanceFromPreviousBookingKm:
        providerRequest.distanceFromPreviousBookingKm || 0,
      estimatedTravelTimeMins:
        providerRequest.estimatedTravelTimeMins || 0,
      gapFromPreviousBookingMins:
        providerRequest.gapFromPreviousBookingMins ?? null,

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