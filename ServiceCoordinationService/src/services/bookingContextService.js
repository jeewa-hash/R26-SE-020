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
        "IN_PROGRESS",
        "DELAY_REPORTED",
        "RESCHEDULING_REQUIRED",
        "RESCHEDULED",
      ],
    },
    endTime: {
      $lte: requestedStartTime,
    },
  }).sort({ endTime: -1 });

  return previousBookings[0] || null;
}