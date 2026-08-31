import express from "express";
import {
  getBookingById,
  getBookingsByProvider,
  getBookingsBySeeker,
  getBookingByPost,
  createBookingFromCoordination,
  startBooking,
  completeBooking,
  reportBookingDelay,
  cancelBooking,
  getProviderMissedInquiries,
  getProviderEarningsSummary,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/provider/me/earnings", protect(["ServiceProvider"]), getProviderEarningsSummary);
router.get("/provider/me/missed-inquiries", protect(["ServiceProvider"]), getProviderMissedInquiries);
router.get("/provider/me", protect(["ServiceProvider"]), getBookingsByProvider);
router.get("/provider/:providerId/earnings", getProviderEarningsSummary);
router.get("/provider/:providerId", getBookingsByProvider);
router.get("/seeker/me", protect(["Seeker"]), getBookingsBySeeker);
router.get("/seeker/:seekerId", getBookingsBySeeker);

router.get("/post/:postId", getBookingByPost);
router.post("/coordination/:coordinationId",protect(["Seeker"]),createBookingFromCoordination); // Chaw: seeker creates booking from accepted bid coordination
router.put("/:bookingId/start", protect(["ServiceProvider"]), startBooking);
router.put("/:bookingId/report-delay", protect(["ServiceProvider"]), reportBookingDelay);
router.put("/:bookingId/cancel", protect(["ServiceProvider", "Seeker", "Admin"]), cancelBooking);
router.put("/:bookingId/complete", protect(["ServiceProvider", "Seeker"]), completeBooking);
router.get("/:bookingId", protect(["ServiceProvider", "Seeker", "Admin"]), getBookingById);

export default router;
