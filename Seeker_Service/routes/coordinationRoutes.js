import express from "express";
import {
  getSeekerBookingHistory,
  reconcileSeekerBookingRewards,
} from "../controllers/coordinationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/bookings/me", authMiddleware, getSeekerBookingHistory);
router.post("/bookings/me/rewards/reconcile", authMiddleware, reconcileSeekerBookingRewards);

export default router;
