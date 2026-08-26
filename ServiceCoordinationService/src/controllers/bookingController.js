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

    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.providerId.toString() !== providerId.toString()) {
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

export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("acceptedRescheduleRequests")
      .lean();

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

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get booking details",
      error: error.message,
    });
  }
};

/**
 * Cancel a booking
 * Records whether cancelled by PROVIDER or SEEKER.
 * Seeker cancellations are marked as NOT_REQUIRED so they NEVER penalize the provider!
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason = "" } = req.body;

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

    if (["COMPLETED", "CANCELLED"].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled because it is already ${booking.bookingStatus.toLowerCase()}`,
      });
    }

    const cancelledBy =
      req.user.role === "ServiceProvider"
        ? "PROVIDER"
        : req.user.role === "Seeker"
        ? "SEEKER"
        : "ADMIN";

    // If cancelled by Seeker, inquiry is NOT_REQUIRED (Provider will not be penalized!)
    const inquiryStatus = cancelledBy === "PROVIDER" ? "NOT_SUBMITTED" : "NOT_REQUIRED";

    booking.bookingStatus = "CANCELLED";
    booking.cancellationInfo = {
      cancelledBy,
      cancellationReason: reason,
      cancelledAt: new Date(),
      inquiryStatus,
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking cancelled successfully by ${cancelledBy.toLowerCase()}`,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};

/**
 * Helper to check if booking is 24 hours overdue past scheduled end time
 */
const isBookingOverdue24Hours = (b) => {
  try {
    if (!b.scheduledDate) return false;
    let dateTimeStr = b.scheduledDate;
    if (b.startTime) {
      dateTimeStr += " " + b.startTime;
    } else {
      dateTimeStr += " 00:00";
    }
    const startTimeMs = new Date(dateTimeStr).getTime();
    if (isNaN(startTimeMs)) {
      if (b.createdAt) {
        return Date.now() - new Date(b.createdAt).getTime() > 24 * 60 * 60 * 1000;
      }
      return false;
    }
    const durationHours = b.estimatedDurationHours || 1;
    const deadlineMs = startTimeMs + durationHours * 60 * 60 * 1000 + 24 * 60 * 60 * 1000;
    return Date.now() >= deadlineMs;
  } catch (e) {
    return false;
  }
};

/**
 * Get provider cancelled bookings requiring inquiry
 * Includes:
 * 1. Normal cancellations by provider
 * 2. Bookings that were rescheduled and then cancelled
 * 3. Rescheduled bookings where provider ignored / did not attend (past 24h of rescheduled duration)
 * 4. Bookings left uncompleted (CONFIRMED, DELAY_REPORTED, IN_PROGRESS, RESCHEDULING_REQUIRED) after 24h past duration
 * Excludes: Seeker cancellations, approved inquiries, and upcoming active rescheduled bookings
 */
export const getProviderMissedInquiries = async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const allProviderBookings = await Booking.find({
      providerId,
      bookingStatus: {
        $in: [
          "CANCELLED",
          "CONFIRMED",
          "DELAY_REPORTED",
          "IN_PROGRESS",
          "RESCHEDULING_REQUIRED",
          "RESCHEDULED",
        ],
      },
      "cancellationInfo.cancelledBy": { $ne: "SEEKER" },
      "cancellationInfo.inquiryStatus": { $ne: "APPROVED" },
    }).sort({ scheduledDate: -1, createdAt: -1 });

    const missedBookings = [];

    for (const b of allProviderBookings) {
      if (b.bookingStatus === "CANCELLED") {
        if (b.cancellationInfo?.cancelledBy === "PROVIDER" || !b.cancellationInfo?.cancelledBy) {
          missedBookings.push(b);
        }
      } else {
        // Check if 24 hours overdue past duration
        if (isBookingOverdue24Hours(b)) {
          // Auto-mark as CANCELLED in DB
          b.bookingStatus = "CANCELLED";
          b.cancellationInfo = {
            cancelledBy: "PROVIDER",
            cancellationReason:
              b.bookingStatus === "RESCHEDULED"
                ? "Rescheduled booking not attended / ignored (Auto-cancelled after 24h past rescheduled duration)"
                : `Booking not completed within 24h past duration (Provider No-show - was ${b.bookingStatus})`,
            cancelledAt: new Date(),
            inquiryStatus: "NOT_SUBMITTED",
          };
          await b.save();
          missedBookings.push(b);
        }
      }
    }

    return res.status(200).json({
      success: true,
      count: missedBookings.length,
      data: missedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider missed inquiries",
      error: error.message,
    });
  }
};