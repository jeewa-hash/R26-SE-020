import Booking from "../models/Booking.js";

const canAccessBooking = (req, booking) => {
  if (req.user.role === "Admin") return true;
  if (req.user.role === "ServiceProvider") return booking.providerId.toString() === req.user.id;
  if (req.user.role === "Seeker") return booking.seekerId.toString() === req.user.id;
  return false;
};

export const getBookingsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (req.user.role === "ServiceProvider" && req.user.id !== providerId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own provider bookings",
      });
    }

    const bookings = await Booking.find({ providerId }).sort({
      scheduledDate: 1,
      startTime: 1,
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider bookings",
      error: error.message,
    });
  }
};

export const getBookingsBySeeker = async (req, res) => {
  try {
    const { seekerId } = req.params;

    if (req.user.role === "Seeker" && req.user.id !== seekerId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own seeker bookings",
      });
    }

    const bookings = await Booking.find({ seekerId }).sort({
      scheduledDate: 1,
      startTime: 1,
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get seeker bookings",
      error: error.message,
    });
  }
};

export const getBookingByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const booking = await Booking.findOne({ postId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this post",
      });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get booking by post",
      error: error.message,
    });
  }
};

export const startBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.providerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned provider can start this booking",
      });
    }

    if (booking.bookingStatus !== "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be started",
        currentStatus: booking.bookingStatus,
      });
    }

    booking.bookingStatus = "IN_PROGRESS";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking started successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to start booking",
      error: error.message,
    });
  }
};

export const completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
      });
    }

    if (!["IN_PROGRESS", "DELAY_REPORTED", "RESCHEDULED"].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only in-progress, delayed, or rescheduled bookings can be completed",
        currentStatus: booking.bookingStatus,
      });
    }

    booking.bookingStatus = "COMPLETED";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking completed successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to complete booking",
      error: error.message,
    });
  }
};

export const reportBookingDelay = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const { delayReason = "", additionalDelayMins = 0 } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!canAccessBooking(req, booking)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this booking",
      });
    }

    if (!["CONFIRMED", "IN_PROGRESS", "RESCHEDULED"].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Delay can only be reported for confirmed, in-progress, or rescheduled bookings",
        currentStatus: booking.bookingStatus,
      });
    }

    booking.bookingStatus = "DELAY_REPORTED";

    booking.delayInfo = {
      delayReason,
      additionalDelayMins,
      reportedBy: req.user.role === "ServiceProvider" ? "PROVIDER" : "SEEKER",
      reportedAt: new Date(),
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Delay reported successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to report booking delay",
      error: error.message,
    });
  }
};
