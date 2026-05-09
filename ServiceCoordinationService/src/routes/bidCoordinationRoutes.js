import express from "express";
import {
  acceptBidCoordination,
  checkBidCoordination,
  createBookingFromBidCoordination,
  rejectBidCoordination,
} from "../controllers/bidCoordinationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/bid-coordination/check",
  requireAuth,
  requireRole(["Seeker"]),
  checkBidCoordination
);
router.put(
  "/bid-coordination/:id/accept",
  requireAuth,
  requireRole(["Seeker"]),
  acceptBidCoordination
);
router.put(
  "/bid-coordination/:id/reject",
  requireAuth,
  requireRole(["Seeker"]),
  rejectBidCoordination
);
router.post(
  "/bookings/from-bid/:bidCoordinationId",
  requireAuth,
  requireRole(["Seeker"]),
  createBookingFromBidCoordination
);

export default router;
