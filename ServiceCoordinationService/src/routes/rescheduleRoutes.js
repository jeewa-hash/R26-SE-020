import express from "express";
import {
  createRescheduleRequest,
  acceptRescheduleSlot,
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
  protect(["ServiceProvider", "Seeker"]),
  acceptRescheduleSlot
);

router.get(
  "/booking/:bookingId",
  protect(["ServiceProvider", "Seeker", "Admin"]),
  getReschedulesByBooking
);

export default router;