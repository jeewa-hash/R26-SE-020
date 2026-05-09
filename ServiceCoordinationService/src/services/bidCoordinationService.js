import Booking from "../models/Booking.js";
import BidCoordination from "../models/BidCoordination.js";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import { predictDelayRiskFromML, predictDurationFromML } from "./mlPredictionService.js";
import { addHours, addMinutes, hasTimeOverlap } from "../utils/timeUtils.js";

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.STARTED,
  BOOKING_STATUS.DELAYED,
  BOOKING_STATUS.RESCHEDULING_REQUIRED,
  BOOKING_STATUS.RESCHEDULED,
];

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const computeDecision = ({ conflictDetected, predictedDelayRiskLevel }) => {
  if (conflictDetected) return "RESCHEDULE_REQUIRED";
  if (predictedDelayRiskLevel === "High") return "AVAILABLE_WITH_CAUTION";
  return "CAN_ACCEPT";
};

const buildActionMessage = (decision) => {
  if (decision === "RESCHEDULE_REQUIRED") {
    return "Provider cannot accept this requested time. Please propose another available slot.";
  }
  if (decision === "AVAILABLE_WITH_CAUTION") {
    return "Provider is available, but delay risk is high. Proceed with caution.";
  }
  if (decision === "REJECTED_DUE_TO_CONFLICT") {
    return "Provider offer was rejected due to scheduling conflict.";
  }
  return "Provider is available for the predicted service window.";
};

const toSlotLabel = (startTime, endTime) =>
  `${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`;

const buildSuggestedSlots = async ({
  providerId,
  requestedStartTime,
  requiredDurationHours,
  bufferMinutes,
}) => {
  const existingBookings = await Booking.find({
    providerId,
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  }).sort({ scheduledStartTime: 1 });

  const suggestions = [];
  let cursor = addMinutes(requestedStartTime, 60);
  const maxIterations = 72; // up to roughly 3 days hourly search

  for (let i = 0; i < maxIterations; i += 1) {
    const slotStart = new Date(cursor);
    const slotEnd = addMinutes(
      addHours(slotStart, requiredDurationHours),
      bufferMinutes
    );

    const overlaps = existingBookings.some((b) =>
      hasTimeOverlap(slotStart, slotEnd, b.scheduledStartTime, b.scheduledEndTime)
    );

    if (!overlaps) {
      suggestions.push({
        startTime: slotStart,
        endTime: slotEnd,
        label: toSlotLabel(slotStart, slotEnd),
      });
    }

    if (suggestions.length >= 3) break;
    cursor = addMinutes(cursor, 60);
  }

  return suggestions;
};

