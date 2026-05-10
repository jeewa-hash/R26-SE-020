import Booking from "../models/Booking.js";
import RescheduleRequest from "../models/RescheduleRequest.js";
import { suggestRescheduleSlots } from "../services/rescheduleSlotService.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";

export const createRescheduleRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const {
      requestedByType,
      requestedById = null,
      reason = "Schedule change required",
    } = req.body;

    if (!["PROVIDER", "SEEKER", "SYSTEM"].includes(requestedByType)) {
      return res.status(400).json({
        success: false,
        message: "requestedByType must be PROVIDER, SEEKER, or SYSTEM",
      });
    }

    if (requestedByType !== "SYSTEM" && !requestedById) {
      return res.status(400).json({
        success: false,
        message: "requestedById is required for PROVIDER or SEEKER reschedule requests",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      ![
        "CONFIRMED",
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULING_REQUIRED",
        "RESCHEDULED",
      ].includes(booking.bookingStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "This booking cannot be rescheduled in its current status",
        currentStatus: booking.bookingStatus,
      });
    }

    // Prevent duplicate pending reschedule requests for the same booking
    const existingPending = await RescheduleRequest.findOne({
      bookingId,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "A pending reschedule request already exists for this booking",
        data: existingPending,
      });
    }

    // Generate alternative slots using provider availability and existing bookings
    const suggestedSlots = await suggestRescheduleSlots({
      providerId: booking.providerId,
      currentDate: booking.scheduledDate,
      estimatedDurationHours: booking.estimatedDurationHours,
    });

    const rescheduleRequest = await RescheduleRequest.create({
      bookingId: booking._id,
      postId: booking.postId,
      seekerId: booking.seekerId,
      providerId: booking.providerId,

      requestedByType,
      requestedById,
      reason,

      currentSchedule: {
        date: booking.scheduledDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },

      suggestedSlots,
      status: "PENDING",
    });

    booking.bookingStatus = "RESCHEDULING_REQUIRED";
    await booking.save();

    return res.status(201).json({
      success: true,
      message: "Reschedule request created successfully",
      data: rescheduleRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create reschedule request",
      error: error.message,
    });
  }
};

export const acceptRescheduleSlot = async (req, res) => {
  try {
    const { rescheduleId } = req.params;
    const { selectedSlot } = req.body;

    if (
      !selectedSlot ||
      !selectedSlot.date ||
      !selectedSlot.startTime ||
      !selectedSlot.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "selectedSlot with date, startTime and endTime is required",
      });
    }

    const rescheduleRequest = await RescheduleRequest.findById(rescheduleId);

    if (!rescheduleRequest) {
      return res.status(404).json({
        success: false,
        message: "Reschedule request not found",
      });
    }

    if (rescheduleRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending reschedule requests can be accepted",
        currentStatus: rescheduleRequest.status,
      });
    }

    const booking = await Booking.findById(rescheduleRequest.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Related booking not found",
      });
    }

    // Re-check selected slot before updating the booking
    const validation = await validateProviderSchedule({
      providerId: booking.providerId,
      requestedDate: selectedSlot.date,
      requestedStartTime: selectedSlot.startTime,
      requestedEndTime: selectedSlot.endTime,
    });

    if (!validation.isValid) {
      return res.status(409).json({
        success: false,
        message: "Selected slot is no longer available",
        validation,
      });
    }

    booking.scheduledDate = selectedSlot.date;
    booking.startTime = selectedSlot.startTime;
    booking.endTime = selectedSlot.endTime;
    booking.bookingStatus = "RESCHEDULED";
    await booking.save();

    rescheduleRequest.selectedSlot = selectedSlot;
    rescheduleRequest.status = "ACCEPTED";
    await rescheduleRequest.save();

    return res.status(200).json({
      success: true,
      message: "Reschedule slot accepted and booking updated successfully",
      data: {
        rescheduleRequest,
        booking,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to accept reschedule slot",
      error: error.message,
    });
  }
};

export const getReschedulesByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const reschedules = await RescheduleRequest.find({ bookingId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: reschedules.length,
      data: reschedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get reschedule requests",
      error: error.message,
    });
  }
};