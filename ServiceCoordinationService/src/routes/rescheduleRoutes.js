import express from "express";
import {
  createRescheduleRequest,
  acceptRescheduleSlot,
  rejectRescheduleRequest,
  getReschedulesByBooking,
} from "../controllers/rescheduleController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/bookings/:bookingId/reschedule",
  protect(["ServiceProvider", "Seeker"]),
  createRescheduleRequest
);

router.put(
  "/:rescheduleId/accept",
  protect(["ServiceProvider"]),
  acceptRescheduleSlot
);

router.put(
  "/:rescheduleId/reject",
  protect(["ServiceProvider"]),
  rejectRescheduleRequest
);

router.get(
  "/booking/:bookingId",
  protect(["ServiceProvider", "Seeker", "Admin"]),
  getReschedulesByBooking
);

export default router;
