import ProviderAvailability from "../models/ProviderAvailability.js";

export const upsertProviderAvailability = async (req, res) => {
  try {
    const {
      availableDays,
      workingHours,
      unavailableSlots = [],
      maxBookingsPerDay = 3,
      isActive = true,
    } = req.body;

    // Logged-in provider owns this availability record
    const providerId = req.user.id;

    if (!availableDays || !workingHours) {
      return res.status(400).json({
        success: false,
        message: "availableDays and workingHours are required",
      });
    }

    const availability = await ProviderAvailability.findOneAndUpdate(
      { providerId },
      {
        providerId,
        availableDays,
        workingHours,
        unavailableSlots,
        maxBookingsPerDay,
        isActive,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Provider availability saved successfully",
      data: availability,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save provider availability",
      error: error.message,
    });
  }
};

export const getProviderAvailability = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (req.user.role === "ServiceProvider" && req.user.id !== providerId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own availability",
      });
    }

    const availability = await ProviderAvailability.findOne({ providerId });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Provider availability not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider availability",
      error: error.message,
    });
  }
};
