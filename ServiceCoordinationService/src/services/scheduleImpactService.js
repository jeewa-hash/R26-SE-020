import Booking from "../models/Booking.js";

export const analyzeScheduleImpact = async ({
  providerId,
  currentBookingId,
  updatedExpectedEndTime
}) => {
  const futureBookings = await Booking.find({
    providerId,
    _id: { $ne: currentBookingId },
    bookingStatus: {
      $in: ["pending", "confirmed", "started", "delayed", "rescheduled"]
    },
    scheduledStartTime: {
      $gte: new Date()
    }
  }).sort({ scheduledStartTime: 1 });

  const affectedBookings = futureBookings.filter((booking) => {
    return new Date(updatedExpectedEndTime) > new Date(booking.scheduledStartTime);
  });

  return {
    conflictDetected: affectedBookings.length > 0,
    reschedulingRequired: affectedBookings.length > 0,
    affectedBookings: affectedBookings.map((booking) => ({
      bookingId: booking._id,
      customerId: booking.customerId,
      scheduledStartTime: booking.scheduledStartTime,
      scheduledEndTime: booking.scheduledEndTime,
      serviceCategory: booking.serviceCategory,
      serviceSubCategory: booking.serviceSubCategory
    }))
  };
};