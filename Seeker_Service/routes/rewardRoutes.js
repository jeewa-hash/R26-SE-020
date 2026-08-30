// routes/rewardRoutes.js
import express from "express";
import {
  getBalance,
  getTransactionHistory,
  redeemPoints,
  adminListTransactions,
  updateRedemptionStatus,
  adminAdjustPoints,
  awardBookingPoints,
} from "../controllers/rewardController.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js"; // adjust import path

const router = express.Router();

// Used only by ServiceCoordinationService. Must be declared before user routes.
router.post("/internal/bookings/award", awardBookingPoints);

// ---------- Seeker Routes (authenticated) ----------
router.get("/balance", authMiddleware, getBalance);
router.get("/history", authMiddleware, getTransactionHistory);
router.post("/redeem", authMiddleware, redeemPoints);

// ---------- Admin Routes (authenticated + admin role) ----------
router.get("/admin/transactions", authMiddleware, adminMiddleware, adminListTransactions);
router.put("/admin/redemptions/:id", authMiddleware, adminMiddleware, updateRedemptionStatus);
router.post("/admin/adjust", authMiddleware, adminMiddleware, adminAdjustPoints);

export default router;
