import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";

export const getProviderCalendar = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    // Get provider general availability
    const availability = await ProviderAvailability.findOne({ providerId });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Provider availability not found",
      });
    }

    const bookingFilter = {
      providerId,
      bookingStatus: {
        $in: [
          "CONFIRMED",
          "IN_PROGRESS",
          "DELAY_REPORTED",
          "RESCHEDULING_REQUIRED",
          "RESCHEDULED",
          "COMPLETED",
        ],
      },
    };

    // Filter bookings by date range if provided
    if (startDate && endDate) {
      bookingFilter.scheduledDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const bookings = await Booking.find(bookingFilter).sort({
      scheduledDate: 1,
      startTime: 1,
    });

    // Convert bookings into calendar events
    const bookingEvents = bookings.map((booking) => ({
      type: "BOOKING",
      title: "Service Booking",
      bookingId: booking._id,
      postId: booking.postId,
      seekerId: booking.seekerId,
      providerId: booking.providerId,
      date: booking.scheduledDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.bookingStatus,
      estimatedDurationHours: booking.estimatedDurationHours,
      riskLevel: booking.delayRiskLevel,
      riskScore: booking.delayRiskScore,
      location: booking.location,
      distanceFromPreviousBookingKm: booking.distanceFromPreviousBookingKm,
      estimatedTravelTimeMins: booking.estimatedTravelTimeMins,
      gapFromPreviousBookingMins: booking.gapFromPreviousBookingMins,
    }));

    // Convert manual unavailable slots into calendar events
    const unavailableEvents = availability.unavailableSlots
      .filter((slot) => {
        if (!startDate || !endDate) return true;

        return slot.date >= startDate && slot.date <= endDate;
      })
      .map((slot) => ({
        type: "UNAVAILABLE",
        title: slot.reason || "Unavailable",
        providerId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        reason: slot.reason,
      }));

    const events = [...bookingEvents, ...unavailableEvents].sort((a, b) => {
      if (a.date === b.date) {
        return a.startTime.localeCompare(b.startTime);
      }

      return a.date.localeCompare(b.date);
    });

    return res.status(200).json({
      success: true,
      data: {
        providerId,
        availableDays: availability.availableDays,
        workingHours: availability.workingHours,
        maxBookingsPerDay: availability.maxBookingsPerDay,
        isActive: availability.isActive,
        events,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider calendar",
      error: error.message,
    });
  }
};