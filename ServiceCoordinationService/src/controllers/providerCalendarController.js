import Booking from "../models/Booking.js";
import ProviderAvailability from "../models/ProviderAvailability.js";

export const getProviderCalendar = async (req, res) => {
  try {
    // Logged-in provider from JWT
    const providerId = req.user.id;

    const { startDate, endDate } = req.query;

    const query = {
      providerId,
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
    };

    if (startDate || endDate) {
      query.scheduledDate = {};

      if (startDate) {
        query.scheduledDate.$gte = startDate;
      }

      if (endDate) {
        query.scheduledDate.$lte = endDate;
      }
    }

    const bookings = await Booking.find(query).sort({
      scheduledDate: 1,
      startTime: 1,
    });

    const calendarEvents = bookings.map((booking) => ({
      bookingId: booking._id,
      title: "Service Booking",
      date: booking.scheduledDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.bookingStatus,
      riskLevel: booking.delayRiskLevel,
      location: booking.location,
    }));

    return res.status(200).json({
      success: true,
      count: calendarEvents.length,
      data: calendarEvents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider calendar",
      error: error.message,
    });
  }
};

export const getSeekerCalendar = async (req, res) => {
  try {
    const seekerId = req.user.id;
    const { startDate, endDate } = req.query;

    const query = {
      seekerId,
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
    };

    if (startDate || endDate) {
      query.scheduledDate = {};

      if (startDate) query.scheduledDate.$gte = startDate;
      if (endDate) query.scheduledDate.$lte = endDate;
    }

    const bookings = await Booking.find(query).sort({
      scheduledDate: 1,
      startTime: 1,
    });

    const calendarEvents = bookings.map((booking) => ({
      bookingId: booking._id,
      title: "Service Booking",
      date: booking.scheduledDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.bookingStatus,
      riskLevel: booking.delayRiskLevel,
      providerId: booking.providerId,
      postId: booking.postId,
      location: booking.location,
    }));

    return res.status(200).json({
      success: true,
      count: calendarEvents.length,
      data: calendarEvents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch seeker calendar",
      error: error.message,
    });
  }
};
