import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";
import { predictDelayRisk } from "../services/mlService.js";
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
  distanceFromPreviousBookingKm = 0, // distance from last booking
  estimatedTravelTimeMins = 0,       // travel time
  urgency = "medium",                // needed for ML mapping
}) {
  const availability = await ProviderAvailability.findOne({ providerId });

  if (!availability) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider availability is not configured",
    };
  }

  if (!availability.isActive) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: "Provider is not active",
    };
  }

  const requestedDay = getDayName(requestedDate);

  if (!availability.availableDays.includes(requestedDay)) {
    return {
      isValid: false,
      validationStatus: "CONFLICT",
      message: `Provider is not available on ${requestedDay}`,
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
    };
  }

  // =========================
  // GAP CALCULATION
  // =========================

  let gapBetweenBookingsMins = 999; // default (no previous booking)

  if (providerBookingsToday.length > 0) {
    // get latest booking before requested slot
    const previousBooking = providerBookingsToday
      .filter(
        (b) => timeToMinutes(b.endTime) <= requestStart
      )
      .sort(
        (a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime)
      )[0];

    if (previousBooking) {
      gapBetweenBookingsMins =
        requestStart - timeToMinutes(previousBooking.endTime);
    }
  }

  // =========================
  // ML PAYLOAD
  // =========================

  const mlPayload = {
    expertiseMatch: 1, // improve later
    taskPriority:
      urgency === "high" ? 3 :
      urgency === "medium" ? 2 : 1,
    taskDuration:
      (requestEnd - requestStart) / 60,
    distanceBetweenBookingsKm,
    estimatedTravelTimeMins,
    gapBetweenBookingsMins,
    providerBookingsToday: providerBookingsToday.length,
    taskCompleted: 1,
  };

  // =========================
  // ML CALL
  // =========================

  const mlResult = await predictDelayRisk(mlPayload);

  let riskLevel = "UNKNOWN";
  let riskScore = 0;
  let validationStatus = "VALIDATED";
  let message = "Provider schedule is available";

  if (mlResult) {
    riskLevel = mlResult.riskLevel;
    riskScore = mlResult.riskScore;

    if (riskLevel === "HIGH") {
      validationStatus = "HIGH_RISK";
      message = mlResult.recommendation;
    } else if (riskLevel === "MEDIUM") {
      validationStatus = "WARNING";
      message = mlResult.recommendation;
    }
  }

  return {
    isValid: true,
    validationStatus,
    riskLevel,
    riskScore,
    message,
    providerBookingsToday: providerBookingsToday.length,
    gapFromPreviousBookingMins: gapBetweenBookingsMins,
    distanceFromPreviousBookingKm,
    estimatedTravelTimeMins,
  };
}