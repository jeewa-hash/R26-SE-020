import Booking from "../models/Booking.js";

export const getBookingsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

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