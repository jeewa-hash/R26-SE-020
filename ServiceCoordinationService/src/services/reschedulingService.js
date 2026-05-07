import Booking from "../models/Booking.js";
import RescheduleSuggestion from "../models/RescheduleSuggestion.js";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import {
  addHours,
  addMinutes,
  hasTimeOverlap,
  formatSlotLabel
} from "../utils/timeUtils.js";

const DEFAULT_SEARCH_DAYS = 7;
const DEFAULT_STEP_MINUTES = 60;
const DEFAULT_BUFFER_MINUTES = 30;

const buildDayStart = (date, workingStartTime) => {
  const [hour, minute] = workingStartTime.split(":").map(Number);
  const dayStart = new Date(date);
  dayStart.setHours(hour, minute, 0, 0);
  return dayStart;
};

const buildDayEnd = (date, workingEndTime) => {
  const [hour, minute] = workingEndTime.split(":").map(Number);
  const dayEnd = new Date(date);
  dayEnd.setHours(hour, minute, 0, 0);
  return dayEnd;
};

const getProviderBookings = async (providerId, excludeBookingId) => {
  return Booking.find({
    providerId,
    _id: { $ne: excludeBookingId },
    bookingStatus: {
      $in: [
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.STARTED,
        BOOKING_STATUS.DELAYED,
        BOOKING_STATUS.RESCHEDULING_REQUIRED,
        BOOKING_STATUS.RESCHEDULED
      ]
    }
  }).sort({ scheduledStartTime: 1 });
};

const isSlotFree = (slotStart, slotEnd, existingBookings) => {
  return !existingBookings.some((booking) =>
    hasTimeOverlap(
      slotStart,
      slotEnd,
      booking.scheduledStartTime,
      booking.scheduledEndTime
    )
  );
};

export const generateRescheduleSlots = async ({
  bookingId,
  workingStartTime = "08:00",
  workingEndTime = "18:00",
  searchDays = DEFAULT_SEARCH_DAYS,
  stepMinutes = DEFAULT_STEP_MINUTES,
  bufferMinutes = DEFAULT_BUFFER_MINUTES
}) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const existingBookings = await getProviderBookings(booking.providerId, booking._id);

  const requiredDurationHours =
    booking.predictedActualDurationHours || booking.estimatedDurationHours || 2;

  const suggestedSlots = [];

  const searchStartDate = new Date(booking.scheduledStartTime);

  for (let dayIndex = 0; dayIndex < searchDays; dayIndex += 1) {
    const currentDay = new Date(searchStartDate);
    currentDay.setDate(currentDay.getDate() + dayIndex);

    let cursor = buildDayStart(currentDay, workingStartTime);
    const dayEnd = buildDayEnd(currentDay, workingEndTime);

    while (cursor < dayEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = addHours(slotStart, requiredDurationHours);

      if (slotEnd <= dayEnd && isSlotFree(slotStart, slotEnd, existingBookings)) {
        suggestedSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          label: formatSlotLabel(slotStart, slotEnd)
        });
      }

      if (suggestedSlots.length >= 3) break;

      cursor = addMinutes(cursor, stepMinutes + bufferMinutes);
    }

    if (suggestedSlots.length >= 3) break;
  }

  const suggestion = await RescheduleSuggestion.create({
    bookingId: booking._id,
    affectedBookingId: booking._id,
    providerId: booking.providerId,
    customerId: booking.customerId,
    originalStartTime: booking.scheduledStartTime,
    originalEndTime: booking.scheduledEndTime,
    requiredDurationHours,
    suggestedSlots,
    reason: booking.conflictStatus === "affected"
      ? "This booking was affected by another delayed service"
      : "Schedule conflict detected"
  });

  return suggestion;
};

export const respondToRescheduleSuggestion = async ({
  suggestionId,
  response,
  selectedSlot
}) => {
  const suggestion = await RescheduleSuggestion.findById(suggestionId);

  if (!suggestion) {
    const error = new Error("Reschedule suggestion not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["accepted", "rejected"].includes(response)) {
    const error = new Error("Response must be accepted or rejected");
    error.statusCode = 400;
    throw error;
  }

  suggestion.customerResponse = response;

  if (response === "rejected") {
    suggestion.status = "rejected";
    await suggestion.save();

    return {
      suggestion,
      booking: null
    };
  }

  if (!selectedSlot || !selectedSlot.startTime || !selectedSlot.endTime) {
    const error = new Error("selectedSlot with startTime and endTime is required when accepting");
    error.statusCode = 400;
    throw error;
  }

  suggestion.selectedSlot = {
    startTime: selectedSlot.startTime,
    endTime: selectedSlot.endTime,
    label: selectedSlot.label || formatSlotLabel(selectedSlot.startTime, selectedSlot.endTime)
  };

  suggestion.status = "confirmed";
  await suggestion.save();

  const booking = await Booking.findByIdAndUpdate(
    suggestion.bookingId,
    {
      scheduledStartTime: selectedSlot.startTime,
      scheduledEndTime: selectedSlot.endTime,
      bookingStatus: BOOKING_STATUS.RESCHEDULED,
      reschedulingRequired: false,
      conflictStatus: "none"
    },
    { new: true }
  );

  return {
    suggestion,
    booking
  };
};

export const getRescheduleSuggestionsByBooking = async (bookingId) => {
  return RescheduleSuggestion.find({ bookingId }).sort({ createdAt: -1 });
};