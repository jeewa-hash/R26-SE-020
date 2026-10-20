import { getRescheduleAlternatives, sendRescheduleProposal } from '../controllers/rescheduleProposalController.js';
import express from "express";
import {
  createRescheduleRequest,
  checkRescheduleAvailability,
  acceptRescheduleSlot,
  rejectRescheduleRequest,
  getReschedulesByBooking,
} from "../controllers/rescheduleController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/:rescheduleId/alternatives", protect(["ServiceProvider"]), getRescheduleAlternatives);
router.put("/:rescheduleId/proposal", protect(["ServiceProvider", "Seeker"]), sendRescheduleProposal);

router.post(
  "/bookings/:bookingId/reschedule",
  protect(["ServiceProvider", "Seeker"]),
  createRescheduleRequest
);

router.post("/:rescheduleId/check", protect(["ServiceProvider", "Seeker"]), checkRescheduleAvailability);

router.put(
  "/:rescheduleId/accept",
  protect(["ServiceProvider", "Seeker"]),
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
