import Booking from "../models/Booking.js";
import DelayReport from "../models/DelayReport.js";
import { BOOKING_STATUS, CONFLICT_STATUS } from "../constants/bookingStatus.js";
import {
  analyzeStartDelay,
  analyzeExecutionDelay
} from "../services/delayDetectionService.js";
import { analyzeScheduleImpact } from "../services/scheduleImpactService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";

export const reportStartDelay = asyncHandler(async (req, res) => {
  const { bookingId, actualStartTime, delayReason } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  const startDelayResult = analyzeStartDelay({
    scheduledStartTime: booking.scheduledStartTime,
    actualStartTime,
    estimatedDurationHours: booking.predictedActualDurationHours
  });

  const impactResult = await analyzeScheduleImpact({
    providerId: booking.providerId,
    currentBookingId: booking._id,
    updatedExpectedEndTime: startDelayResult.updatedExpectedEndTime
  });

  const delayReport = await DelayReport.create({
    bookingId: booking._id,
    providerId: booking.providerId,
    customerId: booking.customerId,
    delayType: "start_delay",
    scheduledStartTime: booking.scheduledStartTime,
    actualStartTime,
    scheduledEndTime: booking.scheduledEndTime,
    updatedExpectedEndTime: startDelayResult.updatedExpectedEndTime,
    startDelayMinutes: startDelayResult.startDelayMinutes,
    totalDelayMinutes: startDelayResult.startDelayMinutes,
    delayReason,
    conflictDetected: impactResult.conflictDetected,
    reschedulingRequired: impactResult.reschedulingRequired,
    affectedBookings: impactResult.affectedBookings
  });

  booking.actualStartTime = actualStartTime;
  booking.delayStatus = startDelayResult.delayed ? "delayed" : "not_delayed";
  booking.conflictStatus = impactResult.conflictDetected
    ? CONFLICT_STATUS.CONFLICT_DETECTED
    : CONFLICT_STATUS.NONE;
  booking.reschedulingRequired = impactResult.reschedulingRequired;
  booking.bookingStatus = impactResult.reschedulingRequired
    ? BOOKING_STATUS.RESCHEDULING_REQUIRED
    : BOOKING_STATUS.STARTED;

  await booking.save();

  // Mark affected future bookings as affected
  if (impactResult.affectedBookings.length > 0) {
    const affectedIds = impactResult.affectedBookings.map((item) => item.bookingId);

    await Booking.updateMany(
      { _id: { $in: affectedIds } },
      {
        conflictStatus: CONFLICT_STATUS.AFFECTED,
        reschedulingRequired: true
      }
    );
  }

  sendSuccess(
    res,
    {
      delayReport,
      startDelayAnalysis: startDelayResult,
      scheduleImpact: impactResult
    },
    "Start delay analyzed successfully",
    201
  );
});

export const reportExecutionDelay = asyncHandler(async (req, res) => {
  const { bookingId, updatedExpectedEndTime, delayReason } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  const executionDelayResult = analyzeExecutionDelay({
    scheduledEndTime: booking.scheduledEndTime,
    updatedExpectedEndTime
  });

  const impactResult = await analyzeScheduleImpact({
    providerId: booking.providerId,
    currentBookingId: booking._id,
    updatedExpectedEndTime
  });

  const delayReport = await DelayReport.create({
    bookingId: booking._id,
    providerId: booking.providerId,
    customerId: booking.customerId,
    delayType: "execution_delay",
    scheduledStartTime: booking.scheduledStartTime,
    actualStartTime: booking.actualStartTime,
    scheduledEndTime: booking.scheduledEndTime,
    updatedExpectedEndTime,
    executionDelayMinutes: executionDelayResult.executionDelayMinutes,
    totalDelayMinutes: executionDelayResult.executionDelayMinutes,
    delayReason,
    conflictDetected: impactResult.conflictDetected,
    reschedulingRequired: impactResult.reschedulingRequired,
    affectedBookings: impactResult.affectedBookings
  });

  booking.delayStatus = executionDelayResult.delayed ? "delayed" : "not_delayed";
  booking.conflictStatus = impactResult.conflictDetected
    ? CONFLICT_STATUS.CONFLICT_DETECTED
    : CONFLICT_STATUS.NONE;
  booking.reschedulingRequired = impactResult.reschedulingRequired;
  booking.bookingStatus = impactResult.reschedulingRequired
    ? BOOKING_STATUS.RESCHEDULING_REQUIRED
    : BOOKING_STATUS.DELAYED;

  await booking.save();

  if (impactResult.affectedBookings.length > 0) {
    const affectedIds = impactResult.affectedBookings.map((item) => item.bookingId);

    await Booking.updateMany(
      { _id: { $in: affectedIds } },
      {
        conflictStatus: CONFLICT_STATUS.AFFECTED,
        reschedulingRequired: true
      }
    );
  }

  sendSuccess(
    res,
    {
      delayReport,
      executionDelayAnalysis: executionDelayResult,
      scheduleImpact: impactResult
    },
    "Execution delay analyzed successfully",
    201
  );
});

export const getDelayReportsByBooking = asyncHandler(async (req, res) => {
  const reports = await DelayReport.find({
    bookingId: req.params.bookingId
  }).sort({ createdAt: -1 });

  sendSuccess(res, reports, "Delay reports retrieved successfully");
});