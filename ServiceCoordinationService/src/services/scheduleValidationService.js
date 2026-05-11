import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import {
  timeToMinutes,
  hasTimeOverlap,
  getDayName,
} from "../utils/timeUtils.js";

export async function validateProviderSchedule({
  providerId,
  requestedDate,
  requestedStartTime,
  requestedEndTime,
}) {
  const availability = await ProviderAvailability.findOne({ providerId });

  if (!availability) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider availability is not configured",
      providerBookingsToday: 0,
    };
  }

  if (!availability.isActive) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider is not active",
      providerBookingsToday: 0,
    };
  }

  const requestedDay = getDayName(requestedDate);

  if (!availability.availableDays.includes(requestedDay)) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: `Provider is not available on ${requestedDay}`,
      providerBookingsToday: 0,
    };
  }

  const requestStart = timeToMinutes(requestedStartTime);
  const requestEnd = timeToMinutes(requestedEndTime);
  const workingStart = timeToMinutes(availability.workingHours.start);
  const workingEnd = timeToMinutes(availability.workingHours.end);

  if (requestStart < workingStart || requestEnd > workingEnd) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Requested time is outside provider working hours",
      providerBookingsToday: 0,
    };
  }

  const unavailableConflict = availability.unavailableSlots.find((slot) => {
    return (
      slot.date === requestedDate &&
      hasTimeOverlap(
        requestedStartTime,
        requestedEndTime,
        slot.startTime,
        slot.endTime
      )
    );
  });

  if (unavailableConflict) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Requested time overlaps with provider unavailable slot",
      providerBookingsToday: 0,
    };
  }

  const providerBookingsToday = await Booking.find({
    providerId,
    scheduledDate: requestedDate,
    bookingStatus: {
      $in: [
        "CONFIRMED",
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULING_REQUIRED",
        "RESCHEDULED",
      ],
    },
  });

  if (providerBookingsToday.length >= availability.maxBookingsPerDay) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider has reached maximum bookings for this day",
      providerBookingsToday: providerBookingsToday.length,
    };
  }

  const bookingConflict = providerBookingsToday.find((booking) => {
    return hasTimeOverlap(
      requestedStartTime,
      requestedEndTime,
      booking.startTime,
      booking.endTime
    );
  });

  if (bookingConflict) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Requested time overlaps with an existing booking",
      providerBookingsToday: providerBookingsToday.length,
    };
  }

  return {
    isValid: true,
    validationStatus: "VALIDATED",
    message: "Provider schedule is available",
    providerBookingsToday: providerBookingsToday.length,
  };
}