export const runBidCoordinationCheck = async (payload) => {
  const estimatedDurationHours = normalizeNumber(payload.estimatedDurationHours, 4);
  const bufferMinutes = normalizeNumber(payload.bufferMinutes, 30);
  const proposedStartTime = new Date(payload.proposedStartTime);

  if (Number.isNaN(proposedStartTime.getTime())) {
    const error = new Error("Invalid proposedStartTime");
    error.statusCode = 400;
    throw error;
  }

  const durationPayload = {
    service_category: payload.serviceCategory,
    service_subcategory: payload.serviceSubCategory,
    task_complexity: payload.taskComplexity || "Medium",
    weather_affected: payload.weatherAffected || "No",
    provider_schedule_density: payload.providerScheduleDensity || "Medium",
    distance_km: normalizeNumber(payload.distanceKm, 5),
    estimated_travel_time_mins: normalizeNumber(payload.estimatedTravelTimeMins, 20),
    estimated_duration_hours: estimatedDurationHours,
  };

  const delayPayload = {
    ...durationPayload,
    gap_before_next_booking_mins: normalizeNumber(payload.gapBeforeNextBookingMins, 30),
    start_delay_mins: normalizeNumber(payload.startDelayMins, 0),
  };

  const [durationPrediction, delayPrediction] = await Promise.all([
    predictDurationFromML(durationPayload),
    predictDelayRiskFromML(delayPayload),
  ]);

  const predictedActualDurationHours = normalizeNumber(
    durationPrediction?.predicted_actual_duration_hours,
    estimatedDurationHours
  );

  const predictedDelayRiskLevel =
    delayPrediction?.predicted_delay_risk_level || "Medium";

  const requiredWindowStart = proposedStartTime;
  const requiredWindowEnd = addMinutes(
    addHours(requiredWindowStart, predictedActualDurationHours),
    bufferMinutes
  );

  const existingBookings = await Booking.find({
    providerId: payload.providerId,
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  }).sort({ scheduledStartTime: 1 });

  const conflictDetected = existingBookings.some((booking) =>
    hasTimeOverlap(
      requiredWindowStart,
      requiredWindowEnd,
      booking.scheduledStartTime,
      booking.scheduledEndTime
    )
  );

  const decision = computeDecision({ conflictDetected, predictedDelayRiskLevel });
  const suggestedSlots =
    decision === "RESCHEDULE_REQUIRED"
      ? await buildSuggestedSlots({
          providerId: payload.providerId,
          requestedStartTime: requiredWindowStart,
          requiredDurationHours: predictedActualDurationHours,
          bufferMinutes,
        })
      : [];

  const doc = await BidCoordination.create({
    serviceRequestId: payload.serviceRequestId,
    externalPostId: payload.externalPostId,
    seekerId: payload.seekerId,
    providerId: payload.providerId,
    serviceCategory: payload.serviceCategory,
    serviceSubCategory: payload.serviceSubCategory,
    description: payload.description,
    offeredPrice: normalizeNumber(payload.offeredPrice, 0),
    proposedStartTime,
    estimatedDurationHours,
    bufferMinutes,
    predictedActualDurationHours,
    predictedDelayRiskLevel,
    delayRiskProbability: delayPrediction?.probability || {},
    requiredWindowStart,
    requiredWindowEnd,
    conflictDetected,
    decision,
    recommendedAction: buildActionMessage(decision),
    suggestedSlots,
  });

  return doc;
};

export const acceptBidCoordinationById = async (id) => {
  const bid = await BidCoordination.findById(id);
  if (!bid) return null;

  if (
    bid.decision === "RESCHEDULE_REQUIRED" ||
    bid.decision === "REJECTED_DUE_TO_CONFLICT"
  ) {
    const error = new Error("Cannot accept a bid that requires rescheduling.");
    error.statusCode = 400;
    throw error;
  }

  bid.status = "ACCEPTED";
  bid.acceptedAt = new Date();
  await bid.save();
  return bid;
};

export const getBidCoordinationById = async (id) => {
  return BidCoordination.findById(id);
};

export const rejectBidCoordinationById = async (id) => {
  const bid = await BidCoordination.findById(id);
  if (!bid) return null;

  bid.status = "REJECTED";
  bid.rejectedAt = new Date();
  if (bid.conflictDetected) {
    bid.decision = "REJECTED_DUE_TO_CONFLICT";
    bid.recommendedAction = buildActionMessage("REJECTED_DUE_TO_CONFLICT");
  }
  await bid.save();
  return bid;
};

export const createBookingFromAcceptedBid = async (bidCoordinationId) => {
  const bid = await BidCoordination.findById(bidCoordinationId);
  if (!bid) {
    const error = new Error("Bid coordination record not found");
    error.statusCode = 404;
    throw error;
  }

  if (bid.status !== "ACCEPTED") {
    const error = new Error("Bid must be accepted before creating booking");
    error.statusCode = 400;
    throw error;
  }

  if (bid.bookingId) {
    return Booking.findById(bid.bookingId);
  }

  const booking = await Booking.create({
    serviceRequestId: bid.serviceRequestId || undefined,
    customerId: bid.seekerId,
    providerId: bid.providerId,
    serviceCategory: bid.serviceCategory,
    serviceSubCategory: bid.serviceSubCategory,
    taskComplexity: "Medium",
    scheduledStartTime: bid.requiredWindowStart,
    scheduledEndTime: bid.requiredWindowEnd,
    estimatedDurationHours: bid.estimatedDurationHours,
    predictedActualDurationHours: bid.predictedActualDurationHours,
    predictedDelayRiskLevel: bid.predictedDelayRiskLevel,
    delayRiskProbability: bid.delayRiskProbability,
    agreedPrice: bid.offeredPrice,
    notes: bid.description,
    bookingStatus: BOOKING_STATUS.CONFIRMED,
  });

  bid.bookingId = booking._id;
  bid.status = "BOOKING_CREATED";
  await bid.save();

  return booking;
};
