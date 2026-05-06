import {
    createBookingFromRequest,
    getAllBookings,
    getBookingById,
    getBookingsByProvider,
    getBookingsByCustomer,
    confirmBooking,
    startBooking,
    completeBooking
  } from "../services/bookingService.js";
  import { asyncHandler } from "../utils/asyncHandler.js";
  import { sendSuccess } from "../utils/responseHandler.js";
  
  export const createBooking = asyncHandler(async (req, res) => {
    const booking = await createBookingFromRequest(req.body);
  
    sendSuccess(res, booking, "Booking created successfully", 201);
  });
  
  export const listBookings = asyncHandler(async (req, res) => {
    const bookings = await getAllBookings();
  
    sendSuccess(res, bookings, "Bookings retrieved successfully");
  });
  
  export const getBooking = asyncHandler(async (req, res) => {
    const booking = await getBookingById(req.params.id);
  
    if (!booking) {
      res.status(404);
      throw new Error("Booking not found");
    }
  
    sendSuccess(res, booking, "Booking retrieved successfully");
  });
  
  export const listProviderBookings = asyncHandler(async (req, res) => {
    const bookings = await getBookingsByProvider(req.params.providerId);
  
    sendSuccess(res, bookings, "Provider bookings retrieved successfully");
  });
  
  export const listCustomerBookings = asyncHandler(async (req, res) => {
    const bookings = await getBookingsByCustomer(req.params.customerId);
  
    sendSuccess(res, bookings, "Customer bookings retrieved successfully");
  });
  
  export const confirmBookingById = asyncHandler(async (req, res) => {
    const booking = await confirmBooking(req.params.id);
  
    if (!booking) {
      res.status(404);
      throw new Error("Booking not found");
    }
  
    sendSuccess(res, booking, "Booking confirmed successfully");
  });
  
  export const startBookingById = asyncHandler(async (req, res) => {
    const booking = await startBooking(
      req.params.id,
      req.body.actualStartTime || new Date()
    );
  
    if (!booking) {
      res.status(404);
      throw new Error("Booking not found");
    }
  
    sendSuccess(res, booking, "Booking started successfully");
  });
  
  export const completeBookingById = asyncHandler(async (req, res) => {
    const booking = await completeBooking(
      req.params.id,
      req.body.actualEndTime || new Date()
    );
  
    if (!booking) {
      res.status(404);
      throw new Error("Booking not found");
    }
  
    sendSuccess(res, booking, "Booking completed successfully");
  });