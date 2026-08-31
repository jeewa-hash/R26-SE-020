import Feedback from "../models/feedbackModel.js";
import axios from "axios";

const coordinationBaseUrl =
  process.env.SERVICE_COORDINATION_URL || "http://localhost:5010";

const getCompletedBookingForFeedback = async (bookingId, authorization) => {
  if (!authorization?.startsWith("Bearer ")) {
    const error = new Error("Authorization token is required");
    error.status = 401;
    throw error;
  }

  try {
    const response = await axios.get(
      `${coordinationBaseUrl}/bookings/${bookingId}`,
      { headers: { Authorization: authorization } }
    );
    const booking = response.data?.data;

    if (!booking || booking.bookingStatus !== "COMPLETED") {
      const error = new Error("Feedback can only be submitted for a completed booking");
      error.status = 400;
      throw error;
    }

    return booking;
  } catch (error) {
    if (error.status) throw error;

    const status = error.response?.status;
    const message = error.response?.data?.message || "Unable to verify the booking";
    const verificationError = new Error(message);
    verificationError.status = status || 502;
    throw verificationError;
  }
};

/* =========================
   CREATE FEEDBACK
========================= */
export const createFeedback = async (req, res) => {
  try {
    const {
      bookingId,
      rating,
      reviewText,
      recommendation,
      isAnonymous,
      images
    } = req.body;

    if (!bookingId || rating === undefined || !reviewText?.trim()) {
      return res.status(400).json({
        success: false,
        message: "bookingId, rating, and reviewText are required"
      });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating must be an integer from 1 to 5"
      });
    }

    if (reviewText.trim().length < 10 || reviewText.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "reviewText must contain 10 to 500 characters"
      });
    }

    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: "Feedback has already been submitted for this booking"
      });
    }

    const booking = await getCompletedBookingForFeedback(
      bookingId,
      req.headers.authorization
    );

    const feedback = new Feedback({
      bookingId: String(booking._id),
      // Do not trust provider/service/user IDs sent by the client.
      serviceId: String(booking._id),
      providerId: String(booking.providerId),
      userId: String(booking.seekerId),
      rating: numericRating,
      reviewText: reviewText.trim(),
      recommendation,
      isAnonymous,
      images: images || []
    });

    await feedback.save();

    return res.status(201).json({
      success: true,
      message: "Feedback created successfully",
      data: feedback
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Feedback has already been submitted for this booking"
      });
    }

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

/* =========================
   GET ALL FEEDBACKS
========================= */
export const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

/* =========================
   GET BY PROVIDER
========================= */
export const getProviderFeedback = async (req, res) => {
  try {
    const { providerId } = req.params;

    const feedbacks = await Feedback.find({ providerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =========================
   GET BY SERVICE
========================= */
export const getServiceFeedback = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const feedbacks = await Feedback.find({ serviceId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =========================
   UPDATE FEEDBACK
========================= */
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Feedback.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: updated
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =========================
   DELETE FEEDBACK
========================= */
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Feedback.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =========================
   CHECK FEEDBACK BY BOOKING
========================= */
export const getBookingFeedbackStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const feedback = await Feedback.findOne({ bookingId }).select("_id");

    return res.status(200).json({
      success: true,
      hasReviewed: Boolean(feedback)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
