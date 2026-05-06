import express from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  listProviderBookings,
  listCustomerBookings,
  confirmBookingById,
  startBookingById,
  completeBookingById
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", listBookings);

router.get("/provider/:providerId", listProviderBookings);
router.get("/customer/:customerId", listCustomerBookings);

router.get("/:id", getBooking);
router.put("/:id/confirm", confirmBookingById);
router.put("/:id/start", startBookingById);
router.put("/:id/complete", completeBookingById);

export default router;