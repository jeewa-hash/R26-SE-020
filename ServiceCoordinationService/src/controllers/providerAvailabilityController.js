import ProviderAvailability from "../models/ProviderAvailability.js";

const buildSlot = (body) => {
  const { date, startTime, endTime, notes = "", isAvailable = true, slotType = "AVAILABLE" } = body;
  const startDateTime = body.startDateTime ? new Date(body.startDateTime) : new Date(`${date}T${startTime}:00`);
  const endDateTime = body.endDateTime ? new Date(body.endDateTime) : new Date(`${date}T${endTime}:00`);
  return { date, startTime, endTime, startDateTime, endDateTime, notes, isAvailable, slotType };
};

const validateSlot = (slot) => {
  if (!slot.date || !slot.startTime || !slot.endTime) return "date, startTime and endTime are required";
  if (Number.isNaN(slot.startDateTime.getTime()) || Number.isNaN(slot.endDateTime.getTime())) return "Invalid availability date or time";
  if (slot.endDateTime <= slot.startDateTime) return "End time must be after start time";
  return "";
};

const hasOverlap = (slots, candidate, ignoredId = null) => slots.some((slot) =>
  slot.isAvailable && String(slot._id) !== String(ignoredId || "") &&
  candidate.startDateTime < new Date(slot.endDateTime) && candidate.endDateTime > new Date(slot.startDateTime)
);

const validateWeeklyAvailability = (week) => {
  if (!Array.isArray(week)) return "weeklyAvailability must be an array";
  for (const entry of week) {
    if (!entry?.day || typeof entry.isAvailable !== "boolean" || !Array.isArray(entry.slots)) {
      return "Each weekly availability entry requires day, isAvailable and slots";
    }
    for (const slot of entry.slots) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime || "")) {
        return `Invalid time slot for ${entry.day}`;
      }
      if (slot.endTime <= slot.startTime) return `${entry.day} end time must be after start time`;
    }
    if (entry.isAvailable && entry.slots.length === 0) return `${entry.day} requires at least one time slot when enabled`;
  }
  return "";
};

export const upsertProviderAvailability = async (req, res) => {
  try {
    const {
      availableDays,
      workingHours,
      unavailableSlots = [],
      maxBookingsPerDay = 3,
      isActive = true,
      isAvailable = isActive,
      weeklyAvailability = [],
    } = req.body;

    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    if (!Array.isArray(availableDays)) {
      return res.status(400).json({
        success: false,
        message: "availableDays must be an array",
      });
    }

    if (!workingHours?.start || !workingHours?.end) {
      return res.status(400).json({
        success: false,
        message: "workingHours.start and workingHours.end are required",
      });
    }

    const weeklyError = validateWeeklyAvailability(weeklyAvailability);
    if (weeklyError) return res.status(400).json({ success: false, message: weeklyError });

    const availability = await ProviderAvailability.findOneAndUpdate(
      { providerId },
      {
        providerId,
        availableDays,
        workingHours,
        unavailableSlots,
        maxBookingsPerDay,
        isActive: Boolean(isAvailable),
        isAvailable: Boolean(isAvailable),
        weeklyAvailability,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
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
    const providerId = req.params.providerId || req.user?.id;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    if (
      req.user?.role === "ServiceProvider" &&
      req.user.id.toString() !== providerId.toString()
    ) {
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

export const createAvailabilitySlot = async (req, res) => {
  try {
    const providerId = req.user?.id || req.body.providerId;
    if (!providerId) return res.status(400).json({ success: false, message: "providerId is required" });
    const slot = buildSlot(req.body);
    const validationError = validateSlot(slot);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    let availability = await ProviderAvailability.findOne({ providerId });
    if (!availability) availability = new ProviderAvailability({ providerId, availableDays: [], workingHours: { start: "00:00", end: "23:59" } });
    if (hasOverlap(availability.availableSlots || [], slot)) return res.status(409).json({ success: false, message: "This availability slot overlaps with an existing slot." });
    availability.availableSlots.push(slot);
    await availability.save();
    return res.status(201).json({ success: true, message: "Availability slot added successfully", data: availability });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to add availability slot", error: error.message });
  }
};

export const updateAvailabilitySlot = async (req, res) => {
  try {
    const availability = await ProviderAvailability.findOne({ providerId: req.user?.id });
    const slot = availability?.availableSlots?.id(req.params.availabilityId);
    if (!availability || !slot) return res.status(404).json({ success: false, message: "Availability slot not found" });
    const updated = buildSlot({ ...slot.toObject(), ...req.body });
    const validationError = validateSlot(updated);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    if (hasOverlap(availability.availableSlots, updated, slot._id)) return res.status(409).json({ success: false, message: "This availability slot overlaps with an existing slot." });
    Object.assign(slot, updated);
    await availability.save();
    return res.json({ success: true, message: "Availability slot updated successfully", data: availability });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update availability slot", error: error.message });
  }
};

export const deleteAvailabilitySlot = async (req, res) => {
  try {
    const availability = await ProviderAvailability.findOne({ providerId: req.user?.id });
    const slot = availability?.availableSlots?.id(req.params.availabilityId);
    if (!availability || !slot) return res.status(404).json({ success: false, message: "Availability slot not found" });
    slot.deleteOne();
    await availability.save();
    return res.json({ success: true, message: "Availability slot deleted successfully", data: availability });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete availability slot", error: error.message });
  }
};

export const updateAvailabilityStatus = async (req, res) => {
  try {
    const providerId = req.user?.id;
    if (!providerId || typeof req.body.isAvailable !== "boolean") return res.status(400).json({ success: false, message: "isAvailable boolean is required" });
    const availability = await ProviderAvailability.findOneAndUpdate(
      { providerId },
      { $set: { isActive: req.body.isAvailable, isAvailable: req.body.isAvailable }, $setOnInsert: { providerId, availableDays: [], workingHours: { start: "00:00", end: "23:59" } } },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json({ success: true, message: req.body.isAvailable ? "You are now available" : "You are now unavailable", data: availability });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update availability status", error: error.message });
  }
};
