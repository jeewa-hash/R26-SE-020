import Feedback from "../models/feedbackModel.js";

/* =========================
   CREATE FEEDBACK
========================= */
export const createFeedback = async (req, res) => {
  try {
    const {
      serviceId,
      providerId,
      userId,
      rating,
      reviewText,
      recommendation,
      isAnonymous,
      images
    } = req.body;

    if (!serviceId || !providerId || !rating || !reviewText) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const feedback = new Feedback({
      serviceId,
      providerId,
      userId,
      rating,
      reviewText,
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
    return res.status(500).json({
      success: false,
      message: "Server error"
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