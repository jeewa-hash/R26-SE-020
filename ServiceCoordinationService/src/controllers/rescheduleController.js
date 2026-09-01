import Booking from "../models/Booking.js";
import RescheduleRequest from "../models/RescheduleRequest.js";
import { suggestRescheduleSlots } from "../services/rescheduleSlotService.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";

const getRequesterType = (role) => {
  if (role === "ServiceProvider") return "PROVIDER";
  if (role === "Seeker") return "SEEKER";
  return "SYSTEM";
};

const canAccessBooking = (req, booking) => {
  if (req.user.role === "Admin") return true;
  if (req.user.role === "ServiceProvider") return booking.providerId.toString() === req.user.id;
  if (req.user.role === "Seeker") return booking.seekerId.toString() === req.user.id;
  return false;
};

export const createRescheduleRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      reason = "Schedule change required",
      sessionId = "",
      quotationId = null,
      requestedStartTime = null,
      note = "",
      createdBy,
    } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
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

    const existingPending = await RescheduleRequest.findOne({
      bookingId,
      status: { $in: ["PENDING", "PENDING_PROVIDER_REVIEW"] },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "A pending reschedule request already exists for this booking",
        data: existingPending,
      });
    }

    const suggestedSlots = await suggestRescheduleSlots({
      providerId: booking.providerId,
      currentDate: booking.scheduledDate,
      estimatedDurationHours: booking.estimatedDurationHours,
    });

    let requestedSlot = null;
    if (requestedStartTime) {
      const start = new Date(requestedStartTime);
      if (Number.isNaN(start.getTime()) || start <= new Date()) {
        return res.status(400).json({ success: false, message: "requestedStartTime must be a valid future date and time" });
      }
      const durationHours = Number(booking.estimatedDurationHours) > 0 ? Number(booking.estimatedDurationHours) : 1;
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      const pad = (value) => String(value).padStart(2, "0");
      const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const time = (value) => `${pad(value.getHours())}:${pad(value.getMinutes())}`;
      requestedSlot = {
        date,
        startTime: time(start),
        endTime: time(end),
        score: 0,
        riskLevel: "UNKNOWN",
        reason: note || "Seeker-proposed reschedule time",
      };
    }

    const requesterType = getRequesterType(req.user.role);

    const rescheduleRequest = await RescheduleRequest.create({
      bookingId: booking._id,
      postId: booking.postId,
      seekerId: booking.seekerId,
      providerId: booking.providerId,

      sessionId: sessionId || booking.externalSessionId || "",
      quotationId: quotationId || booking.externalQuotationId || null,
      requestedStartTime: requestedStartTime || null,
      note,
      createdBy: createdBy === requesterType ? createdBy : requesterType,

      requestedByType: requesterType,
      requestedById: req.user.id,
      reason,

      currentSchedule: {
        date: booking.scheduledDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },

      suggestedSlots: requestedSlot ? [requestedSlot, ...suggestedSlots] : suggestedSlots,
      status: requesterType === "SEEKER" && requestedSlot ? "PENDING_PROVIDER_REVIEW" : "PENDING",
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

    if (!["PENDING", "PENDING_PROVIDER_REVIEW"].includes(rescheduleRequest.status)) {
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

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
      });
    }

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

    booking.acceptedRescheduleRequests.push(rescheduleRequest._id);

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

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
      });
    }

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
