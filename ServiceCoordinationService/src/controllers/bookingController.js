import Booking from "../models/Booking.js";
import mongoose from "mongoose";
import BidCoordination from "../models/BidCoordination.js";
import BidPriceEvaluation from "../models/BidPriceEvaluation.js";
import BidScheduleEvaluation from "../models/BidScheduleEvaluation.js";
import BidSuggestedSlot from "../models/BidSuggestedSlot.js";
import axios from "axios";
import {
  getProviderQuotationById,
  acceptProviderQuotation,
  updateProviderQuotationCoordination,
} from "../clients/providerServiceClient.js";

const canAccessBooking = (req, booking) => {
  if (req.user.role === "Admin") return true;
  if (req.user.role === "ServiceProvider") return booking.providerId.toString() === req.user.id;
  if (req.user.role === "Seeker") return booking.seekerId.toString() === req.user.id;
  return false;
};

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS", "DELAY_REPORTED"];

const getComparableId = (value) => value?.toString?.() || String(value || "");

const addMinutes = (date, minutes) => new Date(date.getTime() + Number(minutes || 0) * 60 * 1000);

const minutesBetween = (start, end) => Math.round((end.getTime() - start.getTime()) / 60000);

const getBookingStartDate = (booking) => {
  if (booking.scheduledStartTime) {
    const scheduledStartTime = new Date(booking.scheduledStartTime);
    if (!Number.isNaN(scheduledStartTime.getTime())) return scheduledStartTime;
  }

  if (booking.scheduledDate && booking.startTime) {
    const fallbackStartTime = new Date(`${booking.scheduledDate}T${booking.startTime}:00`);
    if (!Number.isNaN(fallbackStartTime.getTime())) return fallbackStartTime;
  }

  return null;
};

const getOngoingWindowEnd = () => addMinutes(new Date(), 24 * 60);

const buildOngoingQuery = (ownerField, ownerId) => ({
  [ownerField]: ownerId,
  bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  $or: [
    { bookingStatus: { $in: ["IN_PROGRESS", "DELAY_REPORTED"] } },
    {
      bookingStatus: "CONFIRMED",
      scheduledStartTime: { $lte: getOngoingWindowEnd() },
    },
    {
      bookingStatus: "CONFIRMED",
      scheduledStartTime: null,
    },
  ],
});

const calculateReminderFlags = (booking) => {
  const start = getBookingStartDate(booking);
  if (!start || booking.bookingStatus !== "CONFIRMED") {
    return {
      reminderDue: false,
      startsWithin15Minutes: false,
      startTimePassed: false,
      minutesUntilStart: null,
    };
  }

  const minutesUntilStart = minutesBetween(new Date(), start);

  return {
    reminderDue: !booking.reminderSentAt && minutesUntilStart >= 0 && minutesUntilStart <= 15,
    startsWithin15Minutes: minutesUntilStart >= 0 && minutesUntilStart <= 15,
    startTimePassed: minutesUntilStart < 0,
    minutesUntilStart,
  };
};

const attachReminderFlags = (booking) => {
  const plainBooking = booking?.toObject ? booking.toObject() : booking;
  return {
    ...plainBooking,
    reminder: calculateReminderFlags(plainBooking),
  };
};

const LIVE_SUMMARY_FIELDS = [
  "_id", "externalSessionId", "externalRequestQuotationId", "externalQuotationId",
  "seekerId", "providerId", "seekerSnapshot", "providerSnapshot", "serviceCategory",
  "serviceSubcategory", "serviceLocation", "location", "scheduledDate",
  "scheduledStartTime", "scheduledEndTime", "displayStartTime", "displayEndTime",
  "startTime", "endTime", "estimatedDurationHours", "finalAmount", "currency",
  "bookingStatus", "delayRiskLevel", "providerReadyConfirmed",
  "providerReadyConfirmedAt", "actualStartTime", "actualEndTime", "completedAt",
  "delayInfo", "timeline",
].join(" ");
const LIVE_SUMMARY_PROJECTION = Object.fromEntries(
  LIVE_SUMMARY_FIELDS.split(" ").map((field) => [field, 1])
);

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getNext15MinutesRange = () => {
  const now = new Date();
  return { now, next15: new Date(now.getTime() + 15 * 60 * 1000) };
};

