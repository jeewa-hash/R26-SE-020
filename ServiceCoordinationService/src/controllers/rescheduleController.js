import { toScheduleParts } from '../utils/timeUtils.js';
import { publishLifecycleNotification } from '../utils/lifecycleNotifications.js';
import Booking, { notifyBookingLifecycle } from "../models/Booking.js";
import RescheduleRequest from "../models/RescheduleRequest.js";
import { suggestRescheduleSlots } from "../services/rescheduleSlotService.js";
import { validateProviderSchedule } from "../services/scheduleValidationService.js";
import BidCoordination from "../models/BidCoordination.js";
import { updateProviderQuotationCoordination } from "../clients/providerServiceClient.js";
import { getRoadDistanceAndTime } from "../services/osrmService.js";

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

const getScheduledStart = (booking) => {
  const value = booking.scheduledStartTime || (booking.scheduledDate && booking.startTime ? `${booking.scheduledDate}T${booking.startTime}:00` : null);
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
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
        "ON_THE_WAY",
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULE_REQUESTED",
        "RESCHEDULING_REQUIRED",
        "RESCHEDULED",
        "EXPIRED",
      ].includes(booking.bookingStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "This booking cannot be rescheduled in its current status",
        currentStatus: booking.bookingStatus,
      });
    }

    if (["CONFIRMED", "RESCHEDULED"].includes(booking.bookingStatus)) {
      const scheduledStart = getScheduledStart(booking);
      const now = new Date();
      const closesAt = scheduledStart ? new Date(scheduledStart.getTime() + 45 * 60 * 1000) : null;
      if (scheduledStart && now > closesAt) {
        booking.bookingStatus = "EXPIRED";
        booking.expiredAt = now;
        await booking.save();

      }
      if (!scheduledStart) return res.status(409).json({ message: 'A valid original schedule is required.' });
    }

    if (booking.bookingStatus === 'EXPIRED' && (req.user.role !== 'Seeker' || !requestedStartTime)) {
      return res.status(400).json({ success: false, message: 'The customer must propose a future start time to reopen an expired service.' });
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

    const suggestedSlots = requestedStartTime ? [] : await suggestRescheduleSlots({
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
      const durationHours = Number(booking.mlPredictedDurationHours || booking.estimatedDurationHours);
      if (!(durationHours > 0)) return res.status(409).json({ message: "A valid service duration is needed before rescheduling." });
      const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      const date = toScheduleParts(start).date;
      const time = value => toScheduleParts(value).time;
      if (date !== toScheduleParts(end).date) return res.status(400).json({ message: "The requested job must finish within the same working day." });
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
      previousBookingStatus: booking.bookingStatus,

      currentSchedule: {
        date: booking.scheduledDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },

      suggestedSlots: requestedSlot ? [requestedSlot, ...suggestedSlots] : suggestedSlots,
      status: requesterType === "SEEKER" && requestedSlot ? "PENDING_PROVIDER_REVIEW" : "PENDING",
    });

    booking.pendingRescheduleId = rescheduleRequest._id;
    // An expired service remains expired until the provider approves its new time.
    if (booking.bookingStatus === 'EXPIRED') {
      booking.timeline.push({ status: 'EXPIRED', message: 'Customer requested a new time; awaiting provider review.', at: new Date() });
      await booking.save();
      await notifyBookingLifecycle(booking, 'RESCHEDULE_REQUESTED');
    } else {
      booking.bookingStatus = "RESCHEDULE_REQUESTED";
      await booking.save();
    }

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

    if (String(booking.providerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Only the assigned provider can review a reschedule request" });
    }

    const durationHours = Number(booking.mlPredictedDurationHours) > 0
      ? Number(booking.mlPredictedDurationHours)
      : Number(booking.estimatedDurationHours);
    if (!(durationHours > 0)) {
      return res.status(409).json({ success: false, message: "A valid service duration is required before rescheduling" });
    }
    const selectedStart = new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00+05:30`);
    if (Number.isNaN(selectedStart.getTime()) || selectedStart <= new Date()) {
      return res.status(400).json({ success: false, message: "Selected slot date and start time are invalid" });
    }
    const selectedEnd = new Date(selectedStart.getTime() + durationHours * 60 * 60 * 1000);
    const validationEnd = new Date(selectedEnd.getTime() + 30 * 60 * 1000);
    if (['COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'DELAY_REPORTED'].includes(booking.bookingStatus)) return res.status(409).json({ message: 'This booking can no longer use this reschedule request.' });
    if (toScheduleParts(selectedStart).date !== toScheduleParts(validationEnd).date) return res.status(409).json({ message: 'The full job and buffer must fit within the working day.' });
    const validatedSlot = {
      ...selectedSlot,
      endTime: toScheduleParts(selectedEnd).time,
    };

    const validation = await validateProviderSchedule({
      providerId: booking.providerId,
      requestedDate: validatedSlot.date,
      requestedStartTime: validatedSlot.startTime,
      requestedEndTime: toScheduleParts(validationEnd).time,
      excludeBookingId: booking._id,
    });

    if (!validation.isValid) {
      return res.status(409).json({
        success: false,
        message: "Selected slot is no longer available",
        validation,
      });
    }

    const previousBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      providerId: booking.providerId,
      bookingStatus: { $in: ["CONFIRMED", "ON_THE_WAY", "IN_PROGRESS", "DELAY_REPORTED", "COMPLETED", "RESCHEDULED"] },
      scheduledDate: selectedSlot.date,
      scheduledStartTime: { $lt: selectedStart },
    }).sort({ scheduledStartTime: -1 });
    if (previousBooking?.location?.lat != null && previousBooking?.location?.lng != null && booking.location?.lat != null && booking.location?.lng != null) {
      const travel = await getRoadDistanceAndTime(previousBooking.location.lat, previousBooking.location.lng, booking.location.lat, booking.location.lng);
      const previousEnd = previousBooking.bookingStatus === "EXPIRED"
        ? (previousBooking.expiredAt || previousBooking.scheduledStartTime)
        : (previousBooking.actualEndTime || previousBooking.scheduledEndTime);
      const travelGapMinutes = previousEnd ? Math.round((selectedStart.getTime() - new Date(previousEnd).getTime()) / 60000) : null;
      if (travelGapMinutes !== null && travelGapMinutes < travel.estimatedTravelTimeMins) {
        return res.status(409).json({ success: false, message: "Selected slot does not leave enough travel time from the previous booking" });
      }
    }

    const originalStart = booking.scheduledStartTime;
    const originalPendingId = booking.pendingRescheduleId;
    booking.acceptedRescheduleRequests.push(rescheduleRequest._id);

    booking.scheduledDate = validatedSlot.date;
    booking.startTime = validatedSlot.startTime;
    booking.endTime = validatedSlot.endTime;
    booking.scheduledStartTime = selectedStart;
    booking.scheduledEndTime = selectedEnd;
    booking.pendingRescheduleId = null;
    booking.bookingStatus = "RESCHEDULED";
    booking.expiredAt = null;
    booking.actualStartTime = null;
    booking.providerReadyConfirmed = false;
    booking.providerReadyConfirmedAt = null;
    booking.onTheWayAt = null;
    booking.timeline.push({ status: 'RESCHEDULED', message: `Provider approved the new service time. Previous appointment: ${rescheduleRequest.currentSchedule.date} ${rescheduleRequest.currentSchedule.startTime}.`, at: new Date() });

    const approvedBooking = await Booking.findOneAndUpdate({
      _id: booking._id, actualStartTime: null, scheduledStartTime: originalStart,
      bookingStatus: { $in: ['EXPIRED', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED', 'CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY'] },
      ...(originalPendingId ? { pendingRescheduleId: rescheduleRequest._id } : {}),
    }, {
      $set: { scheduledDate: booking.scheduledDate, startTime: booking.startTime, endTime: booking.endTime,
        scheduledStartTime: selectedStart, scheduledEndTime: selectedEnd, bookingStatus: 'RESCHEDULED',
        expiredAt: null, actualStartTime: null, pendingRescheduleId: null, providerReadyConfirmed: false,
        providerReadyConfirmedAt: null, onTheWayAt: null },
      $addToSet: { acceptedRescheduleRequests: rescheduleRequest._id },
      $push: { timeline: booking.timeline[booking.timeline.length - 1] },
    }, { new: true });
    if (!approvedBooking) return res.status(409).json({ message: 'Booking changed while approving. Refresh before continuing.' });
    await notifyBookingLifecycle(approvedBooking, 'RESCHEDULED');


    rescheduleRequest.selectedSlot = validatedSlot;
    rescheduleRequest.status = "ACCEPTED";
    await rescheduleRequest.save();

    const quotationId = rescheduleRequest.quotationId || booking.externalQuotationId;
    let quotationUpdateWarning = null;
    if (quotationId) {
      const coordination = await BidCoordination.findOneAndUpdate(
        { externalQuotationId: quotationId },
        { finalDecision: "CAN_ACCEPT", recommendedAction: "Provider validated and accepted the rescheduled time.", status: "ready_for_seeker_review" },
        { new: true }
      );
      try {
        await updateProviderQuotationCoordination(
          quotationId,
          "CAN_ACCEPT",
          coordination?._id?.toString() || booking.bidCoordinationId?.toString() || null,
          selectedStart,
          selectedEnd
        );
      } catch (error) {
        quotationUpdateWarning = error.message;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Reschedule slot accepted and booking updated successfully",
      data: {
        rescheduleRequest,
        booking,
        quotationUpdateWarning,
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

export const rejectRescheduleRequest = async (req, res) => {
  try {
    const rescheduleRequest = await RescheduleRequest.findById(req.params.rescheduleId);
    if (!rescheduleRequest) return res.status(404).json({ success: false, message: "Reschedule request not found" });
    if (String(rescheduleRequest.providerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Only the assigned provider can review this request" });
    }
    if (!["PENDING", "PENDING_PROVIDER_REVIEW"].includes(rescheduleRequest.status)) {
      return res.status(400).json({ success: false, message: "Only pending reschedule requests can be rejected" });
    }
    rescheduleRequest.status = "REJECTED";
    await rescheduleRequest.save();
    const booking = await Booking.findById(rescheduleRequest.bookingId);
    if (booking && String(booking.pendingRescheduleId) === String(rescheduleRequest._id)) {
      booking.pendingRescheduleId = null;
      if (booking.bookingStatus === "RESCHEDULE_REQUESTED") booking.bookingStatus = rescheduleRequest.previousBookingStatus || "CONFIRMED";
      await booking.save();
    }
    if (booking?.bookingStatus === "RESCHEDULE_REQUESTED") {
      booking.bookingStatus = rescheduleRequest.previousBookingStatus || "CONFIRMED";
      await booking.save();
    }
    await publishLifecycleNotification({ recipientId: String(rescheduleRequest.seekerId), role: 'Seeker', eventId: `reschedule:${rescheduleRequest._id}:rejected`, type: 'booking', title: 'New time declined', message: 'The provider declined the proposed time. Open your service to choose another time.', metadata: { bookingId: String(rescheduleRequest.bookingId) } });
    return res.status(200).json({ success: true, message: "Reschedule request rejected", data: rescheduleRequest });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to reject reschedule request", error: error.message });
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
