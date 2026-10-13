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
  excludeBookingId = null,
}) {
  const expiryCutoff = new Date(Date.now() - 45 * 60 * 1000);
  await Booking.updateMany(
    {
      providerId,
      bookingStatus: { $in: ["CONFIRMED", "RESCHEDULED", "ON_THE_WAY"] },
      actualStartTime: null,
      scheduledStartTime: { $ne: null, $lt: expiryCutoff },
    },
    {
      $set: { bookingStatus: "EXPIRED", expiredAt: new Date() },
      $push: { timeline: { status: "EXPIRED", message: "Booking expired because it was not started within 45 minutes", at: new Date() } },
    }
  );

  let availability = await ProviderAvailability.findOne({ providerId });
  let availabilityWarning = "";

  if (!availability) {
    availabilityWarning = "Provider availability is not fully configured. Schedule check used existing bookings only.";
    availability = {
      isActive: true,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      workingHours: { start: "00:00", end: "23:59" },
      unavailableSlots: [],
      availableSlots: [],
      maxBookingsPerDay: Number.MAX_SAFE_INTEGER,
    };
  }

  if (availability.isActive === false || availability.isAvailable === false) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider is not active",
      providerBookingsToday: 0,
    };
  }

  const configuredSlots = (availability.availableSlots || []).filter((slot) => slot.isAvailable && slot.date === requestedDate);
  const requestedDay = getDayName(requestedDate);
  const weeklyDay = (availability.weeklyAvailability || []).find((item) => item.day === requestedDay);

  if (configuredSlots.length > 0) {
    const containingSlot = configuredSlots.find((slot) => requestedStartTime >= slot.startTime && requestedEndTime <= slot.endTime);
    if (!containingSlot) return { isValid: false, validationStatus: "CONFLICT", message: "Provider is not available at the proposed time.", providerBookingsToday: 0 };
  } else if (weeklyDay) {
    if (!weeklyDay.isAvailable) {
      return { isValid: false, validationStatus: "CONFLICT", message: `Provider is not available on ${requestedDay}`, providerBookingsToday: 0 };
    }
    const containingWeeklySlot = (weeklyDay.slots || []).find((slot) => requestedStartTime >= slot.startTime && requestedEndTime <= slot.endTime);
    if (!containingWeeklySlot) {
      return { isValid: false, validationStatus: "CONFLICT", message: "Provider is not available at the proposed time.", providerBookingsToday: 0 };
    }
  } else if (!availability.availableDays.includes(requestedDay)) {
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

  if (configuredSlots.length === 0 && !weeklyDay && (requestStart < workingStart || requestEnd > workingEnd)) {
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
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
    scheduledDate: requestedDate,
    bookingStatus: {
      $in: [
        "CONFIRMED",
        "ON_THE_WAY",
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULE_REQUESTED",
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
    validationStatus: availabilityWarning ? "VALIDATED_WITH_CAUTION" : "VALIDATED",
    message: availabilityWarning || "Provider is available at the proposed time.",
    providerBookingsToday: providerBookingsToday.length,
  };
}