const buildUserIdMatch = (fieldName, id) => {
  const values = [String(id)];
  if (mongoose.Types.ObjectId.isValid(id)) values.push(new mongoose.Types.ObjectId(id));
  return { [fieldName]: { $in: values } };
};

const buildOwnerMatch = (owner, id) => ({
  $or: [
    buildUserIdMatch(`${owner}Id`, id),
    buildUserIdMatch(`${owner}Snapshot.${owner}Id`, id),
  ],
});

const getLiveSummary = async (req, res, owner) => {
  try {
    const id = req.params[`${owner}Id`] || req.user?.id;
    if (!id) return res.status(400).json({ success: false, message: `${owner}Id is required` });

    const expectedRole = owner === "provider" ? "ServiceProvider" : "Seeker";
    if (req.user && req.user.role !== "Admin" &&
        (req.user.role !== expectedRole || String(req.user.id) !== String(id))) {
      return res.status(403).json({ success: false, message: "You can only view your own live summary" });
    }

    const ownerMatch = buildOwnerMatch(owner, id);
    const { start, end } = getTodayRange();
    const { now, next15 } = getNext15MinutesRange();
    const withStatus = (bookingStatus, extra = {}) => ({
      $and: [ownerMatch, { bookingStatus }, extra],
    });

    const [currentJob, delayedJob, nextBooking, startingSoonBooking, confirmedToday,
      inProgress, delayed, completedToday] = await Promise.all([
      Booking.collection.findOne(withStatus("IN_PROGRESS"), { projection: LIVE_SUMMARY_PROJECTION, sort: { actualStartTime: 1, scheduledStartTime: 1 } }),
      Booking.collection.findOne(withStatus("DELAY_REPORTED"), { projection: LIVE_SUMMARY_PROJECTION, sort: { "delayInfo.reportedAt": -1, scheduledStartTime: 1 } }),
      Booking.collection.findOne(withStatus("CONFIRMED", { scheduledStartTime: { $gte: now } }), { projection: LIVE_SUMMARY_PROJECTION, sort: { scheduledStartTime: 1 } }),
      Booking.collection.findOne(withStatus("CONFIRMED", { scheduledStartTime: { $gte: now, $lte: next15 } }), { projection: LIVE_SUMMARY_PROJECTION, sort: { scheduledStartTime: 1 } }),
      Booking.collection.countDocuments(withStatus("CONFIRMED", { scheduledStartTime: { $gte: start, $lte: end } })),
      Booking.collection.countDocuments(withStatus("IN_PROGRESS")),
      Booking.collection.countDocuments(withStatus("DELAY_REPORTED")),
      Booking.collection.countDocuments(withStatus("COMPLETED", { completedAt: { $gte: start, $lte: end } })),
    ]);

    const data = {
      ...(owner === "provider"
        ? { currentJob, delayedJob }
        : { currentService: currentJob, delayedService: delayedJob }),
      nextBooking,
      startingSoonBooking,
      counts: { confirmedToday, inProgress, delayed, completedToday },
      serverTime: new Date(),
    };
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get ${owner} live summary`, error: error.message });
  }
};

export const getProviderLiveSummary = (req, res) => getLiveSummary(req, res, "provider");
export const getProviderLiveSummaryByProviderId = getProviderLiveSummary;
export const getSeekerLiveSummary = (req, res) => getLiveSummary(req, res, "seeker");
export const getSeekerLiveSummaryBySeekerId = getSeekerLiveSummary;

export const getBookingsByProvider = async (req, res) => {
  try {
    const providerId = req.params.providerId || req.user?.id;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    if (req.user && req.user.role === "ServiceProvider" && req.user.id !== providerId.toString()) {
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
      data: bookings.map(attachReminderFlags),
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
    // ✅ If no seekerId in params, use the logged‑in user's ID
    let seekerId = req.params.seekerId;
    if (!seekerId && req.user?.role === "Seeker") {
      seekerId = req.user.id;
    }
    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "Seeker ID is required",
      });
    }

    // ✅ Ensure the user can only view their own bookings (unless admin)
    if (req.user?.role === "Seeker" && req.user.id !== seekerId) {
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
      data: bookings.map(attachReminderFlags),
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

export const createBookingFromCoordination = async (req, res) => {
  try {
    const { coordinationId } = req.params;

    const coordination = await BidCoordination.findById(coordinationId);

    if (!coordination) {
      return res.status(404).json({
        success: false,
        message: "Bid coordination not found",
      });
    }

    if (
      req.user.role === "Seeker" &&
      coordination.seekerId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only create bookings for your own coordinated bids",
      });
    }

    if (
      !["CAN_ACCEPT", "AVAILABLE_WITH_CAUTION"].includes(
        coordination.finalDecision
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This coordination is not ready for booking",
        finalDecision: coordination.finalDecision,
      });
    }

    if (coordination.status !== "ready_for_seeker_review") {
      return res.status(400).json({
        success: false,
        message: "This coordination is not available for booking",
        currentStatus: coordination.status,
      });
    }

    const scheduleEvaluation = await BidScheduleEvaluation.findOne({
      bidCoordinationId: coordination._id,
    });

    if (!scheduleEvaluation) {
      return res.status(404).json({
        success: false,
        message: "Schedule evaluation not found for this coordination",
      });
    }

    if (scheduleEvaluation.conflictDetected) {
      return res.status(400).json({
        success: false,
        message: "Cannot create booking because schedule conflict still exists",
        conflictReason: scheduleEvaluation.conflictReason,
      });
    }

    const priceEvaluation = await BidPriceEvaluation.findOne({
      bidCoordinationId: coordination._id,
    });

    if (!priceEvaluation) {
      return res.status(404).json({
        success: false,
        message: "Price evaluation not found for this coordination",
      });
    }

    const selectedSuggestedSlot = await BidSuggestedSlot.findOne({
      bidCoordinationId: coordination._id,
      status: "SELECTED",
    }); // Chaw: detects whether seeker selected a coordinated alternative slot

    const existingBooking = await Booking.findOne({
      bookingStatus: { $ne: "CANCELLED" },
      $or: [
        { bidCoordinationId: coordination._id },
        {
          externalSessionId: coordination.externalSessionId,
          externalQuotationId: coordination.externalQuotationId,
          seekerId: coordination.seekerId,
          providerId: coordination.providerId,
        },
      ],
    });

    if (existingBooking) {
      return res.status(200).json({
        success: true,
        message: "Booking already exists for this quotation.",
        data: existingBooking,
      });
    }

    const startDate = new Date(scheduleEvaluation.requiredWindowStart);
    const endDate = new Date(scheduleEvaluation.requiredWindowEnd);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule window in schedule evaluation",
      });
    }

    const pad = (value) => String(value).padStart(2, "0");

    const scheduledDate = `${startDate.getUTCFullYear()}-${pad(
      startDate.getUTCMonth() + 1
    )}-${pad(startDate.getUTCDate())}`;

    const startTime = `${pad(startDate.getUTCHours())}:${pad(
      startDate.getUTCMinutes()
    )}`;

    const endTime = `${pad(endDate.getUTCHours())}:${pad(
      endDate.getUTCMinutes()
    )}`;

    let quotation = null;
    try {
      quotation = await getProviderQuotationById(
        coordination.externalQuotationId
      );
    } catch (quotationError) {
      console.warn(
        "BOOKING PROVIDER SNAPSHOT WARNING:",
        quotationError.message
      );
    }

    const providerSnapshot = {
      providerId: quotation?.providerId || coordination.providerId,
      name:
        quotation?.providerSnapshot?.name ||
        quotation?.providerName ||
        "Service Provider",
      businessName:
        quotation?.providerSnapshot?.businessName ||
        quotation?.businessName ||
        "",
      phone: quotation?.providerSnapshot?.phone || "",
      district: quotation?.providerSnapshot?.district || "",
      profileImage: quotation?.providerSnapshot?.profileImage || "",
    };

    // Coordination Service has no local seeker profile lookup. Keep booking
    // creation resilient while still storing a readable fallback snapshot.
    const seekerSnapshot = {
      seekerId: coordination.seekerId,
      name: "Customer",
      phone: "",
      district: "",
    };

    const booking = await Booking.create({
      postId: null,
      providerRequestId: null,

      bidCoordinationId: coordination._id,
      externalSessionId: coordination.externalSessionId,
      externalRequestQuotationId: coordination.externalRequestQuotationId,
      externalQuotationId: coordination.externalQuotationId,

      seekerId: coordination.seekerId,
      providerId: coordination.providerId,
      seekerSnapshot,
      providerSnapshot,
      serviceCategory: quotation?.serviceCategory || "",
      serviceSubcategory: quotation?.serviceSubcategory || "",
      serviceLocation: coordination.serviceLocation || coordination.location?.address || "",
      location: {
        address: coordination.serviceLocation || coordination.location?.address || "",
        lat: coordination.serviceLatitude ?? coordination.location?.lat ?? null,
        lng: coordination.serviceLongitude ?? coordination.location?.lng ?? null,
      },

      initialSchedule: {
        date: scheduledDate,
        startTime,
        endTime,
      },

      scheduledDate,
      startTime,
      endTime,
      scheduledStartTime: startDate,
      scheduledEndTime: endDate,
      displayStartTime: startTime,
      displayEndTime: endTime,

      estimatedDurationHours:
        scheduleEvaluation.finalSchedulingDurationHours,

      finalAmount: priceEvaluation.providerQuotedPrice,
      currency: "LKR",
      mlPredictedDurationHours: scheduleEvaluation.mlPredictedDurationHours || null,
      conflictDetected: Boolean(scheduleEvaluation.conflictDetected),
      distanceFromPreviousBookingKm: scheduleEvaluation.distanceFromPreviousBookingKm || 0,
      estimatedTravelTimeMins: scheduleEvaluation.estimatedTravelTimeMins || 0,
      gapFromPreviousBookingMins: scheduleEvaluation.gapFromPreviousBookingMins ?? null,
      timeline: [{ status: "CONFIRMED", message: "Booking confirmed", at: new Date() }],

      scheduleSource: selectedSuggestedSlot
        ? "COORDINATED_SUGGESTED_SLOT"
        : "PROVIDER_PROPOSED_TIME", // Chaw: selected slot means booking time came from coordination engine

      delayRiskLevel:
        scheduleEvaluation.delayRiskLevel === "NOT_CHECKED"
          ? "UNKNOWN"
          : String(scheduleEvaluation.delayRiskLevel).toUpperCase(),

      bookingStatus: "CONFIRMED",
    });

    // Asynchronously log booking to ML Data (service_data_for_csvs) table in admin service
    try {
      const adminUrl = process.env.ADMIN_SERVICE_URL || "http://localhost:5001";
      axios.post(`${adminUrl}/api/log-booking-ml`, {
        bookingId: booking._id.toString(),
        providerId: booking.providerId?.toString(),
        seekerId: booking.seekerId?.toString(),
        scheduledDate: booking.scheduledDate,
      }).catch((e) => console.warn('ML booking log warning:', e.message));
    } catch (e) {
      // non-blocking
    }

    coordination.status = "accepted";
    await coordination.save();

    let providerQuotationUpdate = null;
    let providerQuotationUpdateWarning = null;

    try {
      providerQuotationUpdate = await updateProviderQuotationCoordination(
        coordination.externalQuotationId,
        coordination.finalDecision,
        coordination._id.toString(),
        scheduleEvaluation.requiredWindowStart,
        scheduleEvaluation.requiredWindowEnd,
        null
      );
      await acceptProviderQuotation(
        coordination.externalQuotationId,
        req.headers.authorization || ""
      );
    } catch (updateError) {
      providerQuotationUpdateWarning = updateError.message;
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully from coordinated bid",
      data: {
        booking,
        coordination,
        priceEvaluation,
        scheduleEvaluation,
        selectedSuggestedSlot,
        providerQuotationUpdate,
        providerQuotationUpdateWarning,
      },
    });
  } catch (error) {
    console.error("CREATE BOOKING FROM COORDINATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking from coordination",
      error: error.message,
    });
  }
};


export const getOngoingBookingsByProvider = async (req, res) => {
  try {
    const providerId = req.params.providerId || req.user?.id;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    if (req.user && req.user.role === "ServiceProvider" && req.user.id !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own provider bookings",
      });
    }

    const bookings = await Booking.find(buildOngoingQuery("providerId", providerId)).sort({
      scheduledStartTime: 1,
      scheduledDate: 1,
      startTime: 1,
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings.map(attachReminderFlags),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get provider ongoing bookings",
      error: error.message,
    });
  }
};

export const getOngoingBookingsBySeeker = async (req, res) => {
  try {
    const seekerId = req.params.seekerId || req.user?.id;

    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "seekerId is required",
      });
    }

    if (req.user && req.user.role === "Seeker" && req.user.id !== seekerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own seeker bookings",
      });
    }

    const bookings = await Booking.find(buildOngoingQuery("seekerId", seekerId)).sort({
      scheduledStartTime: 1,
      scheduledDate: 1,
      startTime: 1,
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings.map(attachReminderFlags),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get seeker ongoing bookings",
      error: error.message,
    });
  }
};

export const confirmBookingReady = async (req, res) => {
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

    if (getComparableId(booking.providerId) !== getComparableId(providerId)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned provider can confirm readiness for this booking",
      });
    }

    if (booking.bookingStatus !== "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be marked ready",
        currentStatus: booking.bookingStatus,
      });
    }

    booking.providerReadyConfirmed = true;
    booking.providerReadyConfirmedAt = new Date();
    booking.timeline.push({
      status: booking.bookingStatus,
      message: "Provider confirmed readiness",
      at: new Date(),
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Provider readiness confirmed.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to confirm provider readiness",
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

    const actualStartTime = new Date();
    const scheduledStartTime = getBookingStartDate(booking);

    booking.bookingStatus = "IN_PROGRESS";
    booking.actualStartTime = actualStartTime;
    booking.startDelayMinutes = scheduledStartTime
      ? Math.max(0, minutesBetween(scheduledStartTime, actualStartTime))
      : 0;
    booking.timeline.push({ status: "IN_PROGRESS", message: "Provider started the job", at: new Date() });

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

/**
 * Complete a booking – automatically awards reward points to the seeker.
 * The reward service is called internally via HTTP with a service‑to‑service key.
 */
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

    const actualEndTime = new Date();
    booking.bookingStatus = "COMPLETED";
    booking.completedAt = actualEndTime;
    booking.actualEndTime = actualEndTime;

    if (booking.actualStartTime && booking.scheduledStartTime && booking.scheduledEndTime) {
      const actualDurationMinutes = Math.max(0, minutesBetween(new Date(booking.actualStartTime), actualEndTime));
      const scheduledDurationMinutes = Math.max(0, minutesBetween(new Date(booking.scheduledStartTime), new Date(booking.scheduledEndTime)));
      booking.durationOverrunMinutes = actualDurationMinutes - scheduledDurationMinutes;
    }

    booking.timeline.push({ status: "COMPLETED", message: "Job completed successfully", at: new Date() });
    await booking.save();

    // -------- Award points automatically --------
    let reward = null;
    const finalAmount = Number(booking.finalAmount) || 0;
    if (finalAmount > 0) {
      try {
        const seekerServiceUrl = (process.env.SEEKER_SERVICE_URL || "http://127.0.0.1:6000").replace(/\/$/, "");
        const rewardResponse = await axios.post(
          `${seekerServiceUrl}/api/rewards/internal/bookings/award`,
          {
            bookingId: booking._id.toString(),
            seekerId: booking.seekerId.toString(),
            finalAmount,
            bookingStatus: booking.bookingStatus,
          },
          {
            headers: {
              "x-reward-service-key": process.env.REWARD_SERVICE_KEY,
            },
          }
        );
        reward = rewardResponse.data;
      } catch (rewardError) {
        // Log the error but do NOT roll back the completion.
        // The reward endpoint is idempotent – it can be retried later.
        console.error("Failed to award booking points:", rewardError.response?.data || rewardError.message);
        reward = {
          success: false,
          error: rewardError.response?.data?.error || rewardError.message,
        };
      }
    } else {
      reward = { success: false, message: "Skipped – finalAmount is zero or invalid" };
    }

    return res.status(200).json({
      success: true,
      message: "Booking completed successfully",
      data: booking,
      reward,
    });
  } catch (error) {
    console.error("Complete booking error:", error);
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

    const {
      delayReason = "",
      additionalDelayMins = 0,
      extraTimeMinutes = 0,
    } = req.body;
    const delayMinutes = Number(additionalDelayMins || extraTimeMinutes || 0);

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

    if (delayMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Additional delay minutes must be greater than 0",
      });
    }

    const now = new Date();
    const scheduledEnd = booking.scheduledEndTime ? new Date(booking.scheduledEndTime) : now;
    const baseEndTime = scheduledEnd.getTime() > now.getTime() ? scheduledEnd : now;
    const expectedEndTime = addMinutes(baseEndTime, delayMinutes);

    const currentStart = getBookingStartDate(booking) || now;
    const nextBooking = await Booking.findOne({
      providerId: booking.providerId,
      bookingStatus: "CONFIRMED",
      _id: { $ne: booking._id },
      scheduledStartTime: { $gt: currentStart },
    }).sort({ scheduledStartTime: 1 });

    let delayImpactStatus = "NO_CONFLICT";
    let affectedNextBooking = null;
    const bufferMinutes = 30;

    if (nextBooking?.scheduledStartTime) {
      const nextStart = new Date(nextBooking.scheduledStartTime);
      if (addMinutes(expectedEndTime, bufferMinutes).getTime() > nextStart.getTime()) {
        delayImpactStatus = "NEXT_BOOKING_AT_RISK";
        affectedNextBooking = nextBooking;
      }
    }

    booking.bookingStatus = "DELAY_REPORTED";
    booking.timeline.push({
      status: "DELAY_REPORTED",
      message: delayImpactStatus === "NEXT_BOOKING_AT_RISK"
        ? "Delay may affect the next scheduled booking"
        : (delayReason || "Delay reported with no next booking conflict"),
      at: new Date(),
    });

    booking.delayInfo = {
      delayReason,
      additionalDelayMins: delayMinutes,
      reportedBy: "PROVIDER",
      reportedAt: now,
      expectedEndTime,
      delayImpactStatus,
      affectedNextBookingId: affectedNextBooking?._id || null,
    };

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Delay reported successfully",
      data: {
        booking,
        affectedNextBooking,
      },
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

export const getProviderEarningsSummary = async (req, res) => {
  try {
    const providerId = req.params.providerId || req.user?.id;
    const { month, year } = req.query; // month format "YYYY-MM" e.g. "2026-08", or year "2026"

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
      });
    }

    if (req.user && req.user.role === "ServiceProvider" && req.user.id !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own provider earnings",
      });
    }

    const query = {
      providerId,
      bookingStatus: "COMPLETED",
    };

    const completedBookings = await Booking.find(query).sort({ updatedAt: -1, scheduledDate: -1 });

    // Filter by month (YYYY-MM) or year (YYYY) if requested
    let filteredBookings = completedBookings;
    if (month) {
      filteredBookings = completedBookings.filter((b) => {
        const dateStr = b.scheduledDate || (b.updatedAt ? b.updatedAt.toISOString().slice(0, 10) : "");
        return dateStr.startsWith(month);
      });
    } else if (year) {
      filteredBookings = completedBookings.filter((b) => {
        const dateStr = b.scheduledDate || (b.updatedAt ? b.updatedAt.toISOString().slice(0, 10) : "");
        return dateStr.startsWith(year);
      });
    }

    const totalIncome = filteredBookings.reduce((sum, b) => sum + (Number(b.finalAmount) || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        providerId,
        filter: { month: month || null, year: year || null },
        totalIncome,
        completedBookingsCount: filteredBookings.length,
        bookings: filteredBookings.map((b) => ({
          _id: b._id,
          finalAmount: b.finalAmount || 0,
          scheduledDate: b.scheduledDate,
          startTime: b.startTime,
          endTime: b.endTime,
          seekerId: b.seekerId,
          externalSessionId: b.externalSessionId,
          externalQuotationId: b.externalQuotationId,
          bookingStatus: b.bookingStatus,
          completedAt: b.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET PROVIDER EARNINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get provider earnings summary",
      error: error.message,
    });
  }
};
