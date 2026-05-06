import Booking from "../models/Booking.js";
import ServiceRequest from "../models/ServiceRequest.js";
import { addHours } from "../utils/timeUtils.js";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";

export const createBookingFromRequest = async (payload) => {
  let serviceRequest = null;

  if (payload.serviceRequestId) {
    serviceRequest = await ServiceRequest.findById(payload.serviceRequestId);
  }

  const customerId = payload.customerId || serviceRequest?.customerId;
  const providerId = payload.providerId;
  const serviceCategory = payload.serviceCategory || serviceRequest?.serviceCategory;
  const serviceSubCategory = payload.serviceSubCategory || serviceRequest?.serviceSubCategory;
  const taskComplexity = payload.taskComplexity || serviceRequest?.taskComplexity || "Medium";

  const estimatedDurationHours =
    payload.estimatedDurationHours || serviceRequest?.estimatedDurationHours || 4;

  const predictedActualDurationHours =
    payload.predictedActualDurationHours ||
    serviceRequest?.predictedActualDurationHours ||
    estimatedDurationHours;

  const predictedDelayRiskLevel =
    payload.predictedDelayRiskLevel ||
    serviceRequest?.predictedDelayRiskLevel ||
    "Medium";

  const scheduledStartTime = new Date(payload.scheduledStartTime);
  const scheduledEndTime =
    payload.scheduledEndTime ||
    addHours(scheduledStartTime, predictedActualDurationHours);

  const booking = await Booking.create({
    serviceRequestId: payload.serviceRequestId || undefined,
    customerId,
    providerId,
    serviceCategory,
    serviceSubCategory,
    taskComplexity,
    scheduledStartTime,
    scheduledEndTime,
    estimatedDurationHours,
    predictedActualDurationHours,
    predictedDelayRiskLevel,
    delayRiskProbability: payload.delayRiskProbability || serviceRequest?.delayRiskProbability,
    agreedPrice: payload.agreedPrice,
    address: payload.address || serviceRequest?.address,
    district: payload.district || serviceRequest?.district,
    notes: payload.notes,
    bookingStatus: BOOKING_STATUS.PENDING
  });

  return booking;
};

export const getAllBookings = async () => {
  return Booking.find().sort({ scheduledStartTime: 1 });
};

export const getBookingById = async (id) => {
  return Booking.findById(id);
};

export const getBookingsByProvider = async (providerId) => {
  return Booking.find({ providerId }).sort({ scheduledStartTime: 1 });
};

export const getBookingsByCustomer = async (customerId) => {
  return Booking.find({ customerId }).sort({ scheduledStartTime: 1 });
};

export const confirmBooking = async (id) => {
  return Booking.findByIdAndUpdate(
    id,
    { bookingStatus: BOOKING_STATUS.CONFIRMED },
    { new: true }
  );
};

export const startBooking = async (id, actualStartTime = new Date()) => {
  return Booking.findByIdAndUpdate(
    id,
    {
      actualStartTime,
      bookingStatus: BOOKING_STATUS.STARTED
    },
    { new: true }
  );
};

export const completeBooking = async (id, actualEndTime = new Date()) => {
  return Booking.findByIdAndUpdate(
    id,
    {
      actualEndTime,
      bookingStatus: BOOKING_STATUS.COMPLETED
    },
    { new: true }
  );
};