import express from "express";
import {
  getBookingsByProvider,
  getBookingsBySeeker,
  getBookingByPost,
  startBooking,
  completeBooking,
  reportBookingDelay,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/provider/:providerId", getBookingsByProvider);

router.get("/seeker/:seekerId", getBookingsBySeeker);

router.get("/post/:postId", getBookingByPost);


router.put("/:bookingId/start", startBooking);

router.put("/:bookingId/complete", completeBooking);

router.put("/:bookingId/report-delay", reportBookingDelay);

export default router;