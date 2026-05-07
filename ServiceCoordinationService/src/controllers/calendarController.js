import Booking from "../models/Booking.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";

const formatCalendarBooking = (booking, viewerType) => {
  return {
    bookingId: booking._id,
    title: `${booking.serviceSubCategory} - ${booking.serviceCategory}`,
    customerId: booking.customerId,
    providerId: booking.providerId,

    startTime: booking.scheduledStartTime,
    endTime: booking.scheduledEndTime,

    actualStartTime: booking.actualStartTime,
    actualEndTime: booking.actualEndTime,

    serviceCategory: booking.serviceCategory,
    serviceSubCategory: booking.serviceSubCategory,
    taskComplexity: booking.taskComplexity,

    bookingStatus: booking.bookingStatus,
    delayStatus: booking.delayStatus,
    conflictStatus: booking.conflictStatus,
    reschedulingRequired: booking.reschedulingRequired,

    predictedActualDurationHours: booking.predictedActualDurationHours,
    estimatedDurationHours: booking.estimatedDurationHours,
    predictedDelayRiskLevel: booking.predictedDelayRiskLevel,
    delayRiskProbability: booking.delayRiskProbability,

    address: booking.address,
    district: booking.district,
    notes: booking.notes,

    viewerType
  };
};

export const getProviderCalendar = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const { from, to } = req.query;

  const query = { providerId };

  if (from || to) {
    query.scheduledStartTime = {};

    if (from) {
      query.scheduledStartTime.$gte = new Date(from);
    }

    if (to) {
      query.scheduledStartTime.$lte = new Date(to);
    }
  }

  const bookings = await Booking.find(query).sort({ scheduledStartTime: 1 });

  const calendarItems = bookings.map((booking) =>
    formatCalendarBooking(booking, "provider")
  );

  sendSuccess(
    res,
    calendarItems,
    "Provider calendar retrieved successfully"
  );
});

export const getSeekerCalendar = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { from, to } = req.query;

  const query = { customerId };

  if (from || to) {
    query.scheduledStartTime = {};

    if (from) {
      query.scheduledStartTime.$gte = new Date(from);
    }

    if (to) {
      query.scheduledStartTime.$lte = new Date(to);
    }
  }

  const bookings = await Booking.find(query).sort({ scheduledStartTime: 1 });

  const calendarItems = bookings.map((booking) =>
    formatCalendarBooking(booking, "seeker")
  );

  sendSuccess(
    res,
    calendarItems,
    "Seeker calendar retrieved successfully"
  );
});