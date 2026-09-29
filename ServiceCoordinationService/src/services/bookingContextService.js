import Booking from "../models/Booking.js";

export async function findPreviousProviderBooking({
  providerId,
  requestedDate,
  requestedStartTime,
}) {
  const previousBookings = await Booking.find({
    providerId,
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
        "EXPIRED",
      ],
    },
    startTime: {
      $lte: requestedStartTime,
    },
  }).sort({ startTime: -1 });

  const previous = previousBookings[0];
  if (!previous || previous.bookingStatus !== "EXPIRED") return previous || null;

  const effectiveEnd = previous.expiredAt || previous.scheduledStartTime;
  if (!effectiveEnd) return previous;
  const date = new Date(effectiveEnd);
  const pad = (value) => String(value).padStart(2, "0");
  return {
    ...previous.toObject(),
    endTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    effectiveEndTime: date,
  };
}
